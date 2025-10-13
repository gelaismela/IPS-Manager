import { useEffect, useState } from "react";
import {
  getProjects,
  getAllPendingRequests,
  addMaterial,
  addProject,
  updateDeliveryStatus,
} from "../api/api";
import "../styles/adminPage.css";
import ExcelUpload from "./ExcelUpload";

const ALLOWED_STATUSES = ["PENDING", "PARTIALLY_ASSIGNED", "ASSIGNED", "SENT"];

const statusLabels = {
  PENDING: "Pending",
  PARTIALLY_ASSIGNED: "Partially Assigned",
  ASSIGNED: "Assigned",
  SENT: "Sent",
};

const AdminPage = () => {
  const [projects, setProjects] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProject, setEditingProject] = useState(null);
  const [newMaterial, setNewMaterial] = useState({
    name: "",
    quantity: "",
    weight: "",
  });
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const projectsData = await getProjects();
        setProjects(projectsData);

        // For deliveries, you may need a getAllDeliveries API
        // For now, just leave as empty or fetch if available

        const requestsData = await getAllPendingRequests();
        setRequests(requestsData);
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter projects by search (using project_code and name)
  const filteredProjects = projects
    .filter(
      (project) =>
        project.name?.toLowerCase().includes(search.toLowerCase()) ||
        String(project.projectCode).toLowerCase().includes(search.toLowerCase())
    )
    .slice(0, 5); // Show only first 5

  const handleEditProject = (project) => {
    setEditingProject({ ...project });
  };

  const handleMaterialChange = (index, field, value) => {
    const updatedMaterials = [...editingProject.materials];
    updatedMaterials[index] = {
      ...updatedMaterials[index],
      [field]: field === "name" ? value : Number(value),
    };
    setEditingProject({
      ...editingProject,
      materials: updatedMaterials,
    });
  };

  const handleAddMaterial = async () => {
    if (!newMaterial.name || !newMaterial.quantity || !newMaterial.weight)
      return;

    try {
      const added = await addMaterial(newMaterial);
      setEditingProject({
        ...editingProject,
        materials: [
          ...editingProject.materials,
          {
            name: added.name,
            quantity: Number(added.quantity),
            weight: Number(added.weight),
          },
        ],
      });
      setNewMaterial({ name: "", quantity: "", weight: "" });
    } catch (err) {
      alert("Failed to add material");
    }
  };

  const handleRemoveMaterial = (index) => {
    const updatedMaterials = editingProject.materials.filter(
      (_, i) => i !== index
    );
    setEditingProject({
      ...editingProject,
      materials: updatedMaterials,
    });
  };

  const saveProjectChanges = async () => {
    try {
      await addProject(editingProject);
      setProjects(
        projects.map((p) => (p.id === editingProject.id ? editingProject : p))
      );
      setEditingProject(null);
      alert("Project updated successfully!");
    } catch (err) {
      console.error("Error updating project:", err);
      alert("Failed to update project");
    }
  };

  const handleDeliveryStatusUpdate = async (deliveryId, newStatus) => {
    if (!ALLOWED_STATUSES.includes(newStatus)) {
      alert(`Invalid status: ${newStatus}`);
      return;
    }
    try {
      await updateDeliveryStatus(deliveryId, newStatus);
      setDeliveries((prev) =>
        prev.map((d) => (d.id === deliveryId ? { ...d, status: newStatus } : d))
      );
      alert(`Delivery status updated to ${statusLabels[newStatus]}`);
    } catch (err) {
      alert("Failed to update delivery status");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading) return <div className="loading">Loading admin dashboard...</div>;

  return (
    <div className="admin-container">
      <h1>Admin Dashboard</h1>

      <section className="projects-section">
        <h2>Current Projects</h2>
        <input
          type="text"
          placeholder="Search by name or Project Code"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginBottom: "16px", padding: "8px", width: "250px" }}
        />
        <div className="projects-grid">
          {filteredProjects.map((project) => (
            <div key={project.projectCode} className="project-card">
              <h3>{project.name}</h3>
              <p>
                <strong>Project Code:</strong> {project.projectCode}
              </p>
              <div className="materials-list">
                <h4>Materials:</h4>
                <ul>
                  {(project.materials || []).map((mat, idx) => (
                    <li key={idx}>
                      {mat.name} - {mat.quantity} units ({mat.weight} kg each)
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => setEditingProject(project)}
                className="edit-btn"
              >
                Edit Project
              </button>
            </div>
          ))}
          {filteredProjects.length === 0 && <p>No projects found.</p>}
        </div>
      </section>

      {editingProject && (
        <div className="edit-modal">
          <div className="modal-content">
            <h2>Edit Project: {editingProject.name}</h2>

            <div className="current-materials">
              <h3>Current Materials</h3>
              {(editingProject.materials || []).map((mat, idx) => (
                <div key={idx} className="material-edit">
                  <input
                    type="text"
                    value={mat.name}
                    onChange={(e) =>
                      handleMaterialChange(idx, "name", e.target.value)
                    }
                  />
                  <input
                    type="number"
                    value={mat.quantity}
                    onChange={(e) =>
                      handleMaterialChange(idx, "quantity", e.target.value)
                    }
                    min="0"
                  />
                  <input
                    type="number"
                    value={mat.weight}
                    onChange={(e) =>
                      handleMaterialChange(idx, "weight", e.target.value)
                    }
                    min="0"
                  />
                  <button
                    onClick={() => handleRemoveMaterial(idx)}
                    className="remove-btn"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="add-material">
              <h3>Add New Material</h3>
              <div className="add-material-form">
                <input
                  type="text"
                  placeholder="Material name"
                  value={newMaterial.name}
                  onChange={(e) =>
                    setNewMaterial({ ...newMaterial, name: e.target.value })
                  }
                />
                <input
                  type="number"
                  placeholder="Quantity"
                  value={newMaterial.quantity}
                  onChange={(e) =>
                    setNewMaterial({ ...newMaterial, quantity: e.target.value })
                  }
                  min="1"
                />
                <input
                  type="number"
                  placeholder="Weight (kg)"
                  value={newMaterial.weight}
                  onChange={(e) =>
                    setNewMaterial({ ...newMaterial, weight: e.target.value })
                  }
                  min="1"
                />
                <button onClick={handleAddMaterial} className="add-btn">
                  Add Material
                </button>
              </div>
            </div>

            <div className="modal-actions">
              <button
                onClick={() => setEditingProject(null)}
                className="cancel-btn"
              >
                Cancel
              </button>
              <button onClick={saveProjectChanges} className="save-btn">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deliveries section: you may need to fetch deliveries with a new API */}
      {/* Example table structure, update with your actual delivery data */}
      <section className="deliveries-section">
        <h2>Delivery Status</h2>
        <div className="deliveries-table">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Project</th>
                <th>Driver</th>
                <th>Materials</th>
                <th>Status</th>
                <th>Assigned At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(deliveries || []).map((delivery) => (
                <tr key={delivery.id}>
                  <td>{delivery.id}</td>
                  <td>{delivery.project?.name || delivery.projectName}</td>
                  <td>
                    {delivery.driver?.name ||
                      delivery.assignedDriver?.name ||
                      "N/A"}
                  </td>
                  <td>
                    <ul className="delivery-materials">
                      {(delivery.materials || []).map((mat, idx) => (
                        <li key={idx}>
                          {mat.quantity}x {mat.name} ({mat.weight}kg each)
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className={`status ${delivery.status}`}>
                    {statusLabels[delivery.status] || delivery.status}
                  </td>
                  <td>{formatDate(delivery.assignedAt)}</td>
                  <td className="actions">
                    {delivery.status === "ASSIGNED" && (
                      <button
                        onClick={() =>
                          handleDeliveryStatusUpdate(delivery.id, "SENT")
                        }
                        className="complete-btn"
                      >
                        Mark Sent
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="requests-section">
        <h2>Pending Delivery Requests</h2>
        {requests.length === 0 ? (
          <p>No pending requests</p>
        ) : (
          <div className="requests-grid">
            {(requests || []).map((request) => (
              <div key={request.id} className="request-card">
                <h3>Request #{request.id}</h3>
                <p>
                  <strong>Project:</strong>{" "}
                  {request.project?.name || request.projectName}
                </p>
                <div className="request-materials">
                  <h4>Materials Requested:</h4>
                  <ul>
                    {(request.materials || []).map((mat, idx) => (
                      <li key={idx}>
                        {mat.quantity}x {mat.name} ({mat.weight}kg each)
                      </li>
                    ))}
                  </ul>
                </div>
                <p>
                  <strong>Total Weight:</strong> {request.totalWeight} kg
                </p>
                <p>
                  <strong>Created:</strong> {formatDate(request.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="upload-section">
        <h2>Upload Excel File</h2>
        <ExcelUpload />
      </section>
    </div>
  );
};

export default AdminPage;
