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
        <div className="project-info-grid">
          <div>
            <div className="info-label">Project Code</div>
            <div className="info-value">{projectInfo?.projectCode}</div>
          </div>
          <div>
            <div className="info-label">Address</div>
            <div className="info-value-address">{projectInfo?.address}</div>
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
                  className={`${
                    mat.selectedQuantity > 0 ? "material-row-selected" : ""
                  } ${!canAssign ? "material-row-disabled" : ""}`}
                >
                  <td className="request-id-cell" title={`Request IDs: ${requestIds}`}>
                    {requestCount > 1 ? (
                      <span className="request-count-badge">
                        {requestCount} reqs
                      </span>
                    ) : (
                      `#${mat.requests[0].id}`
                    )}
                  </td>
                  <td className="material-name-cell">
                    {mat.name}
                  </td>
                  <td>{mat.requestedQuantity}</td>
                  <td className="request-id-cell">
                    {mat.assignedQuantity}
                  </td>
                  <td>
                    <span
                      className={`remaining-qty ${
                        canAssign ? "available" : "unavailable"
                      }`}
                    >
                      {mat.remainingQuantity}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`status-badge ${
                        mat.status === "DELIVERED"
                          ? "delivered"
                          : mat.status === "ASSIGNED"
                          ? "assigned"
                          : "pending"
                      }`}
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
                      className={`quantity-input-field ${
                        mat.selectedQuantity > 0 ? "selected" : ""
                      }`}
                      disabled={!canAssign}
                      placeholder={canAssign ? "0" : "—"}
                      onFocus={(e) => e.target.select()}
                    />
                    {mat.selectedQuantity > mat.remainingQuantity && (
                      <div className="quantity-error">
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
