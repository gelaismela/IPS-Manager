import React from "react";
import { logout } from "../api/api";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import "../styles/navbar.css";

function Navbar() {
  return (
    <nav className="app-navbar">
      <Logo />
      
      <div className="nav-actions">
        <ThemeToggle />
        <button onClick={logout} className="logout-btn" title="Log Out">
          <i className="bx bx-log-out"></i>
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
