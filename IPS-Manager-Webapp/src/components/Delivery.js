import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import {
  getAllRequestsForProject,
  createBatch,
} from "../api/api";
import "../styles/delivery.css";
import { useToast } from "../contexts/ToastContext";

const Delivery = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleMaterialSelection = (index, quantity) => {
    const newQuantity = Math.min(
      Math.max(0, parseInt(quantity) || 0),
      materialSelections[index].remainingQuantity || 0
    );
    setMaterialSelections((prev) =>
      prev.map((mat, i) =>
        i === index
          ? { ...mat, selectedQuantity: newQuantity, selected: newQuantity > 0 }
          : mat
      )
    );
  };

  const handleSaveBatch = async () => {
    const selected = materialSelections.filter((mat) => mat.selected && mat.selectedQuantity > 0);
    if (selected.length === 0) { showToast("Select at least one material.", "warning"); return; }
    setIsSaving(true);
    try {
      await createBatch(
        Number(id),
        selected.map((mat) => ({
          materialId: mat.id,
          materialName: mat.name,
          materialCode: mat.code || String(mat.id),
          unit: mat.unit || "",
          quantity: mat.selectedQuantity,
          requestIds: mat.requests.map((r) => r.id),
        }))
      );
      showToast("Batch saved! Switch to Assign Driver to assign a driver.", "success");
      navigate("/deliveryRequests");
    } catch (err) {
      showToast(`Failed to save batch: ${err.message}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading)
    return <div className="delivery-loading">Loading delivery...</div>;
  if (!requests.length)
    return <div>No delivery requests found for this project.</div>;

  const projectInfo = requests[0]?.project;
  const selectedMaterials = materialSelections.filter(
    (mat) => mat.selected && mat.selectedQuantity > 0
  );

  const handleDownloadExcel = () => {
    const rows = selectedMaterials.map((m) => ({
      "კოდი": m.code || m.id || "",
      "დასახელება": m.name,
      "განზ.": m.unit || "",
      "საპროექტო": m.selectedQuantity,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 18 }, { wch: 40 }, { wch: 8 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dispatch List");
    const safeCode = projectInfo?.projectCode ? `_${projectInfo.projectCode}` : "";
    XLSX.writeFile(wb, `dispatch${safeCode}.xlsx`);
  };

  return (
    <div className="delivery-container">
      <h2>Create Dispatch Batch — {projectInfo?.name}</h2>

      <div className="delivery-info">
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
              <th style={{ width: "150px" }}>Batch Quantity</th>
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
                  className={`${mat.selectedQuantity > 0 ? "material-row-selected" : ""} ${!canAssign ? "material-row-disabled" : ""}`}
                >
                  <td className="request-id-cell" title={`Request IDs: ${requestIds}`}>
                    {requestCount > 1 ? (
                      <span className="request-count-badge">{requestCount} reqs</span>
                    ) : (
                      `#${mat.requests[0].id}`
                    )}
                  </td>
                  <td className="material-name-cell">{mat.name}</td>
                  <td>{mat.requestedQuantity}</td>
                  <td className="request-id-cell">{mat.assignedQuantity}</td>
                  <td>
                    <span className={`remaining-qty ${canAssign ? "available" : "unavailable"}`}>
                      {mat.remainingQuantity}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${mat.status === "DELIVERED" ? "delivered" : mat.status === "ASSIGNED" ? "assigned" : "pending"}`}>
                      {mat.status}
                    </span>
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max={mat.remainingQuantity}
                      value={mat.selectedQuantity || ""}
                      onChange={(e) => handleMaterialSelection(index, e.target.value)}
                      className={`quantity-input-field ${mat.selectedQuantity > 0 ? "selected" : ""}`}
                      disabled={!canAssign}
                      placeholder={canAssign ? "0" : "—"}
                      onFocus={(e) => e.target.select()}
                    />
                    {mat.selectedQuantity > mat.remainingQuantity && (
                      <div className="quantity-error">⚠️ Max: {mat.remainingQuantity}</div>
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
                className={`mobile-material-card ${mat.selectedQuantity > 0 ? "selected" : ""} ${!canAssign ? "disabled" : ""}`}
              >
                <div className="mobile-card-header">
                  <div className="mobile-material-name">{mat.name}</div>
                  {requestCount > 1 && (
                    <div className="mobile-request-badge">{requestCount} reqs</div>
                  )}
                </div>
                <div className="mobile-card-body">
                  <div className="mobile-info-row">
                    <span className="mobile-info-label">Requested:</span>
                    <span className="mobile-info-value">{mat.requestedQuantity}</span>
                  </div>
                  <div className="mobile-info-row">
                    <span className="mobile-info-label">Remaining:</span>
                    <span className={`mobile-info-value ${canAssign ? "available" : "unavailable"}`}>
                      {mat.remainingQuantity}
                    </span>
                  </div>
                  <div className="mobile-info-row">
                    <span className="mobile-info-label">Status:</span>
                    <span className={`status-badge ${mat.status === "DELIVERED" ? "delivered" : mat.status === "ASSIGNED" ? "assigned" : "pending"}`}>
                      {mat.status}
                    </span>
                  </div>
                  {canAssign && (
                    <div className="mobile-quantity-input">
                      <label className="mobile-quantity-label">Batch Quantity:</label>
                      <input
                        type="number"
                        min="0"
                        max={mat.remainingQuantity}
                        value={mat.selectedQuantity || ""}
                        onChange={(e) => handleMaterialSelection(index, e.target.value)}
                        placeholder="Enter quantity"
                        onFocus={(e) => e.target.select()}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="step-actions">
        <button
          type="button"
          className="btn-excel-download"
          disabled={selectedMaterials.length === 0}
          onClick={handleDownloadExcel}
        >
          ⬇ Download Excel
        </button>
        <button
          type="button"
          className="submit-btn"
          disabled={selectedMaterials.length === 0 || isSaving}
          onClick={handleSaveBatch}
        >
          {isSaving ? "Saving..." : "📦 Save Batch"}
        </button>

      </div>
    </div>
  );
};

export default Delivery;
