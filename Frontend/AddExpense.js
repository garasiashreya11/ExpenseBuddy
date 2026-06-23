import React, { useEffect, useRef, useState } from "react";
import "./AddExpense.css"; // ✅ Move styles into a CSS file
import Navbar from "./components/Navbar";
import { createExpense, getToken } from "./api";
import Modal from "./components/Modal";

function AddExpense() {
  const [modal, setModal] = useState({ open: false, message: "" });
  const [submitting, setSubmitting] = useState(false);
  const inFlightRef = useRef(false); // must be declared at top-level, not inside useEffect
  useEffect(() => {
    if (!localStorage.getItem("currentUser")) {
      window.location.href = "/auth";
    }

    const expenseForm = document.getElementById("expenseForm");

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (inFlightRef.current || submitting) return; // prevent double submits & double-binding
        inFlightRef.current = true;
        setSubmitting(true);
        const name = document.getElementById("expense-name").value;
        const amount = parseFloat(document.getElementById("expense-amount").value);
        const category = document.getElementById("expense-category").value;
        const description = document.getElementById("expense-desc").value || name;
        const dateStr = document.getElementById("expense-date").value;
        const date = dateStr ? new Date(dateStr).toISOString() : new Date().toISOString();
        const notes = document.getElementById("expense-notes").value;
        const type = document.getElementById("expense-type").value; // income | expense

        const token = getToken();
        if (token) {
          try {
            const created = await createExpense({
              date,
              category,
              description,
              amount: isNaN(amount) ? 0 : amount,
              status: "Paid",
              type: type || "expense",
            });
            // Do NOT push to localStorage here to prevent duplicates when Dashboard syncs with server.
            // Simply notify listeners to refresh from server and navigate.
            window.dispatchEvent(new Event("expenses-updated"));
            setModal({ open: true, message: "Expense saved !" });
            expenseForm.reset();
            setTimeout(() => { window.location.href = "/dashboard"; }, 800);
            inFlightRef.current = false;
            setSubmitting(false);
            return;
          } catch (err) {
            console.error("Failed to save to DB, falling back to local storage:", err);
            setModal({ open: true, message: "Could not reach server. Saved locally." });
          }
        }

        // Fallback: save locally if no token or API failed
        let expenses = JSON.parse(localStorage.getItem("expenses")) || [];
        const icon = pickIcon(category, type);
        expenses.push({
          id: Date.now(),
          name,
          amount: isNaN(amount) ? 0 : amount,
          category,
          description,
          notes,
          date,
          type,
          icon,
        });
        localStorage.setItem("expenses", JSON.stringify(expenses));
        window.dispatchEvent(new Event("expenses-updated"));
        setModal({ open: true, message: "Expense saved locally (not signed in)" });
        expenseForm.reset();
        setTimeout(() => { window.location.href = "/dashboard"; }, 800);
        inFlightRef.current = false;
        setSubmitting(false);
    };

    if (expenseForm) expenseForm.addEventListener("submit", handleSubmit);
    return () => { if (expenseForm) expenseForm.removeEventListener("submit", handleSubmit); };
  }, []);

  const quickCategories = [
    { key: 'Food', label: 'Food & Dining', icon: 'fas fa-utensils', cls: 'food' },
    { key: 'Transport', label: 'Transportation', icon: 'fas fa-car', cls: 'transport' },
    { key: 'Shopping', label: 'Shopping', icon: 'fas fa-shopping-bag', cls: 'shopping' },
    { key: 'Entertainment', label: 'Entertainment', icon: 'fas fa-film', cls: 'entertainment' },
    { key: 'Bills', label: 'Bills & Utilities', icon: 'fas fa-bolt', cls: 'bills' },
    { key: 'Health', label: 'Health & Medical', icon: 'fas fa-user-md', cls: 'health' },
    { key: 'Groceries', label: 'Groceries', icon: 'fas fa-shopping-basket', cls: 'groceries' },
  ];

  const setCategoryQuick = (cat, label) => {
    const sel = document.getElementById('expense-category');
    if (sel) sel.value = cat;
    const nameEl = document.getElementById('expense-name');
    if (nameEl && !nameEl.value) nameEl.value = label;
  };

  function pickIcon(category, type) {
    if (type === "income") return "fas fa-money-bill-wave";
    const map = {
      Food: "fas fa-utensils",
      Transport: "fas fa-car",
      Shopping: "fas fa-shopping-bag",
      Entertainment: "fas fa-film",
      Health: "fas fa-user-md",
      Bills: "fas fa-bolt",
      Groceries: "fas fa-shopping-basket",
    };
    return map[category] || "fas fa-receipt";
  }

  function signOut() {
    localStorage.removeItem("currentUser");
    window.location.href = "/auth";
  }

  return (
    <div>
      {/* Header */}
      <Navbar />

      {/* Modal */}
      <Modal open={modal.open} message={modal.message} onClose={() => setModal({ open: false, message: "" })} />

      {/* Form */}
      <main className="main-container">
        <section className="expense-form">
          <h1 className="section-title">
            <i className="fas fa-indian-rupee-sign" style={{ color: "#007bff" }}></i>{" "}
            Expense Details
          </h1>
          <form id="expenseForm">
            <div className="form-group">
              <label htmlFor="expense-name"><i className="fas fa-receipt"></i> Expense Name</label>
              <input
                type="text"
                id="expense-name"
                name="name"
                placeholder="e.g., Groceries"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="expense-amount"><i className="fas fa-indian-rupee-sign"></i> Amount</label>
              <input
                type="number"
                id="expense-amount"
                name="amount"
                placeholder="e.g., 50"
                step="0.01"
                required
              />
              <div className="quick-amounts" style={{marginTop:'8px'}}>
                {[10,25,50,100].map(v => (
                  <button type="button" key={v} className="btn btn-secondary" onClick={() => {
                    const el = document.getElementById('expense-amount');
                    el.value = (parseFloat(el.value||0) + v).toFixed(2);
                  }}>+₹{v}</button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="expense-category"><i className="fas fa-layer-group"></i> Category</label>
              <select id="expense-category" required defaultValue="">
                <option value="" disabled hidden>Select a category</option>
                <option value="Food">Food & Dining</option>
                <option value="Transport">Transportation</option>
                <option value="Shopping">Shopping</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Health">Health & Medical</option>
                <option value="Bills">Bills & Utilities</option>
                <option value="Groceries">Groceries</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="expense-type"><i className="fas fa-arrows-left-right"></i> Type</label>
              <select id="expense-type" required defaultValue="">
                <option value="" disabled hidden>Select type</option>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="expense-desc"><i className="fas fa-align-left"></i> Description</label>
              <input id="expense-desc" type="text" placeholder="What did you spend on?" />
            </div>
            <div className="form-group">
              <label htmlFor="expense-date"><i className="fas fa-calendar-day"></i> Date</label>
              <input id="expense-date" type="date" defaultValue={new Date().toISOString().substring(0,10)} />
            </div>
            <div className="form-group">
              <label htmlFor="expense-notes"><i className="fas fa-comment-dots"></i> Notes (Optional)</label>
              <textarea id="expense-notes" rows="2" placeholder="Any additional notes..."></textarea>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={() => window.history.back()}>Cancel</button>
              <button type="submit" className="save-btn">
                <i className="fas fa-plus"></i> Add Expense
              </button>
            </div>
          </form>
        </section>

        {/* Quick Categories */}
        <section className="quick-categories card">
          <h3 className="section-title"><i className="fas fa-grid-2"></i> Quick Categories</h3>
          <div className="quick-grid">
            {quickCategories.map(c => (
              <button
                key={c.key}
                type="button"
                className={`cat-card cat-${c.cls}`}
                onClick={() => setCategoryQuick(c.key, c.label)}
                title={c.label}
                aria-label={c.label}
              >
                <span className="icon">
                  <i className={c.icon}></i>
                </span>
                <span className="category-name">{c.key}</span>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default AddExpense;
