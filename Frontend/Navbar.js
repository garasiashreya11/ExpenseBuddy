import React from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import "./Navbar.css";
import { clearToken, getToken } from "../api";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = !!getToken();
  const isHome = location.pathname === "/home" || location.pathname === "/";

  const signOut = () => {
    localStorage.removeItem("currentUser");
    clearToken();
    navigate("/auth");
  };

  return (
    <header className="nav-header">
      <div className="nav-logo" onClick={() => navigate("/home")} style={{cursor: "pointer"}}>
        <span className="logo-mark" aria-hidden="true"><i className="fas fa-dollar-sign" /></span>
        <span className="brand-text">ExpenseBuddy</span>
      </div>
      <nav className="nav-links">
        <NavLink to="/home" className={({ isActive }) => (isActive ? "active" : "")}>
          <i className="fas fa-home"></i> Home
        </NavLink>
        {!isHome && (
          <>
            <NavLink to="/dashboard" className={({ isActive }) => (isActive ? "active" : "")}>
              <i className="fas fa-chart-line"></i> Dashboard
            </NavLink>
            <NavLink to="/add-expense" className={({ isActive }) => (isActive ? "active" : "")}>
              <i className="fas fa-plus"></i> Add Expense
            </NavLink>
            <NavLink to="/splits" className={({ isActive }) => (isActive ? "active" : "")}>
              <i className="fas fa-people-group"></i> Splits
            </NavLink>
            <NavLink to="/history" className={({ isActive }) => (isActive ? "active" : "")}>
              <i className="fas fa-clock-rotate-left"></i> History
            </NavLink>
            <NavLink to="/settings" className={({ isActive }) => (isActive ? "active" : "")}>
              <i className="fas fa-gear"></i> Settings
            </NavLink>
          </>
        )}
        {isAuthenticated && (
          <button className="signout-btn" onClick={signOut} title="Sign Out">
            <i className="fas fa-right-from-bracket" style={{ marginRight: 6 }}></i>
            Sign Out
          </button>
        )}
      </nav>
    </header>
  );
};

export default Navbar;
