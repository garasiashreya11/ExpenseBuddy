import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Auth from './Auth';
import Dashboard from './Dashboard';
import AddExpense from './AddExpense';
import History from './History';
import Settings from './Setting';
import SplitBills from './SplitBills';
import Home from './Home';
import { getToken } from './api';


function App() {
  const isAuthenticated = !!getToken();

  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route
        path="/home"
        element={isAuthenticated ? <Home /> : <Navigate to="/auth" />}
      />
      <Route
        path="/splits"
        element={isAuthenticated ? <SplitBills /> : <Navigate to="/auth" />}
      />
      <Route
        path="/dashboard"
        element={isAuthenticated ? <Dashboard /> : <Navigate to="/auth" />}
      />
      <Route
        path="/add-expense"
        element={isAuthenticated ? <AddExpense /> : <Navigate to="/auth" />}
      />
      <Route
        path="/history"
        element={isAuthenticated ? <History /> : <Navigate to="/auth" />}
      />
      {/* Support both /setting and /settings for safety */}
      <Route
        path="/setting"
        element={isAuthenticated ? <Settings /> : <Navigate to="/auth" />}
      />
      <Route
        path="/settings"
        element={isAuthenticated ? <Settings /> : <Navigate to="/auth" />}
      />
      {/* Default route: always show Auth first */}
      <Route path="/" element={<Navigate to="/auth" />} />
      <Route path="*" element={<Navigate to="/auth" />} />
    </Routes>
  );
}

export default App;
