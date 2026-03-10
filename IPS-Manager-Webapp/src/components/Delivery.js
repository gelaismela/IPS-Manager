import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getAllRequestsForProject,
  getDrivers,
  assignMaterialRequest,
  getAllMaterials,
  createFailedRequest,
} from "../api/api";
import "../styles/delivery.css";
import { useToast } from "../contexts/ToastContext";

const Delivery = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();
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
      maxQuantity,
    );
    updatedSelections[index].selected =
      updatedSelections[index].selectedQuantity > 0;

    setMaterialSelections(updatedSelections);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const selectedMaterials = materialSelections.filter(
      (mat) => mat.selected && mat.selectedQuantity > 0,
    );

    if (selectedMaterials.length === 0) {
      showToast("Please select at least one material to deliver.", "warning");
      return;
    }

    const selectedDriver = drivers.find((d) => d.id === formData.driverId);
    if (!selectedDriver) {
      showToast("Please select a driver.", "warning");
      return;
    }

    // Validate quantities before submitting
    const invalidMaterials = selectedMaterials.filter(
      (mat) => mat.selectedQuantity > mat.remainingQuantity,
    );

    if (invalidMaterials.length > 0) {
      showToast(
        `The following materials exceed remaining quantity:\n${invalidMaterials.map((mat) => `• ${mat.name}: selected ${mat.selectedQuantity}, available ${mat.remainingQuantity}`).join("\n")}`,
        "warning",
      );
      return;
    }

    try {
      // Fetch current catalog stock for all selected materials at once
      const catalog = await getAllMaterials();
      const stockMap = new Map((catalog || []).map((m) => [m.id, m.quantity ?? 0]));

      const failedMaterials = [];
      const assignableMaterials = [];

      for (const mat of selectedMaterials) {
        const inCatalog = stockMap.has(mat.id);
        const stockQty = stockMap.get(mat.id) ?? 0;
        // If material exists in catalog, enforce stock check
        // If not in catalog at all, allow assignment (untracked)
        if (inCatalog && stockQty < mat.selectedQuantity) {
          failedMaterials.push({ ...mat, availableStock: stockQty });
        } else {
          assignableMaterials.push(mat);
        }
      }

      // Create failed requests for materials with insufficient stock
      // Wrapped individually so a backend error here never blocks assignments
      const failedLogged = [];
      for (const mat of failedMaterials) {
        try {
          await createFailedRequest({
            type: "STOCK_SHORTAGE",
            materialId: mat.id,
            requestedQuantity: mat.selectedQuantity,
            availableQuantity: mat.availableStock,
            driverId: selectedDriver.id,
            deliveryDate: formData.deliveryDate || null,
          });
          failedLogged.push(mat);
        } catch (err) {
          console.warn("Failed to log shortage for", mat.name, err.message);
        }
      }

      // Assign materials that have enough stock
      const assignmentErrors = [];
      for (const mat of assignableMaterials) {
        const deliveryDateToSend = formData.deliveryDate || undefined;
        let remainingToAssign = mat.selectedQuantity;

        for (const request of mat.requests) {
          if (remainingToAssign <= 0) break;
          const requestRemaining =
            request.requestedQuantity - (request.assignedQuantity || 0);
          if (requestRemaining <= 0) continue;

          // Hard cap: never send more than the individual request's total requested qty
          const assignQty = Math.min(remainingToAssign, requestRemaining, request.requestedQuantity);
          if (assignQty <= 0) continue;

          try {
            await assignMaterialRequest(
              request.id,
              selectedDriver.id,
              assignQty,
              deliveryDateToSend,
            );
            remainingToAssign -= assignQty;
          } catch (err) {
            // Backend rejected — log as failed request
            try {
              await createFailedRequest({
                type: "STOCK_SHORTAGE",
                materialId: mat.id,
                requestedQuantity: assignQty,
                availableQuantity: request.requestedQuantity,
                driverId: selectedDriver.id,
                deliveryDate: formData.deliveryDate || null,
              });
            } catch (logErr) {
              console.warn("Failed to log failed request for", mat.name, logErr.message);
            }
            assignmentErrors.push(`${mat.name}: ${err.message}`);
          }
        }
      }

      if (assignmentErrors.length > 0) {
        showToast(`Some assignments failed:\n${assignmentErrors.join("\n")}`, "error");
      } else if (failedMaterials.length > 0 && assignableMaterials.length > 0) {
        showToast(
          `Partially assigned to ${selectedDriver.name}.\nInsufficient stock for:\n` +
          failedMaterials.map((m) => `• ${m.name}: needed ${m.selectedQuantity}, available ${m.availableStock}`).join("\n") +
          "\nThese have been logged as failed requests.",
          "warning",
        );
      } else if (failedMaterials.length > 0) {
        showToast(
          `Could not assign — insufficient stock:\n` +
          failedMaterials.map((m) => `• ${m.name}: needed ${m.selectedQuantity}, available ${m.availableStock}`).join("\n") +
          "\nLogged as failed requests.",
          "error",
        );
      } else {
        showToast(`Delivery assigned successfully to ${selectedDriver.name}.`, "success");
      }

      navigate("/deliveryRequests");
    } catch (err) {
      console.error("Assignment error:", err);
      const errorMessage = err.message || "Failed to assign delivery";
      showToast(`Error: ${errorMessage}`, "error");
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
                  <td
                    className="request-id-cell"
                    title={`Request IDs: ${requestIds}`}
                  >
                    {requestCount > 1 ? (
                      <span className="request-count-badge">
                        {requestCount} reqs
                      </span>
                    ) : (
                      `#${mat.requests[0].id}`
                    )}
                  </td>
                  <td className="material-name-cell">{mat.name}</td>
                  <td>{mat.requestedQuantity}</td>
                  <td className="request-id-cell">{mat.assignedQuantity}</td>
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

        {/* Mobile Card View */}
        <div className="mobile-material-cards">
          {materialSelections.map((mat, index) => {
            const canAssign = mat.remainingQuantity > 0;
            const requestCount = mat.requests.length;

            return (
              <div
                key={index}
                className={`mobile-material-card ${
                  mat.selectedQuantity > 0 ? "selected" : ""
                } ${!canAssign ? "disabled" : ""}`}
              >
                <div className="mobile-card-header">
                  <div className="mobile-material-name">{mat.name}</div>
                  {requestCount > 1 && (
                    <div className="mobile-request-badge">
                      {requestCount} reqs
                    </div>
                  )}
                </div>
                <div className="mobile-card-body">
                  <div className="mobile-info-row">
                    <span className="mobile-info-label">Requested:</span>
                    <span className="mobile-info-value">
                      {mat.requestedQuantity}
                    </span>
                  </div>
                  <div className="mobile-info-row">
                    <span className="mobile-info-label">Assigned:</span>
                    <span className="mobile-info-value">
                      {mat.assignedQuantity}
                    </span>
                  </div>
                  <div className="mobile-info-row">
                    <span className="mobile-info-label">Remaining:</span>
                    <span
                      className={`mobile-info-value ${
                        canAssign ? "available" : "unavailable"
                      }`}
                    >
                      {mat.remainingQuantity}
                    </span>
                  </div>
                  <div className="mobile-info-row">
                    <span className="mobile-info-label">Status:</span>
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
                  </div>
                  {canAssign && (
                    <div className="mobile-quantity-input">
                      <label className="mobile-quantity-label">
                        Assign Quantity:
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={mat.remainingQuantity}
                        value={mat.selectedQuantity || ""}
                        onChange={(e) =>
                          handleMaterialSelection(index, e.target.value)
                        }
                        placeholder="Enter quantity"
                        onFocus={(e) => e.target.select()}
                      />
                      {mat.selectedQuantity > mat.remainingQuantity && (
                        <div className="quantity-error">
                          ⚠️ Max: {mat.remainingQuantity}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
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
