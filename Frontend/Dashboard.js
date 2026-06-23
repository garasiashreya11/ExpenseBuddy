import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend, PieController, BarController } from "chart.js";
import Navbar from "./components/Navbar";
import { listExpenses, getToken } from "./api";
import { formatCurrency, formatDate, subscribeSettings, getPreferences } from "./lib/format";
import Modal from "./components/Modal";

// Register required elements and controllers for v4
ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  PieController,
  BarController
);

function Dashboard() {
  const navigate = useNavigate();
  const [modal, setModal] = useState({ open: false, title: "", message: "" });
  const incomeCats = new Set(["Income","Salary","Bonus","Other Income","Interest","Investment","Refund"]);
  const normalizeType = (e) => {
    const t = (e.type || "").toLowerCase();
    if (t === "income" || t === "expense") return t;
    if (incomeCats.has(e.category)) return "income";
    return "expense";
  };
  const normalize = (list) => (list || []).map(e => ({ ...e, amount: Number(e.amount) || 0, type: normalizeType(e) }));
  const [expenses, setExpenses] = useState(normalize(JSON.parse(localStorage.getItem("expenses")) || []));

  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const [prefs, setPrefs] = useState(getPreferences());

  const deleteTx = (id) => {
    const list = JSON.parse(localStorage.getItem("expenses")) || [];
    const next = list.filter(e => e.id !== id);
    localStorage.setItem("expenses", JSON.stringify(next));
    setExpenses(normalize(next));
  };

  const resetToThisMonth = () => {
    const now = new Date();
    setCurrentMonth(now.getMonth());
    setCurrentYear(now.getFullYear());
  };

  const getCurrentMonthExpenses = () => {
    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthEnd = new Date(currentYear, currentMonth + 1, 0);
    return expenses.filter(exp => new Date(exp.date) >= monthStart && new Date(exp.date) <= monthEnd);
  };

  const calculateStats = () => {
    const monthExpenses = getCurrentMonthExpenses();
    const totalExpenses = monthExpenses.filter(e => e.type === "expense").reduce((sum, e) => sum + e.amount, 0);
    const totalIncome = monthExpenses.filter(e => e.type === "income").reduce((sum, e) => sum + e.amount, 0);
    const balance = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? ((balance / totalIncome) * 100).toFixed(1) : 0;

    return { balance, income: totalIncome, expenses: totalExpenses, savingsRate };
  };

  const changeMonth = (direction) => {
    setCurrentMonth(prev => {
      let newMonth = prev + direction;
      if (newMonth < 0) {
        setCurrentYear(y => y - 1);
        return 11;
      } else if (newMonth > 11) {
        setCurrentYear(y => y + 1);
        return 0;
      }
      return newMonth;
    });
  };

  useEffect(() => {
    const reloadFromLocal = () => {
      const raw = JSON.parse(localStorage.getItem("expenses")) || [];
      setExpenses(normalize(raw));
    };

    // Update when localStorage changes in another tab
    window.addEventListener("storage", reloadFromLocal);
    // Update when current tab writes expenses (custom event dispatched by AddExpense)
    window.addEventListener("expenses-updated", reloadFromLocal);

    // On mount, also try to sync from backend if signed in
    const token = getToken();
    if (token) {
      listExpenses().then(serverExpenses => {
        // Normalize to the shape used by the UI and MERGE with local for stability
        const mapped = serverExpenses.map(e => ({
          id: e._id || Date.now(),
          name: e.description,
          subcategory: e.description,
          amount: Number(e.amount) || 0,
          category: e.category,
          description: e.description,
          notes: "",
          date: e.date,
          type: normalizeType(e),
          icon: "fas fa-receipt",
        }));

        const currentLocal = JSON.parse(localStorage.getItem("expenses")) || [];
        const merged = [...currentLocal, ...mapped];
        // De-duplicate by a composite key
        const seen = new Set();
        const deduped = merged.filter(e => {
          const key = `${new Date(e.date).toISOString()}|${e.amount}|${e.category}|${e.description}|${e.type}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        localStorage.setItem("expenses", JSON.stringify(deduped));
        setExpenses(normalize(deduped));
      }).catch(() => {
        // ignore sync errors; keep local
      });
    } else {
      reloadFromLocal();
    }

    return () => {
      window.removeEventListener("storage", reloadFromLocal);
      window.removeEventListener("expenses-updated", reloadFromLocal);
    };
  }, []);

  const stats = calculateStats();
  const monthDisplay = new Date(currentYear, currentMonth).toLocaleString("default", { month: "long" }) + " " + currentYear;

  // Build charts when data/month changes (stable instances to avoid flicker)
  const pieRef = useRef(null);
  const barRef = useRef(null);
  useEffect(() => {
    const monthData = getCurrentMonthExpenses();

    const pieCanvas = document.getElementById("pieChart");
    if (pieCanvas) {
      if (pieRef.current) { pieRef.current.destroy(); pieRef.current = null; }
      const byCat = monthData
        .filter(e => e.type !== "income")
        .reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + (Number(e.amount) || 0); return acc; }, {});
      const labels = Object.keys(byCat);
      const values = Object.values(byCat);
      const colors = ["#60a5fa","#34d399","#f59e0b","#f472b6","#a78bfa","#f87171","#22d3ee"]; // palette
      pieRef.current = new ChartJS(pieCanvas.getContext("2d"), {
        type: "pie",
        data: { labels, datasets: [{ data: values, backgroundColor: labels.map((_, i) => colors[i % colors.length]), radius: '60%' }] },
        options: { responsive: true, plugins: { legend: { position: "bottom" } } }
      });
    }

    const barCanvas = document.getElementById("barChart");
    if (barCanvas) {
      if (barRef.current) { barRef.current.destroy(); barRef.current = null; }
      const months = Array.from({ length: 12 }, (_, m) => m);
      const incomeByM = months.map(m => expenses
        .filter(e => new Date(e.date).getFullYear() === currentYear && new Date(e.date).getMonth() === m && e.type === "income")
        .reduce((s, e) => s + (Number(e.amount) || 0), 0));
      const expenseByM = months.map(m => expenses
        .filter(e => new Date(e.date).getFullYear() === currentYear && new Date(e.date).getMonth() === m && e.type !== "income")
        .reduce((s, e) => s + (Number(e.amount) || 0), 0));
      barRef.current = new ChartJS(barCanvas.getContext("2d"), {
        type: "bar",
        data: {
          labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
          datasets: [
            { label: "Income", data: incomeByM, backgroundColor: "#34d399" },
            { label: "Expenses", data: expenseByM, backgroundColor: "#60a5fa" }
          ]
        },
        options: { responsive: true, plugins: { legend: { position: "bottom" } }, scales: { y: { beginAtZero: true } } }
      });
    }

    return () => {
      if (pieRef.current) { pieRef.current.destroy(); pieRef.current = null; }
      if (barRef.current) { barRef.current.destroy(); barRef.current = null; }
    };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses, currentMonth, currentYear]);

  // Subscribe to settings (currency/date changes)
  useEffect(() => {
    const unsub = subscribeSettings(setPrefs);
    return () => unsub && unsub();
  }, []);

  return (
    <div className="dashboard-page">
      <div className="background-box"></div>
      <Navbar />

      <Modal open={modal.open} title={modal.title} message={modal.message} onClose={() => setModal({ open: false, title: "", message: "" })} />

      <main className="content">

        <div className="month-selector">
          <button className="month-btn" aria-label="Previous month" onClick={() => changeMonth(-1)}>
            <i className="fas fa-chevron-left"></i>
          </button>
          <span className="month-display">{monthDisplay}</span>
          <button className="month-btn" aria-label="Next month" onClick={() => changeMonth(1)}>
            <i className="fas fa-chevron-right"></i>
          </button>
          <button className="this-month" onClick={resetToThisMonth}><i className="fas fa-calendar-day"></i> This Month</button>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <i className="fas fa-wallet"></i>
            <h3>Total Balance</h3>
            <p className="value">{formatCurrency(stats.balance, prefs)}</p>
            <p className="change">+12.5%</p>
          </div>
          <div className="stat-card">
            <i className="fas fa-arrow-up"></i>
            <h3>Monthly Income</h3>
            <p className="value">{formatCurrency(stats.income, prefs)}</p>
            <p className="change">+2.2%</p>
          </div>
          <div className="stat-card">
            <i className="fas fa-arrow-down"></i>
            <h3>Monthly Expenses</h3>
            <p className="value">{formatCurrency(stats.expenses, prefs)}</p>
            <p className="change">-3.1%</p>
          </div>
          <div className="stat-card">
            <i className="fas fa-piggy-bank"></i>
            <h3>Savings Rate</h3>
            <p className="value">{stats.savingsRate}%</p>
            <p className="change">+5.4%</p>
          </div>
        </div>

        <div className="charts-grid">
          <div className="chart-card">
            <h3><i className="fas fa-pie-chart"></i> Expense Breakdown</h3>
            <canvas id="pieChart"></canvas>
          </div>
          <div className="chart-card">
            <h3><i className="fas fa-chart-bar"></i> Monthly Trends</h3>
            <canvas id="barChart"></canvas>
          </div>
        </div>

        <div className="transactions">
          <h3>
            Recent Transactions
            <button className="view-all-btn" onClick={() => setModal({ open: true, title: "Info", message: "View all transactions modal would open here!" })}>View All</button>
          </h3>
          <div className="transactionsList">
            {getCurrentMonthExpenses().slice(-5).reverse().map((exp, i) => {
              const catClass = (exp.category || "other").toLowerCase();
              return (
                <div key={exp.id} className={`transaction-item ${exp.type} cat-${catClass}`} style={{ animationDelay: `${0.1 * i}s` }}>
                  <div className="details">
                    <i className={exp.icon}></i>
                    <span>{exp.subcategory} <small>{new Date(exp.date).toLocaleDateString()}</small></span>
                  </div>
                  <div className="amount actions">
                    <span>{formatCurrency(Number(exp.amount) || 0, prefs)}</span>
                    <button className="icon-btn delete" title="Delete" onClick={() => deleteTx(exp.id)}>
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
