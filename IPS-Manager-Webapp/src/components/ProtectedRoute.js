import React from "react";
import { Navigate } from "react-router-dom";

function ProtectedRoute({ allowedRoles, children }) {
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");
  const role = localStorage.getItem("role") || sessionStorage.getItem("role");

  // No token at all → go to login
  if (!token || !role) {
    return <Navigate to="/" replace />;
  }

  // Has token but wrong role → show access denied (prevents redirect loop)
  if (!allowedRoles.includes(role)) {
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
