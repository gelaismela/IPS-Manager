import React from "react";
import { NavLink } from "react-router-dom";
import { logout } from "../api/api";
import NotificationsBell from "./NotificationsBell";
import { getUserRole } from "../services/roleService";
import "../styles/navbar.css";

// Define navigation items per role
const NAV_CONFIG = {
  ADMIN: [
    { path: "/projects", icon: "bx bxs-folder-open", label: "Projects" },
    { path: "/materials", icon: "bx bxs-package", label: "Materials" },
    { path: "/requests", icon: "bx bxs-receipt", label: "Requests" },
    { path: "/deliveries", icon: "bx bxs-truck", label: "Deliveries" },
    { path: "/users", icon: "bx bxs-user-detail", label: "Users" },
    {
      path: "/notification-settings",
      icon: "bx bxs-bell-ring",
      label: "Notifications",
    },
  ],
  HEAD_DRIVER: [
    { path: "/projects", icon: "bx bxs-folder-open", label: "Projects" },
    { path: "/materials", icon: "bx bxs-package", label: "Materials" },
    { path: "/requests", icon: "bx bxs-receipt", label: "Requests" },
    { path: "/deliveries", icon: "bx bxs-truck", label: "Deliveries" },
    {
      path: "/notification-settings",
      icon: "bx bxs-bell-ring",
      label: "Notifications",
    },
  ],
  PROJECT_MANAGER: [
    { path: "/projects", icon: "bx bxs-folder-open", label: "My Projects" },
    { path: "/requests", icon: "bx bxs-receipt", label: "Requests" },
    {
      path: "/notification-settings",
      icon: "bx bxs-bell-ring",
      label: "Notifications",
    },
  ],
  DRIVER: [
    { path: "/deliveries", icon: "bx bxs-truck", label: "My Deliveries" },
    {
      path: "/notification-settings",
      icon: "bx bxs-bell-ring",
      label: "Notifications",
    },
  ],
  WORKER: [
    { path: "/projects", icon: "bx bxs-folder-open", label: "Projects" },
  ],
};

function Navbar() {
  const role = getUserRole();
  const navItems = NAV_CONFIG[role] || NAV_CONFIG.WORKER;

  return (
    <nav className="app-navbar">
      <ul className="nav-links">
        {navItems.map((item) => (
          <li key={item.path}>
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                `nav-link ${isActive ? "active" : ""}`
              }
            >
              <i className={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="nav-actions">
        <NotificationsBell />
        <button onClick={logout} className="logout-btn">
          Log Out
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
