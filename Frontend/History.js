import React, { useEffect, useMemo, useState } from "react";
import "./History.css";
import { FaDollarSign, FaHistory } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import { getToken } from "./api";
import { formatCurrency, formatDate, subscribeSettings, getPreferences } from "./lib/format";

const History = () => {
  const navigate = useNavigate();
  const incomeCats = new Set(["Income","Salary","Bonus","Other Income","Interest","Investment","Refund"]);
  const normalizeType = (e) => {
    const t = (e.type || "").toLowerCase();
    if (t === "income" || t === "expense") return t;
    if (incomeCats.has(e.category)) return "income";
    return "expense";
  };
  const [prefs, setPrefs] = useState(getPreferences());
  const [expenses, setExpenses] = useState([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [period, setPeriod] = useState("All");

  useEffect(() => {
    // ✅ Redirect to Auth if not logged in
    if (!getToken()) {
      navigate("/auth");
    }
  }, [navigate]);

  useEffect(() => {
    // ✅ Load expenses from localStorage and de-duplicate
    const storedExpenses = JSON.parse(localStorage.getItem("expenses")) || [];
    const seen = new Set();
    const deduped = storedExpenses.filter(e => {
      const key = `${new Date(e.date).toISOString()}|${Number(e.amount) || 0}|${e.category}|${e.description}|${(e.type || '').toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    // Normalize types so UI classes apply correctly
    const normalized = deduped.map(e => ({ ...e, type: normalizeType(e) }));
    if (deduped.length !== storedExpenses.length) {
      localStorage.setItem("expenses", JSON.stringify(normalized));
    }
    setExpenses(normalized);
  }, [navigate]);

  // Live-update currency/date formatting when settings change
  useEffect(() => {
    const unsub = subscribeSettings(setPrefs);
    return () => unsub && unsub();
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem("currentUser");
    navigate("/auth");
  };

  const categories = useMemo(() => {
    const set = new Set(expenses.map(e => e.category).filter(Boolean));
    return ["All", ...Array.from(set)];
  }, [expenses]);

  const filtered = useMemo(() => {
    const now = new Date();
    return expenses.filter(e => {
      // search
      const text = `${e.name || e.subcategory || ""} ${e.category || ""}`.toLowerCase();
      if (query && !text.includes(query.toLowerCase())) return false;
      // category
      if (category !== "All" && e.category !== category) return false;
      // period
      const d = new Date(e.date);
      if (period === "Today") {
        const t = new Date();
        if (d.toDateString() !== t.toDateString()) return false;
      } else if (period === "Last 7 Days") {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 6);
        if (d < weekAgo) return false;
      } else if (period === "This Month") {
        if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
      } else if (period === "This Year") {
        if (d.getFullYear() !== now.getFullYear()) return false;
      }
      return true;
    });
  }, [expenses, query, category, period]);

  const fmt = (n) => formatCurrency(n, prefs);

  const deleteTx = (id) => {
    const list = JSON.parse(localStorage.getItem("expenses")) || [];
    const next = list.filter(e => e.id !== id);
    localStorage.setItem("expenses", JSON.stringify(next));
    setExpenses(next);
  };

  const pickIcon = (category, type) => {
    if (type === "income") return "fas fa-money-bill-wave";
    const map = {
      Food: "fas fa-utensils",
      Transport: "fas fa-bus",
      Shopping: "fas fa-bag-shopping",
      Entertainment: "fas fa-tv",
      Health: "fas fa-heartbeat",
      Bills: "fas fa-file-invoice-dollar",
      Groceries: "fas fa-shopping-cart",
    };
    return map[category] || "fas fa-receipt";
  };

  return (
    <div>
      <div className="background-decoration"></div>
      <Navbar />

      <main className="main-container">
        {/* Filters */}
        <section className="card filters">
          <h3 className="section-title"><i className="fas fa-filter"></i> Filters</h3>
          <div className="filters-row">
            <div className="filter-item">
              <i className="fas fa-magnifying-glass"></i>
              <input type="text" placeholder="Search transactions..." value={query} onChange={(e)=>setQuery(e.target.value)} />
            </div>
            <div className="filter-item">
              <select value={category} onChange={(e)=>setCategory(e.target.value)}>
                {categories.map(c => <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>)}
              </select>
            </div>
            <div className="filter-item">
              <select value={period} onChange={(e)=>setPeriod(e.target.value)}>
                {['All','Today','Last 7 Days','This Month','This Year'].map(p => <option key={p} value={p}>{p === 'All' ? 'All Time' : p}</option>)}
              </select>
            </div>
          </div>
        </section>
        <section className="history-section">
          <h1>
            <FaHistory style={{ color: "#007bff" }} /> Transaction History
          </h1>
          <div className="transactions card">
            <h3>
              <span className="section-title"><i className="fas fa-rectangle-list"/> Recent Transactions</span>
            </h3>
            <div className="transactionsList">
              {filtered.length > 0 ? (
                filtered.slice().reverse().map((exp, index) => {
                  const type = exp.type || "expense";
                  const icon = exp.icon || pickIcon(exp.category, type);
                  const amt = Number(exp.amount) || 0;
                  const catClass = (exp.category || "other").toLowerCase();
                  return (
                    <div key={index} className={`transaction-item ${type} cat-${catClass}`}>
                      <div className="details">
                        <i className={icon}></i>
                        <span>
                          {exp.name || exp.subcategory}
                          {" "}
                          <small className="muted">{exp.category} · {formatDate(exp.date, prefs.dateFormat)}</small>
                        </span>
                      </div>
                      <div className="amount actions">
                        <span>{fmt(amt)}</span>
                        <button className="icon-btn delete" title="Delete" onClick={() => deleteTx(exp.id)}>
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="muted" style={{padding:"12px"}}>No transactions recorded yet.</p>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default History;
