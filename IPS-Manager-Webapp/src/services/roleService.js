/**
 * Get all of the current user's roles from stored auth data.
 * @returns {string[]} - Uppercased role names e.g. ['ADMIN', 'PROJECT_MANAGER']
 */
export function getUserRoles() {
  try {
    // Prefer the stored roles array (set by login())
    const rolesStr =
      localStorage.getItem("roles") || sessionStorage.getItem("roles");
    if (rolesStr) {
      const parsed = JSON.parse(rolesStr);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((r) => r.toUpperCase());
      }
    }

    // Fall back to single role string
    const userStr =
      localStorage.getItem("user") || sessionStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      if (Array.isArray(user.roles) && user.roles.length > 0) {
        return user.roles.map((r) => r.toUpperCase());
      }
      if (user.role) return [user.role.toUpperCase()];
    }

    // Decode JWT token as last resort
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");
    if (token) {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.role) return [payload.role.toUpperCase()];
      if (Array.isArray(payload.authorities)) {
        return payload.authorities
          .filter((a) => a.startsWith("ROLE_"))
          .map((a) => a.replace("ROLE_", ""));
      }
    }
  } catch (e) {
    console.warn("Failed to parse user roles:", e);
  }
  return [];
}

/**
 * Get the primary (highest-priority) role for the current user.
 * @returns {'ADMIN' | 'PROJECT_MANAGER' | 'HEAD_DRIVER' | 'DRIVER' | 'WORKER' | null}
 */
export function getUserRole() {
  const roles = getUserRoles();
  if (roles.length === 0) return null;
  const PRIORITY = ["ADMIN", "PROJECT_MANAGER", "HEAD_DRIVER", "DRIVER"];
  return PRIORITY.find((p) => roles.includes(p)) || roles[0];
}

/**
 * Check if user has at least one of the specified roles.
 * @param {string[]} roles - Array of role names to check against
 * @returns {boolean}
 */
export function hasRole(roles) {
  const userRoles = getUserRoles();
  const normalized = roles.map((r) => r.toUpperCase());
  return userRoles.some((r) => normalized.includes(r));
}
