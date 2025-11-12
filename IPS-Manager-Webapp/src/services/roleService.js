/**
 * Get the current user's role from stored auth data.
 * Checks JWT token or user object in localStorage/sessionStorage.
 * @returns {'ADMIN' | 'HEAD_DRIVER' | 'DRIVER' | 'PROJECT_MANAGER' | 'WORKER' | null}
 */
export function getUserRole() {
  try {
    // Check for user object with role
    const userStr =
      localStorage.getItem("user") || sessionStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.role) return user.role.toUpperCase();
    }

    // Decode JWT token if present
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");
    if (token) {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.role) return payload.role.toUpperCase();
      if (payload.authorities) {
        // Spring Security authorities format
        const role = payload.authorities.find((a) => a.startsWith("ROLE_"));
        if (role) return role.replace("ROLE_", "");
      }
    }
  } catch (e) {
    console.warn("Failed to parse user role:", e);
  }
  return null;
}

/**
 * Check if user has one of the specified roles.
 * @param {string[]} roles - Array of role names
 * @returns {boolean}
 */
export function hasRole(roles) {
  const userRole = getUserRole();
  return userRole && roles.map((r) => r.toUpperCase()).includes(userRole);
}
