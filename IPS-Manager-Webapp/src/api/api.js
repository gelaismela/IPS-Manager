// Determine API base URL from env with safe fallbacks
// - Dev (CRA): REACT_APP_API_BASE defaults to http://localhost:8080
// - Prod (via Nginx): use "/api" so calls are same-origin and proxied
// Support both REACT_APP_API_BASE and legacy REACT_APP_API_BASE_URL
const isProd = process.env.NODE_ENV === "production";
const envBaseDev =
  process.env.REACT_APP_API_BASE || process.env.REACT_APP_API_BASE_URL;

// Allow a lightweight runtime override for testing without rebuilds
let runtimeOverride = null;
try {
  if (typeof window !== "undefined") {
    runtimeOverride =
      window.__API_BASE || localStorage.getItem("API_BASE_OVERRIDE");
  }
} catch {}

export const API_BASE =
  runtimeOverride && runtimeOverride.trim().length > 0
    ? runtimeOverride
    : isProd
      ? "/api"
      : envBaseDev && envBaseDev.trim().length > 0
        ? envBaseDev
        : "http://localhost:8080";

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
    const error = new Error(
      typeof data === "object" && data?.message
        ? data.message
        : typeof data === "string"
          ? data
          : `Request failed with status ${res.status}`,
    );
    error.status = res.status;
    error.response = data;
    throw error;
  }

  return data;
}

// AUTH -----------------------------------

export async function login(email, password, remember = false) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mail: email, password }),
  });
  if (!res.ok) throw new Error("Login failed");
  const data = await res.json();

  // Store token, role, id, and email based on remember preference
  const storage = remember ? localStorage : sessionStorage;

  if (data.token) {
    storage.setItem("token", data.token);
    // roles is now an array e.g. ["ADMIN", "PROJECT_MANAGER"]
    const rawRoles = Array.isArray(data.roles)
      ? data.roles
      : data.role
        ? [data.role]
        : [];
    const normalizedRoles = rawRoles.map((r) => {
      let role = r.toLowerCase();
      if (role === "head_of_drivers" || role === "head_of_driver") role = "head_driver";
      return role;
    });
    // Priority order for primary role display
    const PRIORITY = ["admin", "project_manager", "head_driver", "driver", "worker"];
    const primaryRole =
      PRIORITY.find((p) => normalizedRoles.includes(p)) ||
      normalizedRoles[0] ||
      "";
    storage.setItem("role", primaryRole);
    storage.setItem("roles", JSON.stringify(normalizedRoles));
    storage.setItem(
      "user",
      JSON.stringify({
        role: primaryRole,
        roles: normalizedRoles,
        email,
        id: data.id,
      }),
    );
    if (data.id) {
      storage.setItem("userId", data.id);
    }
  }

  return data;
}

// Get user info by email
export async function getUserByEmail(email) {
  const users = await authFetch("/auth/users", { method: "GET" });
  return users.find((user) => user.mail === email);
}

// Get current logged-in user profile
export async function getCurrentUser() {
  const userId = localStorage.getItem("userId") || sessionStorage.getItem("userId");
  return authFetch(`/auth/users/${userId}`, { method: "GET" });
}

export function logout() {
  localStorage.clear();
  sessionStorage.clear();
  window.location.href = "/";
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

export async function createUser(userData) {
  return authFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify(userData),
  });
}

export async function updateUser(id, data) {
  return authFetch(`/auth/user/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteUser(id) {
  return authFetch(`/auth/${id}`, { method: "DELETE" });
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

export async function uploadProjectsExcel(file) {
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/excel/upload-projects`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) {
    const error = new Error(
      typeof data === "object" && data?.message ? data.message : typeof data === "string" ? data : `Upload failed with status ${res.status}`
    );
    error.status = res.status;
    throw error;
  }
  return data;
}

export async function getMaterialsByProject(projectId) {
  return authFetch(`/projects/${projectId}/materials`, { method: "GET" });
}

export async function deleteProject(projectId) {
  return authFetch(`/projects/${projectId}`, { method: "DELETE" });
}

export async function useMaterial(projectId, materialId, used) {
  return authFetch(`/projects/${projectId}/materials/use`, {
    method: "PUT",
    body: JSON.stringify({ materialId, used }),
  });
}

export async function addMaterialToProject(projectId, materialId, quantity) {
  return authFetch(`/projects/${projectId}/materials/add`, {
    method: "POST",
    body: JSON.stringify({ materialId, quantity }),
  });
}

export async function removeMaterialFromProject(projectId, materialId) {
  return authFetch(`/projects/${projectId}/materials/${materialId}`, {
    method: "DELETE",
  });
}

export async function updateProjectMaterial(projectId, materialId, quantity) {
  return authFetch(`/projects/${projectId}/materials/${materialId}`, {
    method: "PUT",
    body: JSON.stringify({ quantity }),
  });
}

export async function assignProjectManager(projectId, projectManagerId) {
  return authFetch(`/projects/${projectId}/assign-manager`, {
    method: "PUT",
    body: JSON.stringify({ projectManagerId }),
  });
}

export async function getMyProjects() {
  return authFetch("/projects/my-projects", { method: "GET" });
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

export async function updateMaterial(id, data) {
  return authFetch(`/materials/update`, {
    method: "PUT",
    body: JSON.stringify({ id, ...data }),
  });
}

export async function deleteMaterial(id) {
  return authFetch(`/materials/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function createFailedRequest(payload) {
  return authFetch("/failed-requests/create", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getFailedRequests() {
  return authFetch("/failed-requests/all");
}

export async function acceptFailedRequest(id, overrides = {}) {
  return authFetch(`/failed-requests/${id}/accept`, {
    method: "PUT",
    body: JSON.stringify(overrides),
  });
}

export async function declineFailedRequest(id) {
  return authFetch(`/failed-requests/${id}/decline`, { method: "PUT" });
}

// MATERIAL REQUESTS -----------------------------------

// Worker creates material request
// ✅ Create a new material request
export async function createMaterialRequest(
  projectId,
  materialId,
  requestedQuantity,
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

// Assign driver to a material request (creates a delivery assignment)
export async function assignMaterialRequest(
  requestId,
  driverId,
  assignedQuantity,
  deliveryDate,
) {
  return authFetch(`/material-requests/${requestId}/assign`, {
    method: "POST",
    body: JSON.stringify({
      driverId,
      assignedQuantity,
      deliveryDate,
    }),
  });
}

// Mark as delivered
export async function deliverMaterialRequest(id) {
  return authFetch(`/material-requests/${id}/deliver`, {
    method: "PUT",
  });
}

// Get all pending material requests (for notifications)
export async function getAllMaterialRequests() {
  return authFetch("/material-requests/pending", { method: "GET" });
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

// Get material requests for project manager's projects only
export async function getMyProjectRequests() {
  return authFetch("/material-requests/my-project-requests", {
    method: "GET",
  });
}

// DELIVERIES -----------------------------------

export async function createDelivery({ requestId, driverId, assignedQty, date }) {
  return authFetch(`/material-requests/${requestId}/assign`, {
    method: "POST",
    body: JSON.stringify({ driverId, assignedQuantity: assignedQty, deliveryDate: date }),
  });
}

export async function getDeliveriesByRequest(requestId) {
  return authFetch(`/deliveries/request/${requestId}`, { method: "GET" });
}

export async function getDeliveriesByDriver(driverId) {
  return authFetch(`/deliveries/driver/${driverId}`, { method: "GET" });
}

// Get all historical delivery assignments
export async function getAllDeliveries() {
  return authFetch("/material-requests/all", { method: "GET" });
}

const ALLOWED_STATUSES = ["PENDING", "PARTIALLY_ASSIGNED", "ASSIGNED", "SENT"];

// Update delivery status via query parameter
export async function updateDeliveryStatus(assignmentId, status) {
  if (!ALLOWED_STATUSES.includes(status)) {
    throw new Error(
      `Invalid status: ${status}. Allowed: ${ALLOWED_STATUSES.join(", ")}`,
    );
  }
  return authFetch(`/deliveries/${assignmentId}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

// PHOTOS -----------------------------------

/**
 * Upload a delivery confirmation photo (BLOB stored in DB)
 * @param {number} assignmentId - The delivery assignment ID
 * @param {File} file - The image file to upload
 * @returns {Promise<{ success: boolean, message: string, photoId: number }>}
 */
export async function uploadDeliveryPhoto(assignmentId, file) {
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(
    `${API_BASE}/photos/upload/delivery/${assignmentId}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    },
  );
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) {
    const error = new Error(
      typeof data === "object" && data?.message ? data.message : `Upload failed with status ${res.status}`
    );
    error.status = res.status;
    throw error;
  }
  return data;
}

/**
 * Get the URL to display a stored photo — pass directly to <img src="..."> 
 * @param {number} photoId
 * @returns {string}
 */
export function getPhotoUrl(photoId) {
  return `${API_BASE}/photos/view/${photoId}`;
}

// BATCHES -----------------------------------

/**
 * Create a new dispatch batch (materials selected, no driver yet)
 * @param {number} projectId
 * @param {Array<{materialId, materialName, materialCode, unit, quantity, requestIds}>} materials
 */
export async function createBatch(projectId, materials) {
  return authFetch("/batches", {
    method: "POST",
    body: JSON.stringify({ projectId, materials }),
  });
}

/** Get all batches (pending and assigned) */
export async function getAllBatches() {
  return authFetch("/batches", { method: "GET" });
}

/**
 * Assign a driver and delivery date to an existing batch
 * @param {number} batchId
 * @param {number} driverId
 * @param {string|undefined} deliveryDate  ISO date string or undefined
 */
export async function assignBatch(batchId, driverId, deliveryDate) {
  return authFetch(`/batches/${batchId}/assign`, {
    method: "PUT",
    body: JSON.stringify({ driverId, deliveryDate }),
  });
}

/** Delete / cancel a batch */
export async function deleteBatch(batchId) {
  return authFetch(`/batches/${batchId}`, { method: "DELETE" });
}

/**
 * Fetch photo metadata list for a delivery assignment
 */
export async function getDeliveryPhotos(assignmentId) {
  return authFetch(`/photos/deliveries/${assignmentId}/photos`, { method: "GET" });
}

/**
 * Fetch a photo as an authenticated blob URL (needed because <img> can't send JWT headers)
 */
export async function getPhotoBlob(photoId) {
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");
  const res = await fetch(`${API_BASE}/photos/view/${photoId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Photo load failed: ${res.status}`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

/**
 * Delete a delivery assignment by ID
 */
export async function deleteDelivery(assignmentId) {
  return authFetch(`/deliveries/${assignmentId}`, { method: "DELETE" });
}

// PUSH NOTIFICATIONS -----------------------------------

/**
 * Get VAPID public key for push notifications
 * @returns {Promise<string>} VAPID public key
 */
export async function getVapidPublicKey() {
  return authFetch("/push-notifications/vapid-public-key", {
    method: "GET",
  });
}

/**
 * Subscribe to push notifications
 * @param {Object} subscription - Push subscription object from browser
 * @returns {Promise} Response from server
 */
export async function subscribeToPushNotifications(subscription) {
  return authFetch("/push-notifications/subscribe", {
    method: "POST",
    body: JSON.stringify(subscription),
  });
}

/**
 * Unsubscribe from push notifications
 * @param {string} endpoint - Subscription endpoint to remove
 * @returns {Promise} Response from server
 */
export async function unsubscribeFromPushNotifications(endpoint) {
  return authFetch("/push-notifications/unsubscribe", {
    method: "POST",
    body: JSON.stringify({ endpoint }),
  });
}

/**
 * Send a test notification
 * @returns {Promise} Response from server
 */
export async function sendTestNotification() {
  return authFetch("/push-notifications/test", {
    method: "POST",
  });
}
