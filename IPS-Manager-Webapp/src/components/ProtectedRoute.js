import React from "react";
import { Navigate } from "react-router-dom";

function ProtectedRoute({ allowedRoles, children }) {
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");

  // Collect all roles for the current user (multi-role support)
  let userRoles = [];
  try {
    const rolesStr =
      localStorage.getItem("roles") || sessionStorage.getItem("roles");
    if (rolesStr) {
      const parsed = JSON.parse(rolesStr);
      if (Array.isArray(parsed)) userRoles = parsed.map((r) => r.toLowerCase());
    }
  } catch {}

  // Fall back to single role string
  if (userRoles.length === 0) {
    const role = localStorage.getItem("role") || sessionStorage.getItem("role");
    if (role) userRoles = [role.toLowerCase()];
  }

  // No token or no roles → go to login
  if (!token || userRoles.length === 0) {
    return <Navigate to="/" replace />;
  }

  // Check if any of the user's roles is permitted
  const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase());
  const permitted = userRoles.some((r) => normalizedAllowed.includes(r));

  if (!permitted) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <h2>Access Denied</h2>
        <p>You don't have permission to view this page.</p>
        <button onClick={() => {
          localStorage.clear();
          sessionStorage.clear();
          window.location.href = "/";
        }}>
          Log out
        </button>
      </div>
    );
  }

  return children;
}

export default ProtectedRoute;
