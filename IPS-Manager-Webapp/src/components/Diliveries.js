import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getDeliveriesByDriver,
  updateDeliveryStatus,
  getAllMaterialRequests,
} from "../api/api";
import { useDeliveryNotifications } from "../hooks/useDeliveryNotifications";
import "../styles/driverDelivery.css";

const ALLOWED_STATUSES = ["PENDING", "PARTIALLY_ASSIGNED", "ASSIGNED", "SENT"];

const statusLabels = {
  PENDING: "Pending",
  PARTIALLY_ASSIGNED: "Partially Assigned",
  ASSIGNED: "Assigned",
  SENT: "Sent",
};

const DriverDelivery = () => {
  const { id: driverId } = useParams();
  const [deliveries, setDeliveries] = useState([]);
  const [materialRequests, setMaterialRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeDelivery, setActiveDelivery] = useState(null);

  // Enable browser notifications for drivers
  useDeliveryNotifications(deliveries, materialRequests, true);

  useEffect(() => {
    if (!driverId) {
      alert("Driver ID not found in URL!");
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

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchData, 30000);

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
      alert(`Invalid status: ${newStatus}`);
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
      alert(`Status updated to ${statusLabels[newStatus]}`);
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status");
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
                  onClick={() => setActiveDelivery(delivery)}
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
                        {activeDelivery.status === "ASSIGNED" && (
                          <button
                            className="action-btn sent"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusUpdate(activeDelivery.id, "SENT");
                            }}
                          >
                            Mark as Sent
                          </button>
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
