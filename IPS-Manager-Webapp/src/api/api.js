// Determine API base URL from env with safe fallbacks
// - Dev (CRA): REACT_APP_API_BASE defaults to http://localhost:8080
// - Prod (via Nginx): use "/api" so calls are same-origin and proxied
// Support both REACT_APP_API_BASE and legacy REACT_APP_API_BASE_URL
const ENV_BASE =
  process.env.REACT_APP_API_BASE || process.env.REACT_APP_API_BASE_URL;
export const API_BASE =
  ENV_BASE && ENV_BASE.trim().length > 0
    ? ENV_BASE
    : process.env.NODE_ENV === "development"
    ? "http://localhost:8080"
    : "/api";

// ✅ Helper function to include JWT automatically
export async function authFetch(url, options = {}) {
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${url}`, { ...options, headers });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!res.ok) {
    throw new Error(data || "Request failed");
  }

  return data;
}

// AUTH -----------------------------------

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mail: email, password }),
  });
  if (!res.ok) throw new Error("Login failed");
  return res.json();
}

export function logout() {
  localStorage.clear();
  sessionStorage.clear();
  window.location.href = "/login";
}

export async function forgotPassword(email) {
  const res = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mail: email }),
  });
  if (!res.ok) throw new Error("Request failed");
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function resetPassword(token, newPassword) {
  const res = await fetch(`${API_BASE}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, newPassword }),
  });
  if (!res.ok) throw new Error("Request failed");
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function getUsers() {
  return authFetch("/auth/users", { method: "GET" });
}

export async function getDrivers() {
  return authFetch("/auth/drivers/all", { method: "GET" });
}

// PROJECTS -----------------------------------

export async function addProject(project) {
  return authFetch("/projects/add", {
    method: "POST",
    body: JSON.stringify(project),
  });
}

export async function addProjects(projects) {
  return authFetch("/projects/addAll", {
    method: "POST",
    body: JSON.stringify(projects),
  });
}

export async function getProjects() {
  return authFetch("/projects/all", { method: "GET" });
}

export async function addProjectWithMaterials(request) {
  return authFetch("/projects/with-materials", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function getMaterialsByProject(projectId) {
  return authFetch(`/projects/${projectId}/materials`, { method: "GET" });
}

export async function useMaterial(projectId, materialId, used) {
  return authFetch(`/projects/${projectId}/materials/use`, {
    method: "PUT",
    body: JSON.stringify({ materialId, used }),
  });
}

// MATERIALS -----------------------------------

export async function getAllMaterials() {
  return authFetch("/materials/all", { method: "GET" });
}

export async function getMaterialById(id) {
  return authFetch(`/materials/${id}`, { method: "GET" });
}

export async function addMaterial(newMaterial) {
  return authFetch("/materials/add", {
    method: "POST",
    body: JSON.stringify(newMaterial),
  });
}

// MATERIAL REQUESTS -----------------------------------

// Worker creates material request
// ✅ Create a new material request
export async function createMaterialRequest(
  projectId,
  materialId,
  requestedQuantity
) {
  return authFetch("/material-requests/request", {
    method: "POST",
    body: JSON.stringify({
      projectId, // Long
      materialId, // String
      requestedQuantity, // int > 0
    }),
  });
}

// Head/Warehouse assigns driver + quantity
export async function assignMaterialRequest(
  requestId,
  driverId,
  assignedQuantity,
  deliveryDate
) {
  return authFetch(`/material-requests/${requestId}/assign`, {
    method: "POST",
    body: JSON.stringify({
      driverId,
      assignedQuantity,
      deliveryDate, // e.g. "2025-09-29"
    }),
  });
}

// Mark as delivered
export async function deliverMaterialRequest(id) {
  return authFetch(`/material-requests/${id}/deliver`, {
    method: "PUT",
  });
}

// Get all material requests
export async function getAllMaterialRequests() {
  return authFetch("/material-requests/all", { method: "GET" });
}

// Get requests for specific project
export async function getAllRequestsForProject(projectId) {
  return authFetch(`/material-requests/project/${projectId}/all`, {
    method: "GET",
  });
}

// Get material request by ID
export async function getMaterialRequestById(id) {
  return authFetch(`/material-requests/${id}`, { method: "GET" });
}

export async function getAllPendingRequests() {
  return authFetch("/material-requests/pending", {
    method: "GET",
  });
}

// DELIVERIES -----------------------------------

export async function createDelivery(deliveryData) {
  return authFetch("/deliveries/create", {
    method: "POST",
    body: JSON.stringify(deliveryData),
  });
}

export async function getDeliveriesByRequest(requestId) {
  return authFetch(`/deliveries/request/${requestId}`, { method: "GET" });
}

export async function getDeliveriesByDriver(driverId) {
  return authFetch(`/deliveries/driver/${driverId}`, { method: "GET" });
}

const ALLOWED_STATUSES = ["PENDING", "PARTIALLY_ASSIGNED", "ASSIGNED", "SENT"];

// Update delivery status
export async function updateDeliveryStatus(assignmentId, status) {
  if (!ALLOWED_STATUSES.includes(status)) {
    throw new Error(
      `Invalid status: ${status}. Allowed: ${ALLOWED_STATUSES.join(", ")}`
    );
  }
  return authFetch(`/deliveries/${assignmentId}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
}
