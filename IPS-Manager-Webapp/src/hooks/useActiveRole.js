import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

// Maps each role to its "home" page
export const ROLE_HOME_MAP = {
  admin: "/admin",
  project_manager: "/projects",
  head_driver: "/deliveryRequests",
  head_of_driver: "/deliveryRequests",
  driver: "/driver-deliveries",
};

// Human-readable labels
export const ROLE_LABELS = {
  admin: "Admin",
  project_manager: "Project Manager",
  head_driver: "Head Driver",
  driver: "Driver",
};

// Icons (boxicons class names) per role
export const ROLE_ICONS = {
  admin: "bx-shield-quarter",
  project_manager: "bx-briefcase",
  head_driver: "bx-car",
  driver: "bx-trip",
};

function getStorage() {
  return localStorage.getItem("token") ? localStorage : sessionStorage;
}

export function getStoredRoles() {
  try {
    const str =
      localStorage.getItem("roles") || sessionStorage.getItem("roles");
    if (str) {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  const role =
    localStorage.getItem("role") || sessionStorage.getItem("role");
  return role ? [role] : [];
}

export function getActiveRole() {
  const storage = getStorage();
  return (
    storage.getItem("activeRole") ||
    localStorage.getItem("role") ||
    sessionStorage.getItem("role") ||
    null
  );
}

export function setStoredActiveRole(role) {
  getStorage().setItem("activeRole", role);
}

export function getHomeForRole(role) {
  return ROLE_HOME_MAP[role?.toLowerCase()] || "/projects";
}

export default function useActiveRole() {
  const navigate = useNavigate();
  const roles = getStoredRoles();
  const [activeRole, setActiveRoleState] = useState(
    () => getActiveRole() || roles[0] || null
  );

  const switchRole = useCallback(
    (role) => {
      setStoredActiveRole(role);
      setActiveRoleState(role);
      navigate(getHomeForRole(role));
    },
    [navigate]
  );

  return { activeRole, roles, switchRole };
}
