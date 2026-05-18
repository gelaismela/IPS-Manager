import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getDeliveriesByDriver,
  updateDeliveryStatus,
  getAllMaterialRequests,
  uploadDeliveryPhoto,
} from "../api/api";
import { useDeliveryNotifications } from "../hooks/useDeliveryNotifications";
import "../styles/driverDelivery.css";
import { useToast } from "../contexts/ToastContext";

const ALLOWED_STATUSES = ["PENDING", "PARTIALLY_ASSIGNED", "ASSIGNED", "SENT"];

const statusLabels = {
  PENDING: "Pending",
  PARTIALLY_ASSIGNED: "Partially Assigned",
  ASSIGNED: "Assigned",
  SENT: "Sent",
};

const DriverDelivery = () => {
  // Get driver ID from localStorage instead of URL params
  const userStr =
    localStorage.getItem("user") || sessionStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const driverId =
    user?.id ||
    localStorage.getItem("userId") ||
    sessionStorage.getItem("userId");
  const [deliveries, setDeliveries] = useState([]);
  const [materialRequests, setMaterialRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeDelivery, setActiveDelivery] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoMode, setPhotoMode] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const showToast = useToast();

  const resetPhotoState = () => {
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    setPhotoMode(false);
    setPhotoError("");
  };

  // Enable browser notifications for drivers
  useDeliveryNotifications(deliveries, materialRequests, true);

  useEffect(() => {
    if (!driverId) {
      showToast("Driver ID not found. Please log in again.", "error");
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch driver's deliveries
        const driverDeliveries = await getDeliveriesByDriver(driverId);
        setDeliveries(driverDeliveries);

        // Fetch material requests to get notification for new assignments
        const requests = await getAllMaterialRequests();
        setMaterialRequests(requests || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Poll for updates every 60 seconds (reduced since push notifications are active)
    const interval = setInterval(fetchData, 60000);

    return () => clearInterval(interval);
  }, [driverId]);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Filter out SENT deliveries (hide old completed deliveries)
  const activeDeliveries = deliveries.filter((d) => d.status !== "SENT");

  // Group deliveries by project ID
  const groupedDeliveries = activeDeliveries.reduce((acc, delivery) => {
    const projectId = delivery.materialRequest.project.id;
    if (!acc[projectId]) acc[projectId] = [];
    acc[projectId].push(delivery);
    return acc;
  }, {});

  const handleStatusUpdate = async (deliveryId, newStatus) => {
    if (!ALLOWED_STATUSES.includes(newStatus)) {
      showToast(`Invalid status: ${newStatus}`, "error");
      return;
    }
    try {
      await updateDeliveryStatus(deliveryId, newStatus);
      setDeliveries((prev) =>
        prev.map((delivery) =>
          delivery.id === deliveryId
            ? { ...delivery, status: newStatus }
            : delivery
        )
      );
      setActiveDelivery((prev) =>
        prev ? { ...prev, status: newStatus } : prev
      );
      showToast(`Status updated to ${statusLabels[newStatus]}.`, "success");
    } catch (error) {
      console.error("Error updating status:", error);
      showToast("Failed to update status.", "error");
    }
  };

  if (loading) return <div className="loading">Loading your deliveries...</div>;

  return (
    <div className="driver-delivery-container">
      <h2>Your Delivery Assignments</h2>
      {Object.keys(groupedDeliveries).length === 0 ? (
        <p>You have no delivery assignments currently.</p>
      ) : (
        Object.entries(groupedDeliveries).map(([projectId, group]) => (
          <div key={projectId} className="project-group">
            <h3>
              <span className="project-icon">📦</span>
              {group[0].materialRequest.project.name}
              <span className="project-code">
                ({group[0].materialRequest.project.projectCode})
              </span>
            </h3>
            <div className="vertical-list">
              {group.map((delivery) => (
                <div
                  key={delivery.id}
                  className={`delivery-card-vertical${
                    activeDelivery && activeDelivery.id === delivery.id
                      ? " active"
                      : ""
                  }`}
                  style={{ position: "relative" }}
                  onClick={() => { resetPhotoState(); setActiveDelivery(delivery); }}
                >
                  <div className="delivery-summary">
                    <strong>Delivery #{delivery.id}</strong>
                    <span className={`status-badge ${delivery.status}`}>
                      {statusLabels[delivery.status] || delivery.status}
                    </span>
                  </div>
                  <div className="delivery-mini">
                    <span>
                      <strong>Material:</strong>{" "}
                      {delivery.materialRequest.material.name}
                    </span>
                    <span>
                      <strong>Qty:</strong> {delivery.assignedQuantity}
                    </span>
                    <span>
                      <strong>Date:</strong> {formatDate(delivery.deliveryDate)}
                    </span>
                  </div>
                  {/* Dynamic island inside the card if active */}
                  {activeDelivery && activeDelivery.id === delivery.id && (
                    <div className="dynamic-island">
                      <button
                        className="close-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          resetPhotoState();
                          setActiveDelivery(null);
                        }}
                      >
                        ×
                      </button>
                      <h3>Delivery #{activeDelivery.id}</h3>
                      <p>
                        <strong>Project:</strong>{" "}
                        {activeDelivery.materialRequest.project.name}
                      </p>
                      <p>
                        <strong>Address:</strong>{" "}
                        {activeDelivery.materialRequest.project.address}
                      </p>
                      <p>
                        <strong>Material:</strong>{" "}
                        {activeDelivery.materialRequest.material.name}
                      </p>
                      <p>
                        <strong>Delivery Date:</strong>{" "}
                        {formatDate(activeDelivery.deliveryDate)}
                      </p>
                      <div className="island-actions">
                        {activeDelivery.status === "PENDING" && (
                          <button
                            className="action-btn assign"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusUpdate(activeDelivery.id, "ASSIGNED");
                            }}
                          >
                            Mark as Assigned
                          </button>
                        )}
                        {activeDelivery.status === "ASSIGNED" && !photoMode && (
                          <button
                            className="action-btn sent"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPhotoMode(true);
                              setPhotoError("");
                            }}
                          >
                            Mark as Sent
                          </button>
                        )}
                        {activeDelivery.status === "ASSIGNED" && photoMode && (
                          <div className="photo-upload-section" onClick={(e) => e.stopPropagation()}>
                            <p className="photo-upload-title">📷 Upload delivery documentation photo</p>
                            <label className="photo-upload-label" onClick={(e) => e.stopPropagation()}>
                              {photoPreview ? "Change Photo" : "Choose Photo"}
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                style={{ display: "none" }}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (!file) return;
                                  if (photoPreview) URL.revokeObjectURL(photoPreview);
                                  setPhotoFile(file);
                                  setPhotoPreview(URL.createObjectURL(file));
                                  setPhotoError("");
                                }}
                              />
                            </label>
                            {photoPreview && (
                              <img src={photoPreview} alt="Delivery documentation" className="photo-preview" />
                            )}
                            {photoError && <p className="photo-error">{photoError}</p>}
                            <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
                              <button
                                className="action-btn sent"
                                disabled={!photoFile || uploadingPhoto}
                                style={{ opacity: (!photoFile || uploadingPhoto) ? 0.6 : 1, cursor: (!photoFile || uploadingPhoto) ? "not-allowed" : "pointer" }}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (!photoFile) { setPhotoError("Please select a photo first."); return; }
                                  setUploadingPhoto(true);
                                  setPhotoError("");
                                  try {
                                    await uploadDeliveryPhoto(activeDelivery.id, photoFile);
                                    await handleStatusUpdate(activeDelivery.id, "SENT");
                                    resetPhotoState();
                                  } catch (err) {
                                    setPhotoError(err.message || "Upload failed. Please try again.");
                                  } finally {
                                    setUploadingPhoto(false);
                                  }
                                }}
                              >
                                {uploadingPhoto ? "Uploading…" : "Confirm Delivery"}
                              </button>
                              <button
                                className="action-btn"
                                style={{ background: "#6c757d" }}
                                onClick={(e) => { e.stopPropagation(); resetPhotoState(); }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default DriverDelivery;
