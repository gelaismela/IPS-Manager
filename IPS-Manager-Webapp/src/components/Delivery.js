import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getAllRequestsForProject,
  getDrivers,
  assignMaterialRequest,
  createDelivery,
} from "../api/api";
import "../styles/delivery.css";

const Delivery = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    driverId: "",
    deliveryDate: "",
  });
  const [materialSelections, setMaterialSelections] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getAllRequestsForProject(id);
        setRequests(data);

        // Group materials by material ID and combine quantities
        const materialMap = new Map();

        data.forEach((req) => {
          const materialId = req.material.id;
          const requestedQty = req.requestedQuantity;
          const assignedQty = req.assignedQuantity || 0;
          const remainingQty = requestedQty - assignedQty;

          if (materialMap.has(materialId)) {
            // Material already exists, combine quantities
            const existing = materialMap.get(materialId);
            existing.requestedQuantity += requestedQty;
            existing.assignedQuantity += assignedQty;
            existing.remainingQuantity += remainingQty;
            existing.requests.push(req); // Keep track of all requests for this material
          } else {
            // New material, add to map
            materialMap.set(materialId, {
              ...req.material,
              requestedQuantity: requestedQty,
              assignedQuantity: assignedQty,
              remainingQuantity: remainingQty,
              status: req.status,
              id: materialId,
              requests: [req], // Array of all requests for this material
              selectedQuantity: 0,
              selected: false,
            });
          }
        });

        // Convert map to array
        const combinedMaterials = Array.from(materialMap.values());
        setMaterialSelections(combinedMaterials);

        const driversData = await getDrivers();
        setDrivers(driversData);
      } catch (err) {
        console.error("Error fetching data:", err);
        setDrivers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDriverSelect = (driverId) => {
    setFormData((prev) => ({
      ...prev,
      driverId: Number(driverId),
    }));
  };

  const handleMaterialSelection = (index, quantity) => {
    const updatedSelections = [...materialSelections];
    const material = updatedSelections[index];
    const maxQuantity = material.remainingQuantity || 0;

    // Quantity changed - limit to remaining quantity, auto-select if > 0
    const newQuantity = Math.max(0, parseInt(quantity) || 0);
    updatedSelections[index].selectedQuantity = Math.min(
      newQuantity,
      maxQuantity
    );
    updatedSelections[index].selected =
      updatedSelections[index].selectedQuantity > 0;

    setMaterialSelections(updatedSelections);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const selectedMaterials = materialSelections.filter(
      (mat) => mat.selected && mat.selectedQuantity > 0
    );

    if (selectedMaterials.length === 0) {
      alert("Please select at least one material to deliver");
      return;
    }

    const selectedDriver = drivers.find((d) => d.id === formData.driverId);
    if (!selectedDriver) {
      alert("Please select a driver");
      return;
    }

    // Validate quantities before submitting
    const invalidMaterials = selectedMaterials.filter(
      (mat) => mat.selectedQuantity > mat.remainingQuantity
    );

    if (invalidMaterials.length > 0) {
      alert(
        `Error: The following materials exceed remaining quantity:\n${invalidMaterials
          .map(
            (mat) =>
              `- ${mat.name}: Selected ${mat.selectedQuantity}, Available ${mat.remainingQuantity}`
          )
          .join("\n")}`
      );
      return;
    }

    try {
      for (const mat of selectedMaterials) {
        const deliveryDateToSend = formData.deliveryDate
          ? formData.deliveryDate
          : undefined;

        // Distribute the selected quantity across individual requests
        let remainingToAssign = mat.selectedQuantity;

        for (const request of mat.requests) {
          if (remainingToAssign <= 0) break;

          const requestRemaining =
            request.requestedQuantity - (request.assignedQuantity || 0);
          if (requestRemaining <= 0) continue; // Skip fully assigned requests

          const assignQty = Math.min(remainingToAssign, requestRemaining);

          console.log("Assigning material request:", {
            requestId: request.id,
            materialName: mat.name,
            driverId: selectedDriver.id,
            assignedQuantity: assignQty,
            requestRemaining: requestRemaining,
            deliveryDate: deliveryDateToSend,
          });

          await assignMaterialRequest(
            request.id,
            selectedDriver.id,
            assignQty,
            deliveryDateToSend
          );

          remainingToAssign -= assignQty;
        }

        if (remainingToAssign > 0) {
          console.warn(
            `Could not assign all quantity for ${mat.name}. Remaining: ${remainingToAssign}`
          );
        }
      }

      alert(`Delivery assigned successfully to ${selectedDriver.name}!`);
      navigate("/deliveries");
    } catch (err) {
      console.error("Assignment error:", err);
      const errorMessage = err.message || "Failed to assign delivery";
      alert(`Error: ${errorMessage}`);
    }
  };

  if (loading)
    return <div className="delivery-loading">Loading delivery...</div>;
  if (!requests.length)
    return <div>No delivery requests found for this project.</div>;

  const projectInfo = requests[0]?.project;

  return (
    <div className="delivery-container">
      <h2>Assign Delivery for Project: {projectInfo?.name}</h2>
      <div className="delivery-info">
        <h3>Material Requests</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
            marginBottom: "24px",
            padding: "16px",
            background: "#f8f9fa",
            borderRadius: "8px",
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
              Project Code
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#333" }}>
              {projectInfo?.projectCode}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
              Address
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#333" }}>
              {projectInfo?.address}
            </div>
          </div>
        </div>
        <table className="material-table">
          <thead>
            <tr>
              <th style={{ width: "100px" }}>Requests</th>
              <th style={{ textAlign: "left" }}>Material Name</th>
              <th style={{ width: "100px" }}>Requested</th>
              <th style={{ width: "100px" }}>Assigned</th>
              <th style={{ width: "100px" }}>Remaining</th>
              <th style={{ width: "120px" }}>Status</th>
              <th style={{ width: "150px" }}>Assign Quantity</th>
            </tr>
          </thead>
          <tbody>
            {materialSelections.map((mat, index) => {
              const canAssign = mat.remainingQuantity > 0;
              const requestCount = mat.requests.length;
              const requestIds = mat.requests.map((r) => r.id).join(", ");

              return (
                <tr
                  key={index}
                  style={{
                    background: mat.selectedQuantity > 0 ? "#f0f8ff" : "#fff",
                    opacity: canAssign ? 1 : 0.6,
                    transition: "all 0.2s ease",
                  }}
                >
                  <td
                    style={{ fontWeight: 500, color: "#666" }}
                    title={`Request IDs: ${requestIds}`}
                  >
                    {requestCount > 1 ? (
                      <span
                        style={{
                          background: "#007bff",
                          color: "#fff",
                          padding: "4px 8px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: 600,
                        }}
                      >
                        {requestCount} reqs
                      </span>
                    ) : (
                      `#${mat.requests[0].id}`
                    )}
                  </td>
                  <td style={{ textAlign: "left", fontWeight: 500 }}>
                    {mat.name}
                  </td>
                  <td style={{ fontSize: 15 }}>{mat.requestedQuantity}</td>
                  <td style={{ fontSize: 15, color: "#666" }}>
                    {mat.assignedQuantity}
                  </td>
                  <td>
                    <strong
                      style={{
                        color: canAssign ? "#28a745" : "#dc3545",
                        fontSize: 16,
                      }}
                    >
                      {mat.remainingQuantity}
                    </strong>
                  </td>
                  <td>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "6px 12px",
                        borderRadius: 16,
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        background:
                          mat.status === "DELIVERED"
                            ? "#28a745"
                            : mat.status === "ASSIGNED"
                            ? "#007bff"
                            : "#ffc107",
                        color: "#fff",
                      }}
                    >
                      {mat.status}
                    </span>
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max={mat.remainingQuantity}
                      value={mat.selectedQuantity || ""}
                      onChange={(e) =>
                        handleMaterialSelection(index, e.target.value)
                      }
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        fontSize: 14,
                        border:
                          mat.selectedQuantity > 0
                            ? "2px solid #007bff"
                            : "1px solid #ddd",
                        borderRadius: 6,
                        outline: "none",
                        transition: "all 0.2s ease",
                        background: canAssign ? "#fff" : "#f5f5f5",
                      }}
                      disabled={!canAssign}
                      placeholder={canAssign ? "0" : "—"}
                      onFocus={(e) => e.target.select()}
                    />
                    {mat.selectedQuantity > mat.remainingQuantity && (
                      <div
                        style={{
                          color: "#dc3545",
                          fontSize: 11,
                          marginTop: 4,
                          fontWeight: 500,
                        }}
                      >
                        ⚠️ Max: {mat.remainingQuantity}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <form onSubmit={handleSubmit} className="assignment-form">
        <h3>Assignment Details</h3>
        <div className="form-group">
          <label>Select Driver:</label>
          <select
            name="driverId"
            value={formData.driverId}
            onChange={(e) => handleDriverSelect(e.target.value)}
            required
          >
            <option value="">-- Select a driver --</option>
            {drivers.length === 0 ? (
              <option disabled>No drivers available</option>
            ) : (
              drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.name}
                </option>
              ))
            )}
          </select>
        </div>
        <div className="form-group">
          <label>Delivery Date:</label>
          <input
            type="date"
            name="deliveryDate"
            value={formData.deliveryDate}
            onChange={handleInputChange}
          />
        </div>
        <button type="submit" className="submit-btn">
          Assign Delivery
        </button>
      </form>
    </div>
  );
};

export default Delivery;
