import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getMaterialsByProject, createMaterialRequest } from "../api/api";
import "../styles/project.css";
import Navbar from "./Navbar";

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
          // Debug log
          console.log("Sending material request:", {
            projectId: projectInfo.id,
            materialId: mat.material.id,
            requestedQuantity: qty,
          });
          await createMaterialRequest(projectInfo.id, mat.material.id, qty);
          newStatus[mat.material.id] = "success";
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
    <>
      <Navbar />
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
    </>
  );
};

export default Project;
