import React, { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "./components/Navbar";
import Modal from "./components/Modal";
import { formatCurrency, getPreferences } from "./lib/format";
import "./Home.css"; // reuse the same gradient/background decoration as Home

// Lightweight Tailwind-like utilities for key classes used on this page
import "./tailwind-lite.css";
import "./SplitBills.css";

const defaultMembers = ["You"]; // Seed minimally for new users

export default function SplitBills() {
  const [prefs] = useState(getPreferences());
  const [members, setMembers] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("groupMembers"));
      if (Array.isArray(saved) && saved.length > 0) return saved;
    } catch (_) {}
    localStorage.setItem("groupMembers", JSON.stringify(defaultMembers));
    return defaultMembers;
  });
  const [paidBy, setPaidBy] = useState(() => (members && members[0]) || "You");
  const [newMember, setNewMember] = useState("");
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("equal");
  const [customShares, setCustomShares] = useState({});
  const [expenses, setExpenses] = useState(() => JSON.parse(localStorage.getItem("groupExpenses")) || []);
  const [modal, setModal] = useState({ open: false, title: "", message: "", content: null });
  const manageRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("groupMembers", JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    localStorage.setItem("groupExpenses", JSON.stringify(expenses));
  }, [expenses]);

  const fmt = (n) => formatCurrency(n, prefs);

  const openCustomModal = () => {
    const initial = members.reduce((acc, m) => ({ ...acc, [m]: customShares[m] ?? 0 }), {});
    setCustomShares(initial);
    setModal({
      open: true,
      title: "Custom Split",
      message: "Enter amount per person",
      content: (
        <div className="space-y-3">
          {members.map((m) => (
            <div key={m} className="flex items-center justify-between">
              <label className="text-sm font-medium mr-3 w-40">{m}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input"
                value={customShares[m] ?? 0}
                onChange={(e) => setCustomShares((s) => ({ ...s, [m]: Number(e.target.value) }))}
              />
            </div>
          ))}
          <p className="text-xs text-gray-500">Total must equal {fmt(Number(amount) || 0)}.</p>
        </div>
      ),
    });
  };

  const initials = (name) => (name || "?").split(/\s+/).map(s => s[0]?.toUpperCase()).slice(0,2).join("");

  // Manage Members
  const addMemberToGroup = () => {
    const name = newMember.trim();
    if (!name) return setModal({ open: true, title: "Enter Name", message: "Member name cannot be empty" });
    if (members.includes(name)) return setModal({ open: true, title: "Duplicate", message: "This member already exists" });
    const next = [...members, name];
    setMembers(next);
    if (!paidBy) setPaidBy(name);
    setNewMember("");
  };

  const removeMemberFromGroup = (name) => {
    // Allow removal only if net balance is settled (≈ 0)
    const net = Math.abs(Number(netMap[name] || 0));
    if (net > 0.009) {
      return setModal({ open: true, title: "Cannot Remove", message: `${name} has an outstanding balance of ${fmt(net)}. Settle first.` });
    }
    const next = members.filter(m => m !== name);
    if (next.length === 0) return setModal({ open: true, title: "Keep One", message: "At least one member is required" });
    setMembers(next);
    if (paidBy === name) setPaidBy(next[0]);
    // Keep the user's view anchored on Manage Members
    if (manageRef.current) {
      manageRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const addExpense = () => {
    const total = Number(amount) || 0;
    if (!desc.trim()) return setModal({ open: true, title: "Missing", message: "Please enter description" });
    if (total <= 0) return setModal({ open: true, title: "Invalid", message: "Amount must be greater than 0" });

    let splits = {};
    if (method === "equal") {
      const share = Number((total / members.length).toFixed(2));
      members.forEach((m) => (splits[m] = share));
      // Adjust last member to fix rounding
      const current = Object.values(splits).reduce((s, v) => s + v, 0);
      const diff = Number((total - current).toFixed(2));
      if (diff !== 0) splits[members[members.length - 1]] = Number((splits[members[members.length - 1]] + diff).toFixed(2));
    } else {
      const sum = members.reduce((s, m) => s + (Number(customShares[m]) || 0), 0);
      if (Number(sum.toFixed(2)) !== Number(total.toFixed(2))) {
        return setModal({ open: true, title: "Check Split", message: "Custom shares must add up to total amount" });
      }
      members.forEach((m) => (splits[m] = Number(customShares[m]) || 0));
    }

    const item = {
      id: Date.now(),
      desc: desc.trim(),
      amount: total,
      paidBy,
      method,
      splits,
      createdAt: new Date().toISOString(),
    };
    setExpenses((prev) => [...prev, item]);
    setDesc("");
    setAmount("");
    setMethod("equal");
    setModal({ open: true, title: "Added", message: "Expense added to group" });
  };

  // Compute balances (who owes whom) based on expenses
  const balances = useMemo(() => {
    // net[m] > 0 means others owe m; net[m] < 0 means m owes others
    const net = Object.fromEntries(members.map((m) => [m, 0]));
    for (const e of expenses) {
      const total = Number(e.amount) || 0;
      // Payer paid total; each member owes their share
      net[e.paidBy] += total;
      members.forEach((m) => {
        net[m] -= Number(e.splits[m] || 0);
      });
    }

    // Generate pairwise settlements greedily
    const creditors = Object.entries(net)
      .filter(([, v]) => v > 0)
      .map(([m, v]) => ({ m, v: Number(v.toFixed(2)) }))
      .sort((a, b) => b.v - a.v);
    const debtors = Object.entries(net)
      .filter(([, v]) => v < 0)
      .map(([m, v]) => ({ m, v: Number((-v).toFixed(2)) }))
      .sort((a, b) => b.v - a.v);

    const res = [];
    let i = 0,
      j = 0;
    while (i < creditors.length && j < debtors.length) {
      const pay = Math.min(creditors[i].v, debtors[j].v);
      if (pay > 0.009) {
        res.push({ from: debtors[j].m, to: creditors[i].m, amount: Number(pay.toFixed(2)) });
      }
      creditors[i].v -= pay;
      debtors[j].v -= pay;
      if (creditors[i].v < 0.01) i++;
      if (debtors[j].v < 0.01) j++;
    }
    return res;
  }, [members, expenses]);

  // Net map to determine outstanding balance per member
  const netMap = useMemo(() => {
    const net = Object.fromEntries(members.map((m) => [m, 0]));
    for (const e of expenses) {
      const total = Number(e.amount) || 0;
      net[e.paidBy] += total;
      members.forEach((m) => { net[m] -= Number(e.splits[m] || 0); });
    }
    // Round to 2 decimals to avoid float noise
    Object.keys(net).forEach(k => net[k] = Number(net[k].toFixed(2)));
    return net;
  }, [members, expenses]);

  const markAsPaid = (from, to, amount) => {
    // Apply a compensating entry to neutralize the debt
    const adjustment = {
      id: Date.now(),
      desc: `Settlement: ${from} -> ${to}`,
      amount: amount,
      paidBy: from,
      method: "custom",
      splits: { [to]: amount, ...members.reduce((a, m) => (m !== to ? { ...a, [m]: 0 } : a), {}) },
      createdAt: new Date().toISOString(),
    };
    setExpenses((prev) => [...prev, adjustment]);
  };

  const deleteExpense = (id) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    setModal({ open: true, title: "Removed", message: "Expense removed" });
  };

  const openReminder = (toName, amt) => {
    const msg = `Don't forget, you owe ${toName} ${fmt(amt)}.`;
    setModal({
      open: true,
      title: "Reminder",
      message: msg,
      content: null,
      actions: (
        <>
          <button className="btn btn-primary" onClick={() => { if (navigator.clipboard) navigator.clipboard.writeText(msg); setModal({ open: false, title: "", message: "", content: null, actions: null }); }}>Copy</button>
          <button className="btn btn-secondary" onClick={() => { const subject = encodeURIComponent("Payment Reminder"); const body = encodeURIComponent(msg); window.location.href = `mailto:?subject=${subject}&body=${body}`; }}>Open Email</button>
        </>
      )
    });
  };

  return (
    <div className="home" style={{ minHeight: '100vh', position: 'relative' }}>
      <div className="background-decoration" />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Navbar />

      <Modal open={modal.open} title={modal.title} message={modal.message} onClose={() => setModal({ open: false, title: "", message: "", content: null, actions: null })} actions={modal.actions}>
        {modal.content}
      </Modal>

        <main className="container mx-auto p-4 md:p-6">
        <h1 className="text-2xl md:text-3xl font-bold text-main mb-4">
          <i className="fas fa-people-group" style={{ color: "#1d4ed8", marginRight: 8 }} />
          Split Bills & Shared Expenses
        </h1>

        {/* Manage Members */}
        <section className="card p-4 md:p-5 mb-6" ref={manageRef}>
          <h2 className="text-lg font-semibold text-main mb-3">Manage Members</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Add Member</label>
              <div className="flex items-center gap-2">
                <input className="input" placeholder="e.g., Riya" value={newMember} onChange={(e) => setNewMember(e.target.value)} />
                <button className="btn btn-primary" onClick={addMemberToGroup}>Add</button>
              </div>
            </div>
            <div>
              <label className="label">Current Members</label>
              <div className="space-y-3">
                {members.map((m) => (
                  <div key={m} className="flex items-center justify-between p-3 li-card shadow-sm">
                    <span className="font-medium text-main">{m}</span>
                    <div className="flex items-center gap-2">
                      <button
                        className="btn btn-secondary"
                        title={Math.abs(netMap[m] || 0) > 0.009 ? `Outstanding: ${fmt(Math.abs(netMap[m] || 0))}` : "Remove"}
                        onClick={() => removeMemberFromGroup(m)}
                        disabled={(m === members[0] && members.length === 1) || Math.abs(netMap[m] || 0) > 0.009}
                      >Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* New Expense Card */}
        <section className="card p-4 md:p-5 mb-6">
          <h2 className="text-lg font-semibold text-main mb-3">Create New Expense</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Description</label>
              <input className="input" placeholder="e.g., Dinner" value={desc} onChange={(e) => setDesc(e.target.value)} />
            </div>
            <div>
              <label className="label">Amount</label>
              <input type="number" min="0" step="0.01" className="input" placeholder="e.g., 1200" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <label className="label">Paid By</label>
              <select className="input" value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
                {members.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Split Method</label>
              <div className="flex items-center gap-2">
                <button className={`btn ${method === "equal" ? "btn-primary" : "btn-secondary"}`} onClick={() => setMethod("equal")}>Equal</button>
                <button className={`btn ${method === "custom" ? "btn-primary" : "btn-secondary"}`} onClick={() => { setMethod("custom"); openCustomModal(); }}>Custom</button>
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button className="btn btn-primary" onClick={addExpense}>Add Expense</button>
          </div>
        </section>

        {/* Group Expenses */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-4 md:p-5">
            <h2 className="text-lg font-semibold text-main mb-3">Group Expenses</h2>
            {expenses.length === 0 ? (
              <p className="text-sm text-muted">No group expenses yet.</p>
            ) : (
              <ul className="space-y-3 list-none pl-0">
                {expenses.slice().reverse().map((e) => (
                  <li key={e.id} className={`p-3 rounded-lg bg-surface shadow-sm border border-surface ${e.method === 'equal' ? 'border-l-4 border-green-200' : 'border-l-4 border-blue-200'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-main">{e.desc} <span className="text-muted text-sm">· {new Date(e.createdAt).toLocaleDateString()}</span></p>
                        <p className="text-sm text-muted mt-1">Paid by <span className="font-medium">{e.paidBy}</span> · {fmt(e.amount)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm chip chip-primary">{e.method === 'equal' ? 'Equal' : 'Custom'}</span>
                        <button className="btn btn-secondary" title="Remove" onClick={() => deleteExpense(e.id)}>
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-600">
                      {e.method === 'equal' ? (
                        <p>Split equally: {members.map((m, i) => (<span key={m}>{m}: {fmt(e.splits[m] || 0)}{i < members.length - 1 ? ", " : ""} </span>))}</p>
                      ) : (
                        <p>Custom: {members.map((m, i) => (<span key={m}>{m}: {fmt(e.splits[m] || 0)}{i < members.length - 1 ? ", " : ""} </span>))}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Balances */}
          <div className="card p-4 md:p-5">
            <h2 className="text-lg font-semibold text-main mb-3">Balances</h2>
            {balances.length === 0 ? (
              <p className="text-sm text-muted">All settled up!</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {balances.map((b, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-surface shadow-sm border border-surface flex items-center justify-between">
                    <div>
                      <p className="font-medium text-main">{b.from} owes {b.to}</p>
                      <p className="text-blue-700 text-sm">{fmt(b.amount)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="btn btn-secondary btn-sm" title="Send Reminder" onClick={() => openReminder(b.to, b.amount)}>
                        <i className="fas fa-bell"></i>
                      </button>
                      <button className="btn btn-primary btn-sm" onClick={() => markAsPaid(b.from, b.to, b.amount)}>Mark as Paid</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
        </main>
      </div>
    </div>
  );
}
