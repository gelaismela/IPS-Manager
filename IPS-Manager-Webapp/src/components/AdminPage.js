import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  getProjects,
  getAllMaterialRequests,
  addMaterialToProject,
  removeMaterialFromProject,
  updateProjectMaterial,
  updateDeliveryStatus,
  getAllDeliveries,
  getAllMaterials,
  getMaterialsByProject,
  getUsers,
  createUser,
  assignProjectManager,
  getMyProjects,
  addMaterial,
  updateMaterial,
  deleteMaterial,
  getFailedRequests,
  acceptFailedRequest,
  declineFailedRequest,
  getDrivers,
} from "../api/api";
import "../styles/adminPage.css";
import ExcelUpload from "./ExcelUpload";
import { useTranslation } from "../hooks/useTranslation";
import { useToast } from "../contexts/ToastContext";

const ALLOWED_STATUSES = ["PENDING", "PARTIALLY_ASSIGNED", "ASSIGNED", "SENT"];

const AdminPage = () => {
  const { t } = useTranslation();
  const showToast = useToast();
  const [confirmModal, setConfirmModal] = useState(null); // { message, onConfirm }
  const [projects, setProjects] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [requests, setRequests] = useState([]);
  const [allMaterials, setAllMaterials] = useState([]); // Available materials from DB
  const [projectManagers, setProjectManagers] = useState([]); // Users with project_manager role
  const [loading, setLoading] = useState(true);
  const [editingProject, setEditingProject] = useState(null);
  const [assigningManager, setAssigningManager] = useState(null); // Project being assigned a manager
  const [collapsedDeliveryProjects, setCollapsedDeliveryProjects] = useState(
    {},
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
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const excelInputRef = useRef(null);

  // Tab navigation
  const [activeTab, setActiveTab] = useState("projects");

  // Materials catalog management
  const [allUsers, setAllUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", mail: "", password: "", role: "project_manager", phone: "" });
  const [addingUser, setAddingUser] = useState(false);
  const [addUserError, setAddUserError] = useState("");
  const [matCatalogSearch, setMatCatalogSearch] = useState("");
  const [editingMaterial, setEditingMaterial] = useState(null); // { id, name, unit } or null
  const [newCatalogMaterial, setNewCatalogMaterial] = useState({
    id: "",
    name: "",
    unit: "",
    quantity: "",
  });
  const [savingMaterial, setSavingMaterial] = useState(false);
  const [catalogLimit, setCatalogLimit] = useState(10);
  const catalogExcelInputRef = useRef(null);

  // Failed requests
  const [failedRequests, setFailedRequests] = useState([]);
  const [failedRequestsLoading, setFailedRequestsLoading] = useState(false);
  const [failedFilter, setFailedFilter] = useState("PENDING");
  const [processingFailedId, setProcessingFailedId] = useState(null);
  // Accept modal
  const [acceptModal, setAcceptModal] = useState(null); // the FailedRequest being accepted
  const [acceptOverride, setAcceptOverride] = useState({ driverId: "", deliveryDate: "" });
  const [expandedFailedRows, setExpandedFailedRows] = useState(new Set());
  const [expandedMatRows, setExpandedMatRows] = useState(new Set());
  const [expandedUserRows, setExpandedUserRows] = useState(new Set());
  const [modalDrivers, setModalDrivers] = useState([]);
  const [modalDriversLoading, setModalDriversLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get user role from localStorage
        const userStr = localStorage.getItem("user");
        const user = userStr ? JSON.parse(userStr) : null;
        const userRole = user?.role?.toLowerCase();

        // Fetch projects based on role
        let projectsData;
        if (
          userRole === "project_manager" ||
          userRole === "project manager" ||
          userRole === "projectmanager"
        ) {
          // Project managers only see their assigned projects
          projectsData = await getMyProjects();
        } else {
          // Admins (dev) see all projects
          projectsData = await getProjects();
        }
        setProjects(projectsData);

        // Fetch all available materials for autocomplete
        const materialsData = await getAllMaterials();
        setAllMaterials(materialsData || []);

        // Fetch all users to get project managers
        try {
          const usersData = await getUsers();
          setAllUsers(usersData || []);
          // Filter only project managers (or keep all users if you want flexibility)
          const managers = usersData.filter(
            (u) => u.role === "project_manager" || u.role === "dev",
          );
          setProjectManagers(managers || []);
        } catch (userErr) {
          console.warn("Could not fetch users:", userErr);
          setProjectManagers([]);
        }

        // Try to fetch deliveries, but handle 403 gracefully
        try {
          const deliveriesData = await getAllDeliveries();
          setDeliveries(deliveriesData || []);
        } catch (deliveryErr) {
          console.warn(
            "Could not fetch deliveries (may need admin permission):",
            deliveryErr,
          );
          setDeliveries([]);
        }

        const requestsData = await getAllMaterialRequests();
        setRequests(requestsData);

        // Fetch failed requests
        try {
          const failedData = await getFailedRequests();
          setFailedRequests(failedData || []);
        } catch (failedErr) {
          console.warn("Could not fetch failed requests:", failedErr);
          setFailedRequests([]);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter projects by search (using project_code and name)
  const trimmedSearch = search.trim().toLowerCase();
  const filteredProjects =
    trimmedSearch === ""
      ? projects.slice(0, 5)
      : projects
          .filter((project) => {
            const code = String(project.projectCode).toLowerCase();
            const name = project.name?.toLowerCase() || "";
            const looksLikeCode = /^\d/.test(trimmedSearch);
            if (looksLikeCode) {
              return (
                code === trimmedSearch ||
                code.startsWith(trimmedSearch + "-") ||
                code === trimmedSearch
              );
            }
            return name.includes(trimmedSearch);
          })
          .slice(0, 20);

  // Filter materials for autocomplete suggestions
  const filteredMaterials = allMaterials.filter(
    (mat) =>
      materialSearch &&
      (mat.name?.toLowerCase().includes(materialSearch.toLowerCase()) ||
        mat.id?.toString().includes(materialSearch)),
  );

  const enrichMaterials = (materials) => {
    return (materials || []).map((mat) => {
      // getMaterialsByProject returns: { id, material: { id, name, unit }, assignedQuantity, quantityUsed }
      // project list returns: { name, quantity, weight } (flat shape)
      const matId = mat.material?.id || mat.materialId || mat.id;
      const matName = mat.material?.name || mat.name || "";
      const matUnit = mat.material?.unit || mat.unit || "";
      // assignedQuantity from API, or quantity from project list
      const matQty = mat.assignedQuantity ?? mat.quantity ?? 0;
      const catalogEntry = !matName
        ? allMaterials.find((m) => m.id === matId)
        : null;
      return {
        id: matId,
        name: matName || catalogEntry?.name || "",
        unit: matUnit || catalogEntry?.unit || "",
        quantity: matQty,
      };
    });
  };

  const handleEditProject = async (project) => {
    const initialMaterials = enrichMaterials(project.materials);
    setEditingProject({ ...project, materials: initialMaterials });
    setLoadingMaterials(true);
    try {
      const materials = await getMaterialsByProject(project.id);
      const enriched = enrichMaterials(materials);
      setEditingProject((prev) =>
        prev ? { ...prev, materials: enriched } : null,
      );
    } catch (err) {
      console.warn(
        "Could not fetch project materials, using existing data:",
        err,
      );
    } finally {
      setLoadingMaterials(false);
    }
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
          Number(value),
        );
      } catch (err) {
        console.error("Failed to update material quantity:", err);
        showToast("Failed to update quantity: " + (err.message || "Unknown error"), "error");
      }
    }
  };

  // ---- Material catalog (Materials tab) handlers ----

  const handleCatalogExcelImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

      // Detect header row — look for a row that contains "კოდი" or "code" in any of the first 3 cells
      let startRow = 0;
      for (let i = 0; i < Math.min(5, rows.length); i++) {
        const cells = rows[i]
          .slice(0, 4)
          .map((c) => String(c || "").toLowerCase());
        if (
          cells.some(
            (c) => c === "კოდი" || c === "code" || c === "№" || c === "#",
          )
        ) {
          startRow = i + 1;
          break;
        }
      }

      // Detect column layout by checking header row
      // Format A: №, კოდი, დასახელება, საზომი ერთეული, ჯამი  → code=col1, name=col2, unit=col3, qty=col4
      // Format B: კოდი, დასახელება, საზომი, ჯამი              → code=col0, name=col1, unit=col2, qty=col3
      const headerRow = startRow > 0 ? rows[startRow - 1] : [];
      const firstCell = String(headerRow[0] || "").toLowerCase();
      const hasRowNum =
        firstCell === "№" ||
        firstCell === "#" ||
        /^\d+$/.test(firstCell) ||
        firstCell === "";
      const codeCol = hasRowNum ? 1 : 0;
      const nameCol = hasRowNum ? 2 : 1;
      const unitCol = hasRowNum ? 3 : 2;
      const qtyCol = hasRowNum ? 4 : 3;

      const dataRows = rows
        .slice(startRow)
        .filter((r) => r[codeCol] && r[nameCol]);
      if (dataRows.length === 0) {
        showToast("No data rows found. Expected columns: №, კოდი, დასახელება, საზომი ერთეული, ჯამი", "warning");
        return;
      }

      let added = 0,
        updated = 0,
        failed = 0;
      const existingIds = new Set(
        allMaterials.map((m) => String(m.id).toLowerCase()),
      );

      for (const row of dataRows) {
        const id = String(row[codeCol]).trim();
        const name = String(row[nameCol]).trim();
        const unit = String(row[unitCol] || "").trim();
        const quantity = row[qtyCol] !== "" ? Number(row[qtyCol]) : undefined;
        if (!id || !name) continue;

        const payload = {
          id,
          name,
          unit,
          ...(quantity !== undefined && !isNaN(quantity) ? { quantity } : {}),
        };

        try {
          if (existingIds.has(id.toLowerCase())) {
            await updateMaterial(id, {
              name,
              unit,
              ...(quantity !== undefined && !isNaN(quantity)
                ? { quantity }
                : {}),
            });
            updated++;
          } else {
            await addMaterial(payload);
            added++;
          }
        } catch (err) {
          console.error(`Failed for ${id}:`, err);
          failed++;
        }
      }

      const refreshed = await getAllMaterials();
      setAllMaterials(refreshed || []);

      const summary = [`Added: ${added}`, `Updated: ${updated}`];
      if (failed > 0) summary.push(`Failed: ${failed}`);
      showToast(summary.join("  •  "), failed > 0 ? "warning" : "success");
    } catch (err) {
      console.error("Catalog Excel import error:", err);
      showToast("Failed to parse file: " + (err.message || "Unknown error"), "error");
    }
  };

  const handleSaveEditMaterial = async () => {
    if (!editingMaterial) return;
    setSavingMaterial(true);
    try {
      await updateMaterial(editingMaterial.id, {
        name: editingMaterial.name,
        unit: editingMaterial.unit,
        ...(editingMaterial.quantity !== "" &&
        editingMaterial.quantity !== undefined
          ? { quantity: Number(editingMaterial.quantity) }
          : {}),
      });
      const refreshed = await getAllMaterials();
      setAllMaterials(refreshed || []);
      setEditingMaterial(null);
    } catch (err) {
      showToast("Failed to update material: " + (err.message || "Unknown error"), "error");
    } finally {
      setSavingMaterial(false);
    }
  };

  const handleDeleteCatalogMaterial = (id) => {
    setConfirmModal({
      message: "Delete this material from the catalog?",
      onConfirm: async () => {
        try {
          await deleteMaterial(id);
          setAllMaterials((prev) => prev.filter((m) => m.id !== id));
          showToast("Material deleted from catalog.", "success");
        } catch (err) {
          showToast("Failed to delete material: " + (err.message || "Unknown error"), "error");
        }
      },
    });
  };

  const handleAddCatalogMaterial = async () => {
    const { id, name, unit, quantity } = newCatalogMaterial;
    if (!id.trim() || !name.trim()) {
      showToast("Code and name are required.", "warning");
      return;
    }
    setSavingMaterial(true);
    try {
      const payload = {
        id: id.trim(),
        name: name.trim(),
        unit: unit.trim(),
        ...(quantity !== "" && !isNaN(Number(quantity))
          ? { quantity: Number(quantity) }
          : {}),
      };
      await addMaterial(payload);
      const refreshed = await getAllMaterials();
      setAllMaterials(refreshed || []);
      setNewCatalogMaterial({ id: "", name: "", unit: "", quantity: "" });
      showToast("Material added to catalog.", "success");
    } catch (err) {
      showToast("Failed to add material: " + (err.message || "Unknown error"), "error");
    } finally {
      setSavingMaterial(false);
    }
  };

  const handleExcelImport = async (e) => {
    const file = e.target.files[0];
    if (!file || !editingProject?.id) return;
    e.target.value = ""; // reset so same file can be re-selected

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      // Convert to array-of-arrays, skip header row
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

      // Detect header row index (first row where first cell looks like "კოდი" or "Code")
      let startRow = 0;
      for (let i = 0; i < Math.min(5, rows.length); i++) {
        const first = String(rows[i][0] || "").toLowerCase();
        if (first === "კოდი" || first === "code" || first === "კოდი") {
          startRow = i + 1;
          break;
        }
      }

      const dataRows = rows
        .slice(startRow)
        .filter((r) => r[0] && r[3] !== "" && r[3] !== undefined);

      if (dataRows.length === 0) {
        showToast("No data rows found. Make sure the file has columns: კოდი, დასახელება, განზ., საპროექტო", "warning");
        return;
      }

      let added = 0,
        updated = 0,
        notFound = 0;
      const notFoundCodes = [];

      for (const row of dataRows) {
        const code = String(row[0]).trim();
        const qty = Number(row[3]);
        if (!code || isNaN(qty)) continue;

        // Find matching material in catalog by id (code)
        const catalogMat = allMaterials.find(
          (m) => String(m.id).toLowerCase() === code.toLowerCase(),
        );
        if (!catalogMat) {
          notFoundCodes.push(code);
          notFound++;
          continue;
        }

        const alreadyInProject = (editingProject.materials || []).some(
          (m) => String(m.id) === String(catalogMat.id),
        );

        try {
          if (alreadyInProject) {
            await updateProjectMaterial(editingProject.id, catalogMat.id, qty);
            updated++;
          } else {
            await addMaterialToProject(editingProject.id, catalogMat.id, qty);
            if (qty > 0) {
              await updateProjectMaterial(
                editingProject.id,
                catalogMat.id,
                qty,
              );
            }
            added++;
          }
        } catch (err) {
          console.error(`Failed for ${code}:`, err);
          notFoundCodes.push(code + " (error)");
          notFound++;
        }
      }

      // Refresh materials list from server
      const freshMaterials = await getMaterialsByProject(editingProject.id);
      const enriched = enrichMaterials(freshMaterials);
      setEditingProject((prev) =>
        prev ? { ...prev, materials: enriched } : null,
      );

      const summary = [`Added: ${added}`, `Updated: ${updated}`];
      if (notFound > 0)
        summary.push(`Not found (${notFound}): ${notFoundCodes.slice(0, 5).join(", ")}${notFoundCodes.length > 5 ? "..." : ""}`);
      showToast(summary.join("  •  "), notFound > 0 ? "warning" : "success");
    } catch (err) {
      console.error("Excel import error:", err);
      showToast("Failed to parse Excel file: " + (err.message || "Unknown error"), "error");
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
      showToast("Please select a material and enter quantity.", "warning");
      return;
    }

    if (!editingProject.id) {
      showToast("Cannot add materials to unsaved project.", "warning");
      return;
    }

    try {
      // Call backend to add material to project
      await addMaterialToProject(
        editingProject.id,
        newMaterial.id,
        Number(newMaterial.quantity),
      );

      // Backend add endpoint may ignore quantity — explicitly set it
      const qty = Number(newMaterial.quantity);
      if (qty > 0) {
        await updateProjectMaterial(editingProject.id, newMaterial.id, qty);
      }

      // Re-fetch materials from server so assignedQuantity is accurate
      const freshMaterials = await getMaterialsByProject(editingProject.id);
      const enriched = enrichMaterials(freshMaterials);
      setEditingProject((prev) =>
        prev ? { ...prev, materials: enriched } : null,
      );

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
      showToast("Material added to project.", "success");
    } catch (err) {
      console.error("Failed to add material:", err);
      showToast("Failed to add material: " + (err.message || "Unknown error"), "error");
    }
  };

  const handleRemoveMaterial = async (index) => {
    const material = editingProject.materials[index];

    if (!editingProject.id || !material.id) {
      // Just remove from local state if project not saved
      const updatedMaterials = editingProject.materials.filter(
        (_, i) => i !== index,
      );
      setEditingProject({
        ...editingProject,
        materials: updatedMaterials,
      });
      return;
    }

    setConfirmModal({
      message: `Remove ${material.name} from this project?`,
      onConfirm: async () => {
        try {
          await removeMaterialFromProject(editingProject.id, material.id);
          const updatedMaterials = editingProject.materials.filter((_, i) => i !== index);
          setEditingProject({ ...editingProject, materials: updatedMaterials });
          const userStr = localStorage.getItem("user");
          const user = userStr ? JSON.parse(userStr) : null;
          const userRole = user?.role?.toLowerCase();
          const projectsData =
            userRole === "project_manager" || userRole === "project manager" || userRole === "projectmanager"
              ? await getMyProjects() : await getProjects();
          setProjects(projectsData);
          showToast(`${material.name} removed from project.`, "success");
        } catch (err) {
          console.error("Failed to remove material:", err);
          showToast("Failed to remove material: " + (err.message || "Unknown error"), "error");
        }
      },
    });
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
      showToast("Changes saved successfully.", "success");
    } catch (err) {
      console.error("Error refreshing projects:", err);
      showToast("Failed to refresh projects.", "error");
    }
  };

  const handleAssignManager = async (projectId, managerId) => {
    if (!managerId) {
      showToast("Please select a project manager.", "warning");
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
      showToast("Project manager assigned successfully.", "success");
    } catch (err) {
      console.error("Failed to assign project manager:", err);
      showToast("Failed to assign manager: " + (err.message || "Unknown error"), "error");
    }
  };

  const openAcceptModal = async (fr) => {
    setAcceptModal(fr);
    setAcceptOverride({
      driverId: fr.driverId ?? "",
      deliveryDate: fr.deliveryDate ?? "",
    });
    // Lazy-load drivers once
    if (modalDrivers.length === 0) {
      setModalDriversLoading(true);
      try {
        const d = await getDrivers();
        setModalDrivers(d || []);
      } catch (e) {
        console.warn("Could not load drivers", e);
      } finally {
        setModalDriversLoading(false);
      }
    }
  };

  const handleAcceptFailed = async (id) => {
    const frType = acceptModal?.type;
    setProcessingFailedId(id);
    setAcceptModal(null);
    const overrides = {};
    // Driver override only relevant for STOCK_SHORTAGE
    if (frType === "STOCK_SHORTAGE" && acceptOverride.driverId !== "" && acceptOverride.driverId != null)
      overrides.driverId = Number(acceptOverride.driverId);
    if (acceptOverride.deliveryDate)
      overrides.deliveryDate = acceptOverride.deliveryDate;
    try {
      await acceptFailedRequest(id, overrides);
      if (frType === "QUOTA_EXCEEDED") {
        // Forwarded to head driver queue → remove from failed requests table
        setFailedRequests((prev) => prev.filter((fr) => fr.id !== id));
      } else {
        // STOCK_SHORTAGE → mark accepted, stays in the table
        setFailedRequests((prev) =>
          prev.map((fr) => (fr.id === id ? { ...fr, status: "ACCEPTED" } : fr)),
        );
      }
    } catch (err) {
      showToast("Failed to accept request: " + (err.message || "Unknown error"), "error");
    } finally {
      setProcessingFailedId(null);
    }
  };

  const toggleFailedRow = (id) => {
    setExpandedFailedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleMatRow = (id) => {
    setExpandedMatRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleUserRow = (id) => {
    setExpandedUserRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeclineFailed = async (id) => {
    setProcessingFailedId(id);
    try {
      await declineFailedRequest(id);
      setFailedRequests((prev) =>
        prev.map((fr) => (fr.id === id ? { ...fr, status: "DECLINED" } : fr)),
      );
    } catch (err) {
      showToast("Failed to decline request: " + (err.message || "Unknown error"), "error");
    } finally {
      setProcessingFailedId(null);
    }
  };

  const handleDeliveryStatusUpdate = async (deliveryId, newStatus) => {
    if (!ALLOWED_STATUSES.includes(newStatus)) {
      showToast(`Invalid status: ${newStatus}`, "error");
      return;
    }
    try {
      await updateDeliveryStatus(deliveryId, newStatus);
      setDeliveries((prev) =>
        prev.map((d) =>
          d.id === deliveryId ? { ...d, status: newStatus } : d,
        ),
      );
      showToast(`Delivery status updated to ${statusLabels[newStatus]}.`, "success");
    } catch (err) {
      showToast("Failed to update delivery status.", "error");
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

  // Get user role (check both storages — depends on "Remember Me" at login)
  const userStr = localStorage.getItem("user") || sessionStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;

  const isAdmin =
    user?.role?.toLowerCase() === "dev" ||
    user?.role?.toLowerCase() === "admin";

  const statusLabels = {
    PENDING: t("status.pending"),
    PARTIALLY_ASSIGNED: t("status.partiallyAssigned"),
    ASSIGNED: t("status.assigned"),
    SENT: t("status.sent"),
  };

  return (
    <div className="admin-page-wrapper">
      <div className="admin-container-header">
        <h1 className="admin-title">{isAdmin ? t("admin.title") : t("admin.projects")}</h1>
      </div>

      {/* Tab navigation - outside overflow:hidden container so it can scroll independently */}
      <div className="admin-tabs-scroll-wrapper">
        <div className="admin-tabs">
          <button
            className={`admin-tab-btn${activeTab === "projects" ? " active" : ""}`}
            onClick={() => setActiveTab("projects")}
          >
            🏢 Projects
          </button>
          <button
            className={`admin-tab-btn${activeTab === "materials" ? " active" : ""}`}
            onClick={() => setActiveTab("materials")}
          >
            🧱 Materials
          </button>
          <button
            className={`admin-tab-btn${activeTab === "users" ? " active" : ""}`}
            onClick={() => setActiveTab("users")}
          >
            👥 Users
          </button>
          <button
            className={`admin-tab-btn${activeTab === "failed" ? " active" : ""}`}
            onClick={() => setActiveTab("failed")}
          >
            ❌ Failed Requests
          </button>
        </div>
      </div>

      <div className="admin-container">
      {activeTab === "projects" && (
        <>
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
              className="admin-search-input"
            />
            <div className="projects-grid">
              {filteredProjects.map((project) => (
                <div key={project.id} className="project-card">
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
                  <div
                    style={{ display: "flex", gap: "10px", marginTop: "12px" }}
                  >
                    <button
                      onClick={() => handleEditProject(project)}
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
              {filteredProjects.length === 0 && search.trim() !== "" && (
                <p style={{ color: "#6c757d" }}>No projects found.</p>
              )}
            </div>
          </section>

          {editingProject && (
            <div className="edit-modal">
              <div
                className="modal-content"
                style={{ maxWidth: "700px", width: "90%" }}
              >
                <h2>Edit Project: {editingProject.name}</h2>
                <p style={{ color: "#6c757d", marginBottom: "16px" }}>
                  <strong>Project Code:</strong> {editingProject.projectCode}
                </p>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <h3 style={{ margin: 0 }}>
                    Current Materials ({(editingProject.materials || []).length}
                    )
                  </h3>
                  <button
                    className="excel-import-btn"
                    onClick={() => excelInputRef.current?.click()}
                    title="Import materials from Excel file"
                  >
                    📂 Import from Excel
                  </button>
                  <input
                    ref={excelInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    style={{ display: "none" }}
                    onChange={handleExcelImport}
                  />
                </div>
                <div className="current-materials">
                  {loadingMaterials ? (
                    <p
                      style={{
                        color: "#6c757d",
                        fontStyle: "italic",
                        padding: "12px",
                      }}
                    >
                      Loading materials...
                    </p>
                  ) : (editingProject.materials || []).length === 0 ? (
                    <p style={{ color: "#6c757d", padding: "12px" }}>
                      No materials assigned to this project.
                    </p>
                  ) : (
                    <table className="material-edit-table">
                      <thead>
                        <tr>
                          <th style={{ width: "70px" }}>Code</th>
                          <th style={{ textAlign: "left" }}>Name</th>
                          <th style={{ width: "110px" }}>Quantity</th>
                          <th style={{ width: "80px" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(editingProject.materials || []).map((mat, idx) => (
                          <tr key={mat.id || idx}>
                            <td
                              style={{
                                textAlign: "center",
                                color: "#6c757d",
                                fontWeight: 500,
                              }}
                            >
                              {mat.id}
                            </td>
                            <td style={{ fontWeight: 600 }}>
                              {mat.name || "—"}
                            </td>
                            <td>
                              <input
                                type="number"
                                value={mat.quantity}
                                onChange={(e) =>
                                  handleMaterialChange(
                                    idx,
                                    "quantity",
                                    e.target.value,
                                  )
                                }
                                min="0"
                                className="quantity-input"
                              />
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <button
                                onClick={() => handleRemoveMaterial(idx)}
                                className="remove-btn"
                                title="Remove material"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="add-material" style={{ marginTop: "20px" }}>
                  <h3>Add Material from Catalog</h3>
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
                        onBlur={() =>
                          setTimeout(
                            () => setShowMaterialSuggestions(false),
                            200,
                          )
                        }
                      />
                      {showMaterialSuggestions &&
                        filteredMaterials.length > 0 && (
                          <div className="autocomplete-suggestions">
                            {filteredMaterials
                              .filter(
                                (mat) =>
                                  !(editingProject.materials || []).some(
                                    (m) => m.id === mat.id,
                                  ),
                              )
                              .slice(0, 10)
                              .map((mat) => (
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
                            {filteredMaterials.filter(
                              (mat) =>
                                !(editingProject.materials || []).some(
                                  (m) => m.id === mat.id,
                                ),
                            ).length === 0 && (
                              <div
                                className="autocomplete-item"
                                style={{ color: "#6c757d", cursor: "default" }}
                              >
                                All matching materials already added
                              </div>
                            )}
                          </div>
                        )}
                    </div>
                    {newMaterial.id && (
                      <span
                        style={{
                          background: "#e3f2fd",
                          color: "#1976d2",
                          padding: "4px 10px",
                          borderRadius: "12px",
                          fontSize: "0.85em",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {newMaterial.unit || "N/A"}
                      </span>
                    )}
                    <input
                      type="number"
                      placeholder="Qty"
                      value={newMaterial.quantity}
                      onChange={(e) =>
                        setNewMaterial({
                          ...newMaterial,
                          quantity: e.target.value,
                        })
                      }
                      min="1"
                    />
                    <button
                      onClick={handleAddMaterial}
                      className="add-btn"
                      disabled={!newMaterial.id || !newMaterial.quantity}
                    >
                      + Add
                    </button>
                  </div>
                </div>

                <div className="modal-actions">
                  <button
                    onClick={() => {
                      setEditingProject(null);
                      setNewMaterial({
                        id: null,
                        name: "",
                        unit: "",
                        quantity: "",
                      });
                      setMaterialSearch("");
                    }}
                    className="cancel-btn"
                  >
                    Close
                  </button>
                  <button onClick={saveProjectChanges} className="save-btn">
                    Done
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
                          parseInt(e.target.value),
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
              style={{
                fontSize: "0.9em",
                color: "#6c757d",
                marginBottom: "10px",
              }}
            >
              {deliveries.length > 0 ? (
                <>
                  Total deliveries: {deliveries.length} (Sorted by status and
                  date)
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
                    (statusOrder[a.status] || 999) -
                    (statusOrder[b.status] || 999);
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
                    {Object.entries(grouped).map(
                      ([projectKey, projectData]) => {
                        const isCollapsed =
                          collapsedDeliveryProjects[projectData.projectId];

                        return (
                          <div
                            key={projectKey}
                            className="project-delivery-group"
                          >
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
                                  (d) => d.status === "ASSIGNED",
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
                                        (d) => d.status === "ASSIGNED",
                                      ).length
                                    }{" "}
                                    assigned
                                  </span>
                                )}
                                {projectData.deliveries.filter(
                                  (d) => d.status === "SENT",
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
                                        (d) => d.status === "SENT",
                                      ).length
                                    }{" "}
                                    sent
                                  </span>
                                )}
                                {projectData.deliveries.filter(
                                  (d) => d.status === "PENDING",
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
                                        (d) => d.status === "PENDING",
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
                                      (d) => d.status === status,
                                    );

                                  if (statusDeliveries.length === 0)
                                    return null;

                                  const statusKey = `${projectData.projectId}-${status}`;
                                  const isExpanded =
                                    expandedStatusGroups[statusKey];
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
                                        <span
                                          className={`status-badge ${status}`}
                                        >
                                          {statusLabels[status]} (
                                          {statusDeliveries.length})
                                        </span>
                                      </div>

                                      <div className="delivery-cards-grid">
                                        {deliveriesToShow.map((delivery) => {
                                          const material =
                                            delivery.materialRequest?.material;
                                          const materialName =
                                            material?.name ||
                                            "Unknown Material";

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
                                                  {statusLabels[
                                                    delivery.status
                                                  ] || delivery.status}
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
                                                      delivery.assignedDriver
                                                        ?.name ||
                                                      "Not assigned"}
                                                  </span>
                                                </div>
                                                <div className="info-row">
                                                  <span className="label">
                                                    Quantity:
                                                  </span>
                                                  <span className="value">
                                                    {delivery.assignedQuantity ||
                                                      0}{" "}
                                                    units
                                                  </span>
                                                </div>
                                                <div className="info-row">
                                                  <span className="label">
                                                    Delivery Date:
                                                  </span>
                                                  <span className="value">
                                                    {formatDate(
                                                      delivery.deliveryDate,
                                                    )}
                                                  </span>
                                                </div>
                                                <div className="info-row">
                                                  <span className="label">
                                                    Assigned At:
                                                  </span>
                                                  <span className="value">
                                                    {formatDate(
                                                      delivery.assignedAt,
                                                    )}
                                                  </span>
                                                </div>
                                              </div>
                                              {delivery.status ===
                                                "ASSIGNED" && (
                                                <button
                                                  onClick={() =>
                                                    handleDeliveryStatusUpdate(
                                                      delivery.id,
                                                      "SENT",
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
                                              status,
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
                      },
                    )}
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
                    `Processing request: material=${material?.name}, quantity=${quantity}`,
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
                        const materialsArray = Object.values(
                          projectData.materials,
                        );

                        return (
                          <div
                            key={projectKey}
                            className="project-request-group"
                          >
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
                                      <th style={{ width: "100px" }}>
                                        Quantity
                                      </th>
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
                      },
                    )}
                  </div>
                );
              })()
            )}
          </section>
        </>
      )}

      {/* ===== MATERIALS TAB ===== */}
      {activeTab === "materials" && (
        <div className="materials-tab">
          {/* Material Catalog */}
          <section className="projects-section">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "16px",
              }}
            >
              <h2 style={{ margin: 0 }}>
                <span>🧱</span> Material Catalog
              </h2>
              <button
                className="excel-import-btn"
                onClick={() => catalogExcelInputRef.current?.click()}
              >
                📂 Import from Excel
              </button>
              <input
                ref={catalogExcelInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                style={{ display: "none" }}
                onChange={handleCatalogExcelImport}
              />
            </div>

            {/* Add new material */}
            <div className="add-catalog-material-form">
              <input
                type="text"
                placeholder="Code (ID)"
                value={newCatalogMaterial.id}
                onChange={(e) =>
                  setNewCatalogMaterial({
                    ...newCatalogMaterial,
                    id: e.target.value,
                  })
                }
                className="catalog-input"
              />
              <input
                type="text"
                placeholder="Name"
                value={newCatalogMaterial.name}
                onChange={(e) =>
                  setNewCatalogMaterial({
                    ...newCatalogMaterial,
                    name: e.target.value,
                  })
                }
                className="catalog-input catalog-input-wide"
              />
              <input
                type="text"
                placeholder="Unit (ც, გრდ/მ…)"
                value={newCatalogMaterial.unit}
                onChange={(e) =>
                  setNewCatalogMaterial({
                    ...newCatalogMaterial,
                    unit: e.target.value,
                  })
                }
                className="catalog-input"
              />
              <input
                type="number"
                placeholder="Qty"
                value={newCatalogMaterial.quantity}
                onChange={(e) =>
                  setNewCatalogMaterial({
                    ...newCatalogMaterial,
                    quantity: e.target.value,
                  })
                }
                className="catalog-input"
                style={{ width: "90px" }}
                min="0"
              />
              <button
                onClick={handleAddCatalogMaterial}
                disabled={savingMaterial}
                className="add-btn"
              >
                + Add Material
              </button>
            </div>

            {/* Search */}
            <input
              type="text"
              placeholder="Search catalog by code or name…"
              value={matCatalogSearch}
              onChange={(e) => {
                setMatCatalogSearch(e.target.value);
                setCatalogLimit(10);
              }}
              className="admin-search-input"
              style={{ marginBottom: "16px" }}
            />

            <div className="catalog-table-wrap">
              <table className="material-edit-table mat-catalog-table">
                <thead>
                  <tr>
                    <th style={{ width: "140px" }}>Code</th>
                    <th style={{ textAlign: "left" }}>Name</th>
                    <th style={{ width: "90px" }}>Unit</th>
                    <th style={{ width: "90px" }}>Qty</th>
                    <th style={{ width: "100px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const q = matCatalogSearch.toLowerCase();
                    const filtered = allMaterials.filter(
                      (m) =>
                        !q ||
                        String(m.id).toLowerCase().includes(q) ||
                        (m.name || "").toLowerCase().includes(q),
                    );
                    const visible = filtered.slice(0, catalogLimit);
                    const hasMore = filtered.length > catalogLimit;
                    return (
                      <>
                        {visible.map((m) =>
                          editingMaterial?.id === m.id ? (
                            <tr key={m.id} className="editing-row">
                              <td style={{ color: "#6c757d" }}>{m.id}</td>
                              <td>
                                <input
                                  className="quantity-input"
                                  style={{ width: "100%" }}
                                  value={editingMaterial.name}
                                  onChange={(e) =>
                                    setEditingMaterial({
                                      ...editingMaterial,
                                      name: e.target.value,
                                    })
                                  }
                                />
                              </td>
                              <td>
                                <input
                                  className="quantity-input"
                                  style={{ width: "70px" }}
                                  value={editingMaterial.unit}
                                  onChange={(e) =>
                                    setEditingMaterial({
                                      ...editingMaterial,
                                      unit: e.target.value,
                                    })
                                  }
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  className="quantity-input"
                                  style={{ width: "70px" }}
                                  value={editingMaterial.quantity ?? ""}
                                  onChange={(e) =>
                                    setEditingMaterial({
                                      ...editingMaterial,
                                      quantity: e.target.value,
                                    })
                                  }
                                  min="0"
                                />
                              </td>
                              <td
                                style={{
                                  textAlign: "center",
                                  display: "flex",
                                  gap: "4px",
                                  justifyContent: "center",
                                }}
                              >
                                <button
                                  onClick={handleSaveEditMaterial}
                                  disabled={savingMaterial}
                                  className="add-btn"
                                  style={{
                                    padding: "4px 10px",
                                    height: "30px",
                                    fontSize: "0.82em",
                                  }}
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => setEditingMaterial(null)}
                                  className="cancel-btn"
                                  style={{
                                    padding: "4px 10px",
                                    height: "30px",
                                    fontSize: "0.82em",
                                  }}
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ) : (
                            <tr
                              key={m.id}
                              onClick={() => toggleMatRow(m.id)}
                              className={expandedMatRows.has(m.id) ? "mat-expanded" : ""}
                            >
                              <td className="mat-code" data-label="Code" style={{ color: "#6c757d", fontWeight: 500 }}>
                                {m.id}
                              </td>
                              <td className="mat-name" data-label="Name" style={{ fontWeight: 600 }}>{m.name}</td>
                              <td className="mat-unit" data-label="Unit">{m.unit || "—"}</td>
                              <td className="mat-qty" data-label="Qty">{m.quantity ?? "—"}</td>
                              <td
                                className="mat-actions"
                                style={{
                                  textAlign: "center",
                                  display: "flex",
                                  gap: "4px",
                                  justifyContent: "center",
                                }}
                              >
                                <button
                                  className="edit-btn"
                                  style={{
                                    padding: "4px 10px",
                                    fontSize: "0.82em",
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingMaterial({
                                      id: m.id,
                                      name: m.name,
                                      unit: m.unit || "",
                                      quantity: m.quantity ?? "",
                                    });
                                  }}
                                >
                                  ✏️
                                </button>
                                {isAdmin && (
                                  <button
                                    className="remove-btn"
                                    style={{ padding: "4px 10px" }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteCatalogMaterial(m.id);
                                    }}
                                  >
                                    🗑️
                                  </button>
                                )}
                              </td>
                            </tr>
                          ),
                        )}
                        {hasMore && (
                          <tr>
                            <td
                              colSpan="5"
                              style={{ textAlign: "center", padding: "10px" }}
                            >
                              <button
                                className="excel-import-btn"
                                onClick={() => setCatalogLimit((l) => l + 20)}
                              >
                                Show more ({filtered.length - catalogLimit}{" "}
                                remaining)
                              </button>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </section>

        </div>
      )}

      {/* ===== USERS TAB ===== */}
      {activeTab === "failed" && (
        <div className="materials-tab">
          <section className="projects-section">
            <h2>
              <span>❌</span> Failed Requests
            </h2>

            {/* Status filter */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
              {["PENDING", "ACCEPTED", "DECLINED", "ALL"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFailedFilter(f)}
                  style={{
                    padding: "5px 14px",
                    borderRadius: "20px",
                    border: "1.5px solid",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "13px",
                    borderColor:
                      failedFilter === f
                        ? f === "PENDING" ? "#f59e0b" : f === "ACCEPTED" ? "#22c55e" : f === "DECLINED" ? "#ef4444" : "#6366f1"
                        : "#dee2e6",
                    background:
                      failedFilter === f
                        ? f === "PENDING" ? "#fef9c3" : f === "ACCEPTED" ? "#dcfce7" : f === "DECLINED" ? "#fee2e2" : "#e0e7ff"
                        : "transparent",
                    color:
                      failedFilter === f
                        ? f === "PENDING" ? "#92400e" : f === "ACCEPTED" ? "#166534" : f === "DECLINED" ? "#991b1b" : "#3730a3"
                        : "#6c757d",
                  }}
                >
                  {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
                  {" "}
                  <span style={{ opacity: 0.7 }}>
                    ({failedRequests.filter((r) => f === "ALL" || (r.status || "PENDING") === f).length})
                  </span>
                </button>
              ))}
            </div>

            {failedRequestsLoading ? (
              <p>Loading...</p>
            ) : (() => {
              const filtered = failedRequests.filter(
                (r) => failedFilter === "ALL" || (r.status || "PENDING") === failedFilter,
              );
              return filtered.length === 0 ? (
                <p style={{ color: "#6c757d", padding: "16px 0" }}>No {failedFilter === "ALL" ? "" : failedFilter.toLowerCase() + " "}requests found.</p>
              ) : (
                <div className="catalog-table-wrap">
                  <table className="material-edit-table failed-req-table">
                    <thead>
                      <tr>
                        <th style={{ width: "50px" }}>ID</th>
                        <th style={{ width: "130px" }}>Type</th>
                        <th style={{ textAlign: "left" }}>Material</th>
                        <th style={{ width: "100px" }}>Requested Qty</th>
                        <th style={{ width: "100px" }}>Available Qty</th>
                        <th style={{ width: "75px" }}>Driver ID</th>
                        <th style={{ width: "80px" }}>Project ID</th>
                        <th style={{ width: "110px" }}>Delivery Date</th>
                        <th style={{ width: "130px" }}>Created At</th>
                        <th style={{ width: "100px" }}>Status</th>
                        <th style={{ width: "160px" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((fr) => {
                        const frStatus = fr.status || "PENDING";
                        const isPending = frStatus === "PENDING";
                        const isProcessing = processingFailedId === fr.id;
                        return (
                          <tr
                            key={fr.id}
                            onClick={() => toggleFailedRow(fr.id)}
                            className={expandedFailedRows.has(fr.id) ? "fr-expanded" : ""}
                          >
                            <td data-label="ID" style={{ color: "#6c757d" }}>{fr.id}</td>
                            <td className="fr-type" data-label="Type">
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "2px 8px",
                                  borderRadius: "12px",
                                  fontSize: "12px",
                                  fontWeight: 600,
                                  background: fr.type === "STOCK_SHORTAGE" ? "#fff3cd" : "#f8d7da",
                                  color: fr.type === "STOCK_SHORTAGE" ? "#856404" : "#721c24",
                                }}
                              >
                                {fr.type === "STOCK_SHORTAGE" ? "Stock Shortage" : "Quota Exceeded"}
                              </span>
                            </td>
                            <td className="fr-material" data-label="Material" style={{ fontWeight: 500 }}>{fr.materialId || "—"}</td>
                            <td data-label="Requested" style={{ textAlign: "center" }}>{fr.requestedQuantity ?? "—"}</td>
                            <td data-label="Available" style={{ textAlign: "center" }}>{fr.availableQuantity ?? "—"}</td>
                            <td data-label="Driver" style={{ textAlign: "center", color: "#6c757d" }}>{fr.driverId ?? "—"}</td>
                            <td data-label="Project" style={{ textAlign: "center", color: "#6c757d" }}>{fr.projectId ?? "—"}</td>
                            <td data-label="Delivery Date" style={{ color: "#6c757d" }}>{fr.deliveryDate || "—"}</td>
                            <td data-label="Created At" style={{ color: "#6c757d", fontSize: "12px" }}>
                              {fr.createdAt ? new Date(fr.createdAt).toLocaleString() : "—"}
                            </td>
                            <td className="fr-status" data-label="Status">
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "2px 8px",
                                  borderRadius: "12px",
                                  fontSize: "12px",
                                  fontWeight: 600,
                                  background:
                                    frStatus === "ACCEPTED" ? "#dcfce7" :
                                    frStatus === "DECLINED" ? "#fee2e2" : "#fef9c3",
                                  color:
                                    frStatus === "ACCEPTED" ? "#166534" :
                                    frStatus === "DECLINED" ? "#991b1b" : "#92400e",
                                }}
                              >
                                {frStatus.charAt(0) + frStatus.slice(1).toLowerCase()}
                              </span>
                            </td>
                            <td className="fr-action">
                              {isPending ? (
                                <div style={{ display: "flex", gap: "6px" }}>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); openAcceptModal(fr); }}
                                    disabled={isProcessing}
                                    style={{
                                      padding: "4px 10px",
                                      borderRadius: "6px",
                                      border: "none",
                                      background: isProcessing ? "#ccc" : "#22c55e",
                                      color: "#fff",
                                      fontWeight: 600,
                                      fontSize: "12px",
                                      cursor: isProcessing ? "not-allowed" : "pointer",
                                    }}
                                  >
                                    {isProcessing ? "..." : "✔ Accept"}
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeclineFailed(fr.id); }}
                                    disabled={isProcessing}
                                    style={{
                                      padding: "4px 10px",
                                      borderRadius: "6px",
                                      border: "none",
                                      background: isProcessing ? "#ccc" : "#ef4444",
                                      color: "#fff",
                                      fontWeight: 600,
                                      fontSize: "12px",
                                      cursor: isProcessing ? "not-allowed" : "pointer",
                                    }}
                                  >
                                    {isProcessing ? "..." : "✘ Decline"}
                                  </button>
                                </div>
                              ) : (
                                <span style={{ color: "#6c757d", fontSize: "12px" }}>—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </section>
        </div>
      )}

      {activeTab === "users" && (
        <div className="materials-tab">
          <section className="projects-section">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
              <h2 style={{ margin: 0 }}>
                <span>👥</span> Users
              </h2>
              <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                <input
                  type="text"
                  placeholder="Search by name or email…"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  style={{ padding: "6px 12px", borderRadius: "8px", border: "1.5px solid #dee2e6", fontSize: "13px", minWidth: "200px" }}
                />
                <button
                  onClick={() => { setShowAddUserForm((v) => !v); setAddUserError(""); }}
                  style={{ padding: "7px 16px", borderRadius: "8px", border: "none", background: "#6366f1", color: "#fff", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
                >
                  {showAddUserForm ? "✕ Cancel" : "+ Add User"}
                </button>
              </div>
            </div>

            {/* Add User Form */}
            {showAddUserForm && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setAddUserError("");
                  if (!newUser.name.trim() || !newUser.mail.trim() || !newUser.password.trim()) {
                    setAddUserError("Name, email, and password are required.");
                    return;
                  }
                  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                  if (!emailRegex.test(newUser.mail.trim())) {
                    setAddUserError("Please enter a valid email address.");
                    return;
                  }
                  setAddingUser(true);
                  try {
                    await createUser({ ...newUser, mail: newUser.mail.trim(), name: newUser.name.trim(), phone: newUser.phone.trim() || null });
                    const usersData = await getUsers();
                    setAllUsers(usersData || []);
                    setNewUser({ name: "", mail: "", password: "", role: "project_manager", phone: "" });
                    setShowAddUserForm(false);
                  } catch (err) {
                    setAddUserError(err.message || "Failed to create user.");
                  } finally {
                    setAddingUser(false);
                  }
                }}
                style={{ background: "var(--card-bg, #f8f9fa)", border: "1.5px solid #dee2e6", borderRadius: "10px", padding: "20px", marginBottom: "20px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "14px" }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "#495057" }}>Full Name *</label>
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={(e) => setNewUser((u) => ({ ...u, name: e.target.value }))}
                    placeholder="John Doe"
                    required
                    style={{ padding: "7px 10px", borderRadius: "7px", border: "1.5px solid #dee2e6", fontSize: "13px" }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "#495057" }}>Email *</label>
                  <input
                    type="email"
                    value={newUser.mail}
                    onChange={(e) => setNewUser((u) => ({ ...u, mail: e.target.value }))}
                    placeholder="user@example.com"
                    required
                    style={{ padding: "7px 10px", borderRadius: "7px", border: "1.5px solid #dee2e6", fontSize: "13px" }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "#495057" }}>Password *</label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser((u) => ({ ...u, password: e.target.value }))}
                    placeholder="Min. 6 characters"
                    required
                    minLength={6}
                    style={{ padding: "7px 10px", borderRadius: "7px", border: "1.5px solid #dee2e6", fontSize: "13px" }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "#495057" }}>Role *</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser((u) => ({ ...u, role: e.target.value }))}
                    style={{ padding: "7px 10px", borderRadius: "7px", border: "1.5px solid #dee2e6", fontSize: "13px" }}
                  >
                    <option value="project_manager">Project Manager</option>
                    <option value="driver">Driver</option>
                    <option value="head_of_drivers">Head Driver</option>
                    <option value="admin">Admin</option>
                    <option value="dev">Dev</option>
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "#495057" }}>Phone</label>
                  <input
                    type="tel"
                    value={newUser.phone}
                    onChange={(e) => setNewUser((u) => ({ ...u, phone: e.target.value }))}
                    placeholder="+995 555 000 000"
                    style={{ padding: "7px 10px", borderRadius: "7px", border: "1.5px solid #dee2e6", fontSize: "13px" }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: "4px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "transparent", userSelect: "none" }}>Action</label>
                  <button
                    type="submit"
                    disabled={addingUser}
                    style={{ padding: "8px 18px", borderRadius: "7px", border: "none", background: addingUser ? "#a5b4fc" : "#6366f1", color: "#fff", fontWeight: 600, fontSize: "13px", cursor: addingUser ? "not-allowed" : "pointer" }}
                  >
                    {addingUser ? "Creating…" : "Create User"}
                  </button>
                </div>
                {addUserError && (
                  <div style={{ gridColumn: "1 / -1", color: "#dc3545", fontSize: "13px", fontWeight: 500, padding: "6px 10px", background: "#fee2e2", borderRadius: "6px" }}>
                    {addUserError}
                  </div>
                )}
              </form>
            )}

            <div className="catalog-table-wrap">
              <table className="material-edit-table users-table">
                <thead>
                  <tr>
                    <th style={{ width: "50px" }}>ID</th>
                    <th style={{ textAlign: "left" }}>Name</th>
                    <th style={{ textAlign: "left" }}>Email</th>
                    <th style={{ width: "140px" }}>Role</th>
                    <th style={{ width: "120px" }}>Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {allUsers
                    .filter((u) => {
                      const q = userSearch.trim().toLowerCase();
                      if (!q) return true;
                      return (u.name || "").toLowerCase().includes(q) || (u.mail || "").toLowerCase().includes(q);
                    })
                    .map((u) => (
                      <tr
                        key={u.id}
                        onClick={() => toggleUserRow(u.id)}
                        className={expandedUserRows.has(u.id) ? "u-expanded" : ""}
                      >
                        <td className="u-id" data-label="ID" style={{ color: "#6c757d" }}>{u.id}</td>
                        <td className="u-name" data-label="Name" style={{ fontWeight: 600 }}>{u.name}</td>
                        <td className="u-email" data-label="Email">{u.mail}</td>
                        <td className="u-role" data-label="Role">
                          <span
                            className={`role-badge role-${(u.role || "").replace(/_/g, "-")}`}
                          >
                            {u.role || "—"}
                          </span>
                        </td>
                        <td className="u-phone" data-label="Phone">{u.phone || "—"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* Inline Confirm Modal */}
      {confirmModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}
          onClick={() => setConfirmModal(null)}
        >
          <div
            style={{ background: "var(--card-bg, #fff)", borderRadius: "12px", padding: "24px 28px", maxWidth: "380px", width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{ margin: "0 0 20px", fontSize: "15px", fontWeight: 500 }}>{confirmModal.message}</p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmModal(null)} style={{ padding: "8px 18px", borderRadius: "7px", border: "1.5px solid #dee2e6", background: "transparent", cursor: "pointer", fontWeight: 600, fontSize: "13px" }}>Cancel</button>
              <button onClick={() => { setConfirmModal(null); confirmModal.onConfirm(); }} style={{ padding: "8px 18px", borderRadius: "7px", border: "none", background: "#ef4444", color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: "13px" }}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Accept Failed Request Modal */}
      {acceptModal && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
          }}
          onClick={() => setAcceptModal(null)}
        >
          <div
            style={{
              background: "#fff", borderRadius: "12px", padding: "28px",
              minWidth: "360px", maxWidth: "480px", width: "90%",
              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 6px", fontSize: "18px" }}>Accept Failed Request</h3>
            <p style={{ margin: "0 0 20px", color: "#6c757d", fontSize: "13px" }}>
              Material: <strong>{acceptModal.materialId}</strong> &nbsp;|&nbsp;
              Type: <strong>{acceptModal.type === "STOCK_SHORTAGE" ? "Stock Shortage" : "Quota Exceeded"}</strong>
            </p>

            {acceptModal.type === "STOCK_SHORTAGE" && (
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontWeight: 600, marginBottom: "6px", fontSize: "13px" }}>
                  Driver
                </label>
                {modalDriversLoading ? (
                  <p style={{ fontSize: "13px", color: "#6c757d" }}>Loading drivers...</p>
                ) : (
                  <select
                    value={acceptOverride.driverId}
                    onChange={(e) => setAcceptOverride((p) => ({ ...p, driverId: e.target.value }))}
                    style={{
                      width: "100%", padding: "8px 10px", borderRadius: "6px",
                      border: "1.5px solid #dee2e6", fontSize: "14px",
                    }}
                  >
                    <option value="">— Keep original (ID: {acceptModal.driverId ?? "none"}) —</option>
                    {modalDrivers.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {acceptModal.type === "QUOTA_EXCEEDED" && (
              <p style={{ margin: "0 0 16px", padding: "10px 14px", background: "#e0f2fe", borderRadius: "8px", fontSize: "13px", color: "#0369a1" }}>
                ℹ️ Accepting will forward this request to the head driver’s queue as a new delivery request.
              </p>
            )}

            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: "6px", fontSize: "13px" }}>
                Delivery Date
              </label>
              <input
                type="date"
                value={acceptOverride.deliveryDate}
                onChange={(e) => setAcceptOverride((p) => ({ ...p, deliveryDate: e.target.value }))}
                style={{
                  width: "100%", padding: "8px 10px", borderRadius: "6px",
                  border: "1.5px solid #dee2e6", fontSize: "14px", boxSizing: "border-box",
                }}
              />
              <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#6c757d" }}>
                Leave blank to keep original ({acceptModal.deliveryDate || "none"})
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setAcceptModal(null)}
                style={{
                  padding: "8px 18px", borderRadius: "6px", border: "1.5px solid #dee2e6",
                  background: "transparent", cursor: "pointer", fontWeight: 600, fontSize: "14px",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleAcceptFailed(acceptModal.id)}
                style={{
                  padding: "8px 18px", borderRadius: "6px", border: "none",
                  background: "#22c55e", color: "#fff", cursor: "pointer",
                  fontWeight: 600, fontSize: "14px",
                }}
              >
                ✔ Confirm Accept
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default AdminPage;
