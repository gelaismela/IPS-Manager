import { useEffect, useState } from "react";
import {
  getProjects,
  getAllMaterialRequests,
  addMaterialToProject,
  removeMaterialFromProject,
  updateProjectMaterial,
  updateDeliveryStatus,
  getAllDeliveries,
  getAllMaterials,
  getUsers,
  assignProjectManager,
  getMyProjects,
} from "../api/api";
import "../styles/adminPage.css";
import ExcelUpload from "./ExcelUpload";
import { useTranslation } from "../hooks/useTranslation";

const ALLOWED_STATUSES = ["PENDING", "PARTIALLY_ASSIGNED", "ASSIGNED", "SENT"];

const AdminPage = () => {
  const { t } = useTranslation();
  const [projects, setProjects] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [requests, setRequests] = useState([]);
  const [allMaterials, setAllMaterials] = useState([]); // Available materials from DB
  const [projectManagers, setProjectManagers] = useState([]); // Users with project_manager role
  const [loading, setLoading] = useState(true);
  const [editingProject, setEditingProject] = useState(null);
  const [assigningManager, setAssigningManager] = useState(null); // Project being assigned a manager
  const [collapsedDeliveryProjects, setCollapsedDeliveryProjects] = useState(
    {}
  );
  const [collapsedRequestProjects, setCollapsedRequestProjects] = useState({});
  const [expandedStatusGroups, setExpandedStatusGroups] = useState({}); // Track expanded status groups
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
        // Get user role from localStorage
        const userStr = localStorage.getItem("user");
        const user = userStr ? JSON.parse(userStr) : null;
        const userRole = user?.role?.toLowerCase();

        console.log("🔍 DEBUG - User from localStorage:", user);
        console.log("🔍 DEBUG - User role:", userRole);

        // Fetch projects based on role
        let projectsData;
        if (
          userRole === "project_manager" ||
          userRole === "project manager" ||
          userRole === "projectmanager"
        ) {
          console.log("✅ Calling getMyProjects() for project_manager");
          // Project managers only see their assigned projects
          projectsData = await getMyProjects();
        } else {
          console.log("✅ Calling getProjects() for admin/dev");
          // Admins (dev) see all projects
          projectsData = await getProjects();
        }
        console.log("📦 Projects received:", projectsData);
        setProjects(projectsData);

        // Fetch all available materials for autocomplete
        const materialsData = await getAllMaterials();
        setAllMaterials(materialsData || []);

        // Fetch all users to get project managers
        try {
          const usersData = await getUsers();
          // Filter only project managers (or keep all users if you want flexibility)
          const managers = usersData.filter(
            (u) => u.role === "project_manager" || u.role === "dev"
          );
          setProjectManagers(managers || []);
        } catch (userErr) {
          console.warn("Could not fetch users:", userErr);
          setProjectManagers([]);
        }

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

        const requestsData = await getAllMaterialRequests();
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

      // Refresh projects list based on role
      const userStr = localStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : null;
      const userRole = user?.role?.toLowerCase();
      const projectsData =
        userRole === "project_manager" ||
        userRole === "project manager" ||
        userRole === "projectmanager"
          ? await getMyProjects()
          : await getProjects();
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

      // Refresh projects list based on role
      const userStr = localStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : null;
      const userRole = user?.role?.toLowerCase();
      const projectsData =
        userRole === "project_manager" ||
        userRole === "project manager" ||
        userRole === "projectmanager"
          ? await getMyProjects()
          : await getProjects();
      setProjects(projectsData);

      alert("Material removed successfully!");
    } catch (err) {
      console.error("Failed to remove material:", err);
      alert("Failed to remove material: " + (err.message || "Unknown error"));
    }
  };

  const saveProjectChanges = async () => {
    try {
      // Refresh projects list to show latest changes based on role
      const userStr = localStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : null;
      const userRole = user?.role?.toLowerCase();
      const projectsData =
        userRole === "project_manager" ||
        userRole === "project manager" ||
        userRole === "projectmanager"
          ? await getMyProjects()
          : await getProjects();
      setProjects(projectsData);
      setEditingProject(null);
      alert("Changes saved successfully!");
    } catch (err) {
      console.error("Error refreshing projects:", err);
      alert("Failed to refresh projects");
    }
  };

  const handleAssignManager = async (projectId, managerId) => {
    if (!managerId) {
      alert("Please select a project manager");
      return;
    }

    try {
      await assignProjectManager(projectId, managerId);

      // Refresh projects list based on role
      const userStr = localStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : null;
      const userRole = user?.role?.toLowerCase();
      const projectsData =
        userRole === "project_manager" ||
        userRole === "project manager" ||
        userRole === "projectmanager"
          ? await getMyProjects()
          : await getProjects();
      setProjects(projectsData);

      setAssigningManager(null);
      alert("Project manager assigned successfully!");
    } catch (err) {
      console.error("Failed to assign project manager:", err);
      alert("Failed to assign manager: " + (err.message || "Unknown error"));
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

  const toggleStatusGroup = (projectId, status) => {
    const key = `${projectId}-${status}`;
    setExpandedStatusGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (loading) return <div className="loading">{t("admin.loading")}</div>;

  // Get user role
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  
  // Debug: Check user object and role
  console.log("👤 Full user object:", user);
  console.log("📧 User email:", user?.email || user?.mail);
  console.log("🎭 User role (exact):", user?.role);
  console.log("🔠 Role type:", typeof user?.role);
  
  const isAdmin = true; // Temporarily show for all users
  console.log("🔐 Is Admin?", isAdmin);

  const statusLabels = {
    PENDING: t("status.pending"),
    PARTIALLY_ASSIGNED: t("status.partiallyAssigned"),
    ASSIGNED: t("status.assigned"),
    SENT: t("status.sent"),
  };

  return (
    <div className="admin-container">
      <h1>{isAdmin ? t("admin.title") : t("admin.projects")}</h1>

      <section className="projects-section">
        <h2>
          <span>🏢</span>
          {t("admin.projects")}
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
              <p>
                <strong>Project Manager:</strong>{" "}
                {project.projectManager?.name || (
                  <span style={{ color: "#dc3545" }}>Not Assigned</span>
                )}
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
              <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                <button
                  onClick={() => setEditingProject(project)}
                  className="edit-btn"
                >
                  Edit Materials
                </button>
                {isAdmin && (
                  <button
                    onClick={() => setAssigningManager(project)}
                    className="edit-btn"
                    style={{ background: "#28a745" }}
                  >
                    Assign Manager
                  </button>
                )}
              </div>
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

      {/* Assign Project Manager Modal */}
      {assigningManager && (
        <div className="edit-modal">
          <div className="modal-content" style={{ maxWidth: "500px" }}>
            <h2>Assign Project Manager</h2>
            <p>
              <strong>Project:</strong> {assigningManager.name}
            </p>
            <p>
              <strong>Current Manager:</strong>{" "}
              {assigningManager.projectManager?.name || "None"}
            </p>

            <div style={{ marginTop: "20px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                }}
              >
                Select Project Manager:
              </label>
              <select
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "4px",
                  border: "1px solid #ddd",
                  fontSize: "1em",
                }}
                defaultValue={assigningManager.projectManager?.id || ""}
                onChange={(e) => {
                  if (e.target.value) {
                    handleAssignManager(
                      assigningManager.id,
                      parseInt(e.target.value)
                    );
                  }
                }}
              >
                <option value="">-- Select Manager --</option>
                {projectManagers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.name} ({manager.mail})
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-actions" style={{ marginTop: "20px" }}>
              <button
                onClick={() => setAssigningManager(null)}
                className="cancel-btn"
              >
                Close
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
                          {/* Group deliveries by status only */}
                          {ALLOWED_STATUSES.map((status) => {
                            const statusDeliveries =
                              projectData.deliveries.filter(
                                (d) => d.status === status
                              );

                            if (statusDeliveries.length === 0) return null;

                            const statusKey = `${projectData.projectId}-${status}`;
                            const isExpanded = expandedStatusGroups[statusKey];
                            const displayLimit = 3;
                            const hasMore =
                              statusDeliveries.length > displayLimit;
                            const deliveriesToShow =
                              isExpanded || !hasMore
                                ? statusDeliveries
                                : statusDeliveries.slice(0, displayLimit);

                            return (
                              <div
                                key={statusKey}
                                className="status-group-section"
                              >
                                <div className="status-group-header">
                                  <span className={`status-badge ${status}`}>
                                    {statusLabels[status]} (
                                    {statusDeliveries.length})
                                  </span>
                                </div>

                                <div className="delivery-cards-grid">
                                  {deliveriesToShow.map((delivery) => {
                                    const material =
                                      delivery.materialRequest?.material;
                                    const materialName =
                                      material?.name || "Unknown Material";

                                    return (
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
                                            <span className="label">
                                              Material:
                                            </span>
                                            <span className="value">
                                              {materialName}
                                            </span>
                                          </div>
                                          <div className="info-row">
                                            <span className="label">
                                              Driver:
                                            </span>
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
                                              {formatDate(
                                                delivery.deliveryDate
                                              )}
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
                                    );
                                  })}
                                </div>

                                {hasMore && (
                                  <button
                                    onClick={() =>
                                      toggleStatusGroup(
                                        projectData.projectId,
                                        status
                                      )
                                    }
                                    className="show-more-btn"
                                  >
                                    {isExpanded ? (
                                      <>
                                        <span>Show Less</span>
                                        <span>▲</span>
                                      </>
                                    ) : (
                                      <>
                                        <span>
                                          Show{" "}
                                          {statusDeliveries.length -
                                            displayLimit}{" "}
                                          More
                                        </span>
                                        <span>▼</span>
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            );
                          })}
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
            // Debug: Log first request to see structure
            if (requests.length > 0) {
              console.log("First request structure:", requests[0]);
            }

            // Group and aggregate materials by project
            const groupedMaterials = requests.reduce((acc, request) => {
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
                  materials: {},
                };
              }

              // Aggregate material quantities
              const material = request.material;
              const quantity =
                request.quantity || request.requestedQuantity || 0;

              console.log(
                `Processing request: material=${material?.name}, quantity=${quantity}`
              );

              if (material) {
                const matKey = material.id;
                if (!acc[projectKey].materials[matKey]) {
                  acc[projectKey].materials[matKey] = {
                    id: material.id,
                    name: material.name,
                    unit: material.unit,
                    totalQuantity: 0,
                  };
                }
                acc[projectKey].materials[matKey].totalQuantity += quantity;
              }

              return acc;
            }, {});

            return (
              <div className="project-requests-container">
                {Object.entries(groupedMaterials).map(
                  ([projectKey, projectData]) => {
                    const isCollapsed =
                      collapsedRequestProjects[projectData.projectId];
                    const materialsArray = Object.values(projectData.materials);

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
                            {materialsArray.length}{" "}
                            {materialsArray.length === 1
                              ? "material"
                              : "materials"}
                          </span>
                        </div>

                        {!isCollapsed && (
                          <div className="request-table-container">
                            <table className="material-table">
                              <thead>
                                <tr>
                                  <th style={{ textAlign: "left" }}>
                                    Material Name
                                  </th>
                                  <th style={{ width: "100px" }}>Quantity</th>
                                  <th style={{ width: "100px" }}>Unit</th>
                                </tr>
                              </thead>
                              <tbody>
                                {materialsArray.map((mat) => (
                                  <tr key={mat.id}>
                                    <td>{mat.name}</td>
                                    <td>{mat.totalQuantity}</td>
                                    <td>{mat.unit || "N/A"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
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

      {isAdmin && (
        <section className="upload-section">
          <h2>
            <span>📤</span>Upload Excel File
          </h2>
          <ExcelUpload />
        </section>
      )}
    </div>
  );
};

export default AdminPage;
