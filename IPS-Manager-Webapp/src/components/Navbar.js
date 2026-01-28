import React from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "../api/api";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import "../styles/navbar.css";

function Navbar() {
  const navigate = useNavigate();

  return (
    <nav className="app-navbar">
      <Logo />

      <div className="nav-actions">
        <ThemeToggle />
        <button
          onClick={() => navigate("/notification-settings")}
          className="logout-btn"
          title="Notification Settings"
        >
          <i className="bx bx-bell"></i>
        </button>
        <button onClick={logout} className="logout-btn" title="Log Out">
          <i className="bx bx-log-out"></i>
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
