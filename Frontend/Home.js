import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";
import Navbar from "./components/Navbar";
import { getToken } from "./api";

function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!getToken()) {
      navigate("/auth");
    }
  }, [navigate]);

  const signOut = () => {
    localStorage.removeItem("currentUser");
    navigate("/auth");
  };

  return (
    <div className="home">
      <div className="background-decoration"></div>
      <Navbar />
      <main className="main-container">
        <section className="dashboard">
          <h1 className="home-title">
            <i className="fas fa-home"></i>
            Welcome to ExpenseBuddy
          </h1>
          <p className="home-desc">
            ExpenseBuddy helps you track personal expenses and incomes, analyze monthly trends,
            manage shared bills with friends, and stay on top of reminders. Use the quick actions
            below to jump straight into the most common tasks.
          </p>

          {/* Quick Actions */}
          <div className="quick-grid">
            <div className="quick-card">
              <div className="title">
                <i className="fas fa-chart-line" style={{color:'#1d4ed8'}}></i>
                <span>View Dashboard</span>
              </div>
              <p className="desc">See totals, trends and charts for this month.</p>
              <button className="primary-btn btn-blue" onClick={() => navigate('/dashboard')}>Open Dashboard</button>
            </div>

            <div className="quick-card">
              <div className="title">
                <i className="fas fa-plus" style={{color:'#16a34a'}}></i>
                <span>Add Expense / Income</span>
              </div>
              <p className="desc">Record a new transaction quickly.</p>
              <button className="primary-btn btn-green" onClick={() => navigate('/add-expense')}>Add Now</button>
            </div>

            <div className="quick-card">
              <div className="title">
                <i className="fas fa-people-group" style={{color:'#0ea5e9'}}></i>
                <span>Split Bills</span>
              </div>
              <p className="desc">Create group expenses and settle balances.</p>
              <button className="primary-btn btn-cyan" onClick={() => navigate('/splits')}>Open Splits</button>
            </div>

            <div className="quick-card">
              <div className="title">
                <i className="fas fa-clock-rotate-left" style={{color:'#9333ea'}}></i>
                <span>History</span>
              </div>
              <p className="desc">Browse and search all your transactions.</p>
              <button className="primary-btn btn-purple" onClick={() => navigate('/history')}>Open History</button>
            </div>

            <div className="quick-card">
              <div className="title">
                <i className="fas fa-gear" style={{color:'#f59e0b'}}></i>
                <span>Settings</span>
              </div>
              <p className="desc">Change currency, date format and theme.</p>
              <button className="primary-btn btn-amber" onClick={() => navigate('/settings')}>Open Settings</button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Home;
