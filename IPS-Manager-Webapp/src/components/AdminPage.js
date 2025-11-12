import { useEffect, useState } from "react";
import {
  getProjects,
  getAllPendingRequests,
  addMaterialToProject,
  removeMaterialFromProject,
  updateProjectMaterial,
  updateDeliveryStatus,
  getAllDeliveries,
  getAllMaterials,
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
  const [allMaterials, setAllMaterials] = useState([]); // Available materials from DB
  const [loading, setLoading] = useState(true);
  const [editingProject, setEditingProject] = useState(null);
  const [collapsedDeliveryProjects, setCollapsedDeliveryProjects] = useState(
    {}
  );
  const [collapsedRequestProjects, setCollapsedRequestProjects] = useState({});
  const [newMaterial, setNewMaterial] = useState({
    id: null,
    name: "",
    unit: "",
    quantity: "",
  });
  const [materialSearch, setMaterialSearch] = useState(""); // For autocomplete search
  const [showMaterialSuggestions, setShowMaterialSuggestions] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const projectsData = await getProjects();
        setProjects(projectsData);

        // Fetch all available materials for autocomplete
        const materialsData = await getAllMaterials();
        setAllMaterials(materialsData || []);

        // Try to fetch deliveries, but handle 403 gracefully
        try {
          const deliveriesData = await getAllDeliveries();
          console.log("Fetched deliveries:", deliveriesData);
          setDeliveries(deliveriesData || []);
        } catch (deliveryErr) {
          console.warn(
            "Could not fetch deliveries (may need admin permission):",
            deliveryErr
          );
          setDeliveries([]);
        }

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

  // Filter materials for autocomplete suggestions
  const filteredMaterials = allMaterials.filter(
    (mat) =>
      materialSearch &&
      (mat.name?.toLowerCase().includes(materialSearch.toLowerCase()) ||
        mat.id?.toString().includes(materialSearch))
  );

  const handleEditProject = (project) => {
    setEditingProject({ ...project });
  };

  const handleMaterialChange = async (index, field, value) => {
    const updatedMaterials = [...editingProject.materials];
    updatedMaterials[index] = {
      ...updatedMaterials[index],
      [field]: field === "name" || field === "unit" ? value : Number(value),
    };

    setEditingProject({
      ...editingProject,
      materials: updatedMaterials,
    });

    // If quantity changed and project is saved, update backend
    if (
      field === "quantity" &&
      editingProject.id &&
      updatedMaterials[index].id
    ) {
      try {
        await updateProjectMaterial(
          editingProject.id,
          updatedMaterials[index].id,
          Number(value)
        );
      } catch (err) {
        console.error("Failed to update material quantity:", err);
        alert("Failed to update quantity: " + (err.message || "Unknown error"));
      }
    }
  };

  const handleSelectMaterial = (material) => {
    setNewMaterial({
      id: material.id,
      name: material.name,
      unit: material.unit || "",
      quantity: "",
    });
    setMaterialSearch(material.name);
    setShowMaterialSuggestions(false);
  };

  const handleAddMaterial = async () => {
    if (!newMaterial.id || !newMaterial.quantity) {
      alert("Please select a material and enter quantity");
      return;
    }

    if (!editingProject.id) {
      alert("Cannot add materials to unsaved project");
      return;
    }

    try {
      // Call backend to add material to project
      await addMaterialToProject(
        editingProject.id,
        newMaterial.id,
        Number(newMaterial.quantity)
      );

      // Update local state
      setEditingProject({
        ...editingProject,
        materials: [
          ...editingProject.materials,
          {
            id: newMaterial.id,
            name: newMaterial.name,
            unit: newMaterial.unit,
            quantity: Number(newMaterial.quantity),
          },
        ],
      });
      setNewMaterial({ id: null, name: "", unit: "", quantity: "" });
      setMaterialSearch("");

      // Refresh projects list
      const projectsData = await getProjects();
      setProjects(projectsData);

      alert("Material added successfully!");
    } catch (err) {
      console.error("Failed to add material:", err);
      alert("Failed to add material: " + (err.message || "Unknown error"));
    }
  };

  const handleRemoveMaterial = async (index) => {
    const material = editingProject.materials[index];

    if (!editingProject.id || !material.id) {
      // Just remove from local state if project not saved
      const updatedMaterials = editingProject.materials.filter(
        (_, i) => i !== index
      );
      setEditingProject({
        ...editingProject,
        materials: updatedMaterials,
      });
      return;
    }

    if (!window.confirm(`Remove ${material.name} from this project?`)) {
      return;
    }

    try {
      await removeMaterialFromProject(editingProject.id, material.id);

      const updatedMaterials = editingProject.materials.filter(
        (_, i) => i !== index
      );
      setEditingProject({
        ...editingProject,
        materials: updatedMaterials,
      });

      // Refresh projects list
      const projectsData = await getProjects();
      setProjects(projectsData);

      alert("Material removed successfully!");
    } catch (err) {
      console.error("Failed to remove material:", err);
      alert("Failed to remove material: " + (err.message || "Unknown error"));
    }
  };

  const saveProjectChanges = async () => {
    try {
      // Refresh projects list to show latest changes
      const projectsData = await getProjects();
      setProjects(projectsData);
      setEditingProject(null);
      alert("Changes saved successfully!");
    } catch (err) {
      console.error("Error refreshing projects:", err);
      alert("Failed to refresh projects");
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

  const toggleDeliveryProject = (projectId) => {
    setCollapsedDeliveryProjects((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  const toggleRequestProject = (projectId) => {
    setCollapsedRequestProjects((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  if (loading) return <div className="loading">Loading admin dashboard...</div>;

  return (
    <div className="admin-container">
      <h1>Admin Dashboard</h1>

      <section className="projects-section">
        <h2>
          <span>🏢</span>Current Projects
        </h2>
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
                    placeholder="Material ID"
                    value={mat.id || ""}
                    onChange={(e) =>
                      handleMaterialChange(idx, "id", e.target.value)
                    }
                    disabled
                  />
                  <input
                    type="text"
                    placeholder="Material Name"
                    value={mat.name}
                    onChange={(e) =>
                      handleMaterialChange(idx, "name", e.target.value)
                    }
                  />
                  <input
                    type="text"
                    placeholder="Unit"
                    value={mat.unit || ""}
                    onChange={(e) =>
                      handleMaterialChange(idx, "unit", e.target.value)
                    }
                  />
                  <input
                    type="number"
                    placeholder="Quantity"
                    value={mat.quantity}
                    onChange={(e) =>
                      handleMaterialChange(idx, "quantity", e.target.value)
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
                <div className="autocomplete-container">
                  <input
                    type="text"
                    placeholder="Search material by ID or name..."
                    value={materialSearch}
                    onChange={(e) => {
                      setMaterialSearch(e.target.value);
                      setShowMaterialSuggestions(e.target.value.length > 0);
                    }}
                    onFocus={() =>
                      setShowMaterialSuggestions(materialSearch.length > 0)
                    }
                  />
                  {showMaterialSuggestions && filteredMaterials.length > 0 && (
                    <div className="autocomplete-suggestions">
                      {filteredMaterials.slice(0, 10).map((mat) => (
                        <div
                          key={mat.id}
                          className="autocomplete-item"
                          onClick={() => handleSelectMaterial(mat)}
                        >
                          <strong>{mat.name}</strong>
                          <span className="material-details">
                            ID: {mat.id} | Unit: {mat.unit || "N/A"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Unit"
                  value={newMaterial.unit}
                  disabled
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

      {/* Deliveries section - Grouped by Project */}
      <section className="deliveries-section">
        <h2>📦 Delivery Status by Project</h2>
        <p
          style={{ fontSize: "0.9em", color: "#6c757d", marginBottom: "10px" }}
        >
          {deliveries.length > 0 ? (
            <>
              Total deliveries: {deliveries.length} (Sorted by status and date)
            </>
          ) : (
            <>No deliveries loaded. Check backend permissions.</>
          )}
        </p>
        {deliveries.length === 0 ? (
          <p className="empty-state">
            No deliveries available. This may be due to backend permissions.
          </p>
        ) : (
          (() => {
            // Sort deliveries by date (newest first), then by status
            const sortedDeliveries = [...deliveries].sort((a, b) => {
              // First sort by status priority: ASSIGNED > SENT > PENDING
              const statusOrder = { ASSIGNED: 1, SENT: 2, PENDING: 3 };
              const statusDiff =
                (statusOrder[a.status] || 999) - (statusOrder[b.status] || 999);
              if (statusDiff !== 0) return statusDiff;

              // Then sort by delivery date (newest first)
              const dateA = new Date(a.deliveryDate || 0);
              const dateB = new Date(b.deliveryDate || 0);
              return dateB - dateA;
            });

            console.log("Sorted deliveries:", sortedDeliveries);

            // Group deliveries by project
            const grouped = sortedDeliveries.reduce((acc, delivery) => {
              const project = delivery.materialRequest?.project;
              const projectId = project?.id;

              if (!projectId) {
                console.log("Skipping delivery without project:", delivery);
                return acc;
              }

              const projectKey = `project-${projectId}`;
              const projectName = project?.name || "Unknown Project";
              const projectCode = project?.projectCode || "N/A";

              if (!acc[projectKey]) {
                acc[projectKey] = {
                  projectId,
                  projectName,
                  projectCode,
                  deliveries: [],
                };
              }
              acc[projectKey].deliveries.push(delivery);
              return acc;
            }, {});

            console.log("Grouped deliveries:", grouped);

            if (Object.keys(grouped).length === 0) {
              return (
                <div className="empty-state">
                  <p>No deliveries with valid project information found.</p>
                  <p style={{ fontSize: "0.9em", marginTop: "10px" }}>
                    Check console for delivery data structure.
                  </p>
                </div>
              );
            }

            return (
              <div className="project-deliveries-container">
                {Object.entries(grouped).map(([projectKey, projectData]) => {
                  // Further group materials within each project
                  const materialGroups = projectData.deliveries.reduce(
                    (matAcc, delivery) => {
                      const material = delivery.materialRequest?.material;
                      const matId = material?.id || `delivery-${delivery.id}`;
                      const matName = material?.name || "Unknown Material";

                      if (!matAcc[matId]) {
                        matAcc[matId] = {
                          materialName: matName,
                          deliveries: [],
                        };
                      }
                      matAcc[matId].deliveries.push(delivery);
                      return matAcc;
                    },
                    {}
                  );

                  // Sort deliveries within each material group by status and date
                  Object.values(materialGroups).forEach((group) => {
                    group.deliveries.sort((a, b) => {
                      const statusOrder = { ASSIGNED: 1, SENT: 2, PENDING: 3 };
                      const statusDiff =
                        (statusOrder[a.status] || 999) -
                        (statusOrder[b.status] || 999);
                      if (statusDiff !== 0) return statusDiff;
                      const dateA = new Date(a.deliveryDate || 0);
                      const dateB = new Date(b.deliveryDate || 0);
                      return dateB - dateA;
                    });
                  });

                  const isCollapsed =
                    collapsedDeliveryProjects[projectData.projectId];

                  return (
                    <div key={projectKey} className="project-delivery-group">
                      <div
                        className="project-header"
                        onClick={() =>
                          toggleDeliveryProject(projectData.projectId)
                        }
                        style={{ cursor: "pointer" }}
                      >
                        <h3>
                          <span
                            className={`collapse-arrow ${
                              isCollapsed ? "collapsed" : ""
                            }`}
                          >
                            ▼
                          </span>
                          <span className="project-icon">🏗️</span>
                          {projectData.projectName}
                          <span className="project-code-badge">
                            {projectData.projectCode}
                          </span>
                        </h3>
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            alignItems: "center",
                          }}
                        >
                          <span className="delivery-count-badge">
                            {projectData.deliveries.length} total
                          </span>
                          {projectData.deliveries.filter(
                            (d) => d.status === "ASSIGNED"
                          ).length > 0 && (
                            <span
                              style={{
                                background: "#cfe2ff",
                                color: "#084298",
                                padding: "4px 10px",
                                borderRadius: "12px",
                                fontSize: "0.85em",
                                fontWeight: "600",
                              }}
                            >
                              {
                                projectData.deliveries.filter(
                                  (d) => d.status === "ASSIGNED"
                                ).length
                              }{" "}
                              assigned
                            </span>
                          )}
                          {projectData.deliveries.filter(
                            (d) => d.status === "SENT"
                          ).length > 0 && (
                            <span
                              style={{
                                background: "#d1e7dd",
                                color: "#0f5132",
                                padding: "4px 10px",
                                borderRadius: "12px",
                                fontSize: "0.85em",
                                fontWeight: "600",
                              }}
                            >
                              {
                                projectData.deliveries.filter(
                                  (d) => d.status === "SENT"
                                ).length
                              }{" "}
                              sent
                            </span>
                          )}
                          {projectData.deliveries.filter(
                            (d) => d.status === "PENDING"
                          ).length > 0 && (
                            <span
                              style={{
                                background: "#fff3cd",
                                color: "#856404",
                                padding: "4px 10px",
                                borderRadius: "12px",
                                fontSize: "0.85em",
                                fontWeight: "600",
                              }}
                            >
                              {
                                projectData.deliveries.filter(
                                  (d) => d.status === "PENDING"
                                ).length
                              }{" "}
                              pending
                            </span>
                          )}
                        </div>
                      </div>

                      {!isCollapsed && (
                        <div className="materials-delivery-list">
                          {Object.entries(materialGroups).map(
                            ([matId, matData]) => (
                              <div
                                key={`${projectData.projectId}-material-${matId}`}
                                className="material-delivery-section"
                              >
                                <div className="material-header">
                                  <span className="material-icon">📦</span>
                                  <strong>{matData.materialName}</strong>
                                  <span className="delivery-sub-count">
                                    {matData.deliveries.length}{" "}
                                    {matData.deliveries.length === 1
                                      ? "delivery"
                                      : "deliveries"}
                                  </span>
                                </div>

                                <div className="delivery-cards-grid">
                                  {matData.deliveries.map((delivery) => (
                                    <div
                                      key={delivery.id}
                                      className="delivery-card-admin"
                                    >
                                      <div className="delivery-card-header">
                                        <span className="delivery-id">
                                          Delivery #{delivery.id}
                                        </span>
                                        <span
                                          className={`status-badge ${delivery.status}`}
                                        >
                                          {statusLabels[delivery.status] ||
                                            delivery.status}
                                        </span>
                                      </div>
                                      <div className="delivery-card-body">
                                        <div className="info-row">
                                          <span className="label">Driver:</span>
                                          <span className="value">
                                            {delivery.driver?.name ||
                                              delivery.assignedDriver?.name ||
                                              "Not assigned"}
                                          </span>
                                        </div>
                                        <div className="info-row">
                                          <span className="label">
                                            Quantity:
                                          </span>
                                          <span className="value">
                                            {delivery.assignedQuantity || 0}{" "}
                                            units
                                          </span>
                                        </div>
                                        <div className="info-row">
                                          <span className="label">
                                            Delivery Date:
                                          </span>
                                          <span className="value">
                                            {formatDate(delivery.deliveryDate)}
                                          </span>
                                        </div>
                                        <div className="info-row">
                                          <span className="label">
                                            Assigned At:
                                          </span>
                                          <span className="value">
                                            {formatDate(delivery.assignedAt)}
                                          </span>
                                        </div>
                                      </div>
                                      {delivery.status === "ASSIGNED" && (
                                        <button
                                          onClick={() =>
                                            handleDeliveryStatusUpdate(
                                              delivery.id,
                                              "SENT"
                                            )
                                          }
                                          className="mark-sent-btn"
                                        >
                                          ✓ Mark as Sent
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()
        )}
      </section>

      <section className="requests-section">
        <h2>
          <span>📋</span>Pending Delivery Requests
        </h2>
        {requests.length === 0 ? (
          <p className="empty-state">No pending requests</p>
        ) : (
          (() => {
            // Group requests by project
            const groupedRequests = requests.reduce((acc, request) => {
              const projectId = request.project?.id;
              if (!projectId) return acc;

              const projectKey = `request-project-${projectId}`;
              const projectName =
                request.project?.name ||
                request.projectName ||
                "Unknown Project";
              const projectCode = request.project?.projectCode || "N/A";

              if (!acc[projectKey]) {
                acc[projectKey] = {
                  projectId,
                  projectName,
                  projectCode,
                  requests: [],
                };
              }
              acc[projectKey].requests.push(request);
              return acc;
            }, {});

            return (
              <div className="project-requests-container">
                {Object.entries(groupedRequests).map(
                  ([projectKey, projectData]) => {
                    const isCollapsed =
                      collapsedRequestProjects[projectData.projectId];

                    return (
                      <div key={projectKey} className="project-request-group">
                        <div
                          className="project-header"
                          onClick={() =>
                            toggleRequestProject(projectData.projectId)
                          }
                          style={{ cursor: "pointer" }}
                        >
                          <h3>
                            <span
                              className={`collapse-arrow ${
                                isCollapsed ? "collapsed" : ""
                              }`}
                            >
                              ▼
                            </span>
                            <span className="project-icon">🏗️</span>
                            {projectData.projectName}
                            <span className="project-code-badge">
                              {projectData.projectCode}
                            </span>
                          </h3>
                          <span className="delivery-count-badge">
                            {projectData.requests.length}{" "}
                            {projectData.requests.length === 1
                              ? "request"
                              : "requests"}
                          </span>
                        </div>

                        {!isCollapsed && (
                          <div className="requests-grid">
                            {projectData.requests.map((request) => (
                              <div key={request.id} className="request-card">
                                <h3>Request #{request.id}</h3>
                                <div className="request-materials">
                                  <h4>Materials Requested:</h4>
                                  <ul>
                                    {(request.materials || []).map(
                                      (mat, idx) => (
                                        <li key={idx}>
                                          {mat.quantity}x {mat.name}
                                        </li>
                                      )
                                    )}
                                  </ul>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            );
          })()
        )}
      </section>

      <section className="upload-section">
        <h2>
          <span>📤</span>Upload Excel File
        </h2>
        <ExcelUpload />
      </section>
    </div>
  );
};

export default AdminPage;
