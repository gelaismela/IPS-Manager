import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getMaterialsByProject, createMaterialRequest, createFailedRequest } from "../api/api";
import "../styles/project.css";

const Project = () => {
  const { id } = useParams();
  const [materials, setMaterials] = useState([]);
  const [projectInfo, setProjectInfo] = useState(null);
  const [isPending, setIsPending] = useState(true);
  const [error, setError] = useState(null);
  const [requestQty, setRequestQty] = useState({});
  const [requestStatus, setRequestStatus] = useState({});

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const data = await getMaterialsByProject(id);
        setMaterials(data);
        if (data.length > 0) setProjectInfo(data[0].project);
        setIsPending(false);
      } catch (err) {
        setError("Error loading project materials");
        setIsPending(false);
      }
    };
    fetchMaterials();
  }, [id]);

  const handleRequestChange = (materialId, value) => {
    setRequestQty((prev) => ({
      ...prev,
      [materialId]: value,
    }));
  };

  const handleSubmitRequests = async () => {
    const newStatus = {};
    for (const mat of materials) {
      const qty = Number(requestQty[mat.material.id]);
      if (qty > 0) {
        newStatus[mat.material.id] = "pending";
        try {
          // Check if requested quantity exceeds the project-assigned quota
          if (qty > mat.assignedQuantity) {
            await createFailedRequest({
              type: "QUOTA_EXCEEDED",
              materialId: mat.material.id,
              requestedQuantity: qty,
              availableQuantity: mat.assignedQuantity,
              projectId: projectInfo.id,
            });
            newStatus[mat.material.id] = "quota_exceeded";
          } else {
            await createMaterialRequest(projectInfo.id, mat.material.id, qty);
            newStatus[mat.material.id] = "success";
          }
        } catch {
          newStatus[mat.material.id] = "error";
        }
      }
    }
    setRequestStatus(newStatus);
  };

  if (isPending) return <div>Loading...</div>;
  if (error) return <div style={{ color: "red" }}>{error}</div>;
  if (!projectInfo) return <div>Project not found</div>;

  return (
    <div className="project-material-main">
      <h2>{projectInfo.name}</h2>
      <p>
        <strong>Project Code:</strong> {projectInfo.projectCode}
      </p>
      <p>
        <strong>Address:</strong> {projectInfo.address}
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmitRequests();
        }}
      >
        <table className="material-table">
          <thead>
            <tr>
              <th>Material Name</th>
              <th>Assigned Quantity</th>
              <th>Used Quantity</th>
              <th>Request Quantity</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((mat) => (
              <tr key={mat.id}>
                <td>{mat.material.name}</td>
                <td>{mat.assignedQuantity}</td>
                <td>{mat.quantityUsed}</td>
                <td>
                  <input
                    type="number"
                    min="1"
                    value={requestQty[mat.material.id] || ""}
                    onChange={(e) =>
                      handleRequestChange(mat.material.id, e.target.value)
                    }
                    placeholder="Qty"
                    style={{ width: "60px" }}
                  />
                </td>
                <td>
                  {requestStatus[mat.material.id] === "success" && (
                    <span style={{ color: "green" }}>Requested!</span>
                  )}
                  {requestStatus[mat.material.id] === "error" && (
                    <span style={{ color: "red" }}>Error!</span>
                  )}
                  {requestStatus[mat.material.id] === "pending" && (
                    <span style={{ color: "#888" }}>Sending...</span>
                  )}
                  {requestStatus[mat.material.id] === "quota_exceeded" && (
                    <span style={{ color: "orange" }}>⚠️ Exceeds quota — sent for admin review</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Mobile Card View */}
        <div className="mobile-project-materials">
          {materials.map((mat) => (
            <div key={mat.id} className="mobile-material-card">
              <div className="mobile-material-name">{mat.material.name}</div>
              <div className="mobile-material-info">
                <div className="mobile-info-row">
                  <span className="mobile-info-label">Assigned:</span>
                  <span className="mobile-info-value">
                    {mat.assignedQuantity}
                  </span>
                </div>
                <div className="mobile-info-row">
                  <span className="mobile-info-label">Used:</span>
                  <span className="mobile-info-value">{mat.quantityUsed}</span>
                </div>
              </div>
              <div className="mobile-request-input">
                <label className="mobile-request-label">
                  Request Quantity:
                </label>
                <input
                  type="number"
                  min="1"
                  value={requestQty[mat.material.id] || ""}
                  onChange={(e) =>
                    handleRequestChange(mat.material.id, e.target.value)
                  }
                  placeholder="Enter quantity"
                  onFocus={(e) => e.target.select()}
                />
              </div>
              {requestStatus[mat.material.id] && (
                <div
                  className={`mobile-status ${requestStatus[mat.material.id]}`}
                >
                  {requestStatus[mat.material.id] === "success" &&
                    "✓ Requested!"}
                  {requestStatus[mat.material.id] === "error" && "✗ Error!"}
                  {requestStatus[mat.material.id] === "pending" &&
                    "⏳ Sending..."}
                  {requestStatus[mat.material.id] === "quota_exceeded" &&
                    "⚠️ Exceeds quota"}
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          type="submit"
          style={{
            marginTop: "16px",
            padding: "8px 24px",
            background: "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            fontSize: "1em",
            cursor: "pointer",
          }}
        >
          Submit Requests
        </button>
      </form>
    </div>
  );
};

export default Project;
