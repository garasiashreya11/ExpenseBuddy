import React, { useEffect, useState } from "react";
import "./Setting.css";
import {
  FaDollarSign,
  FaCog,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaBell,
  FaSlidersH,
  FaMoneyBillWave,
  FaCalendar,
  FaPalette,
  FaSave,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Modal from "./components/Modal";
import { getPreferences, formatCurrency } from "./lib/format";
import { applyTheme, initThemeFromStorage } from "./theme";
import { getToken, clearToken } from "./api";

const Settings = () => {
  const navigate = useNavigate();
  const [modal, setModal] = useState({ open: false, title: "", message: "" });
  const [settings, setSettings] = useState({
    profile: { firstName: "", lastName: "", email: "", phone: "" },
    notifications: {
      budgetAlerts: false,
      monthlyReports: false,
      unusualSpending: false,
      billReminders: false,
    },
    preferences: { currency: "INR", dateFormat: "MM/DD/YYYY", theme: "light" },
  });

  // Reminder (email/notification) composer state
  const [remTo, setRemTo] = useState("Shreya");
  const [remAmount, setRemAmount] = useState(400);
  const prefs = getPreferences();

  const openReminderPreview = () => {
    const pretty = formatCurrency(Number(remAmount) || 0, prefs);
    const msg = `Don't forget, you owe ${remTo} ${pretty}.`;
    setModal({
      open: true,
      title: "Reminder Preview",
      message: msg,
      // Use Modal children and actions to provide copy/email
    });
  };

  // Pull from Split Bills (local) and prefill reminder with the largest
  // balance where someone owes the current user.
  const fillFromSplits = () => {
    try {
      const groupMembers = JSON.parse(localStorage.getItem("groupMembers")) || [];
      const groupExpenses = JSON.parse(localStorage.getItem("groupExpenses")) || [];
      if (groupMembers.length === 0) {
        setModal({ open: true, title: "No Group", message: "No group members found." });
        return;
      }
      // Determine current user's display name used in Splits
      const userStore = JSON.parse(localStorage.getItem("user") || "null");
      const settingsStore = JSON.parse(localStorage.getItem("settings") || "null");
      const myNamePref = (settingsStore && settingsStore.profile && (settingsStore.profile.firstName || settingsStore.profile.lastName) && `${settingsStore.profile.firstName || ""} ${settingsStore.profile.lastName || ""}`.trim()) || null;
      const myNameUser = (userStore && userStore.name) || null;
      const me = groupMembers.includes("You") ? "You" : (myNamePref || myNameUser || "Me");

      // Compute balances (same approach as SplitBills)
      const members = groupMembers.length ? groupMembers : [me];
      const net = Object.fromEntries(members.map((m) => [m, 0]));
      for (const e of groupExpenses) {
        const total = Number(e.amount) || 0;
        net[e.paidBy] = (net[e.paidBy] || 0) + total;
        members.forEach((m) => {
          net[m] = (net[m] || 0) - Number((e.splits && e.splits[m]) || 0);
        });
      }
      // creditors and debtors
      const creditors = Object.entries(net).filter(([, v]) => v > 0).map(([m, v]) => ({ m, v: Number(v.toFixed(2)) })).sort((a,b)=>b.v-a.v);
      const debtors   = Object.entries(net).filter(([, v]) => v < 0).map(([m, v]) => ({ m, v: Number((-v).toFixed(2)) })).sort((a,b)=>b.v-a.v);
      const pairs = [];
      let i=0,j=0; while(i<creditors.length && j<debtors.length){ const pay = Math.min(creditors[i].v, debtors[j].v); if (pay>0.009) pairs.push({ from: debtors[j].m, to: creditors[i].m, amount: Number(pay.toFixed(2)) }); creditors[i].v-=pay; debtors[j].v-=pay; if (creditors[i].v<0.01) i++; if (debtors[j].v<0.01) j++; }
      const owingMe = pairs.filter(p => p.to === me).sort((a,b)=>b.amount-a.amount);
      if (!owingMe.length) {
        setModal({ open: true, title: "No Dues", message: "No one currently owes you in Splits." });
        return;
      }
      const top = owingMe[0];
      setRemTo(me);
      setRemAmount(top.amount);
      // Immediately show preview
      openReminderPreview();
    } catch (err) {
      setModal({ open: true, title: "Error", message: "Could not read Splits data." });
    }
  };

  useEffect(() => {
    if (!getToken()) {
      navigate("/auth");
    }

    const storedSettings =
      JSON.parse(localStorage.getItem("settings")) || settings;
    setSettings(storedSettings);

    // Initialize theme variables from storage (darkMode flag)
    const isDark = initThemeFromStorage();
    // Keep settings theme in sync for display
    setSettings(prev => ({
      ...prev,
      preferences: { ...prev.preferences, theme: isDark ? "dark" : "light" }
    }));
  }, [navigate]);

  const handleSignOut = () => {
    localStorage.removeItem("currentUser");
    clearToken();
    navigate("/auth");
  };

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    const updated = { ...settings };
    localStorage.setItem("settings", JSON.stringify(updated));
    setModal({ open: true, title: "Saved", message: "Profile updated successfully!" });
    window.dispatchEvent(new Event("settings-changed"));
  };

  const handleNotificationsSubmit = (e) => {
    e.preventDefault();
    localStorage.setItem("settings", JSON.stringify(settings));
    setModal({ open: true, title: "Saved", message: "Notification settings updated successfully!" });
    window.dispatchEvent(new Event("settings-changed"));
  };

  const handlePreferencesSubmit = (e) => {
    e.preventDefault();
    localStorage.setItem("settings", JSON.stringify(settings));
    setModal({ open: true, title: "Saved", message: "Preferences updated successfully!" });
    const isDark = settings.preferences.theme === "dark";
    // Apply CSS variable theme (user's approach)
    applyTheme(isDark);
    localStorage.setItem("darkMode", String(isDark));
    window.dispatchEvent(new Event("settings-changed"));
  };

  return (
    <div className="settings-page">
      <Modal open={modal.open} title={modal.title} message={modal.message}
        icon={<i className="fas fa-dollar-sign" />}
        onClose={() => setModal({ open: false, title: "", message: "" })}
        actions={
          <button
            className="btn btn-primary"
            onClick={() => setModal({ open: false, title: "", message: "" })}
          >OK</button>
        }
      />
      <div className="background-decoration"></div>
      <Navbar />

      <main className="main-container">
        <section className="settings-section">
          {/* Header */}
          <div className="settings-header">
            <h1>
              <FaCog style={{ color: "#007bff" }} /> Account Settings
            </h1>
            <p>Manage your preferences and security settings</p>
          </div>

          {/* Profile Information */}
          <div className="setting-group">
            <h2>
              <FaUser /> Profile Information
            </h2>
            <form onSubmit={handleProfileSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>
                    <FaUser /> First Name
                  </label>
                  <input
                    type="text"
                    value={settings.profile.firstName}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        profile: {
                          ...settings.profile,
                          firstName: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>
                    <FaUser /> Last Name
                  </label>
                  <input
                    type="text"
                    value={settings.profile.lastName}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        profile: {
                          ...settings.profile,
                          lastName: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>
                    <FaEnvelope /> Email Address
                  </label>
                  <input
                    type="email"
                    value={settings.profile.email}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        profile: {
                          ...settings.profile,
                          email: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>
                    <FaPhone /> Phone Number
                  </label>
                  <input
                    type="tel"
                    value={settings.profile.phone}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        profile: {
                          ...settings.profile,
                          phone: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="save-btn">
                  <FaSave /> Save Profile
                </button>
              </div>
            </form>
          </div>

          {/* Notifications */}
          <div className="card settings-card">
            <div className="section-header">
              <h2><FaBell /> Notifications</h2>
            </div>
            <form onSubmit={handleNotificationsSubmit} className="form-grid">
              <div className="form-group">
                <div className="toggle-row">
                  <input id="budgetAlerts" type="checkbox" checked={settings.notifications.budgetAlerts}
                    onChange={(e) => setSettings({ ...settings, notifications: { ...settings.notifications, budgetAlerts: e.target.checked } })} />
                  <label htmlFor="budgetAlerts" className="switch" />
                  <span>Budget Alerts</span>
                </div>
              </div>
              <div className="form-group">
                <div className="toggle-row">
                  <input id="monthlyReports" type="checkbox" checked={settings.notifications.monthlyReports}
                    onChange={(e) => setSettings({ ...settings, notifications: { ...settings.notifications, monthlyReports: e.target.checked } })} />
                  <label htmlFor="monthlyReports" className="switch" />
                  <span>Monthly Reports</span>
                </div>
              </div>
              <div className="form-group">
                <div className="toggle-row">
                  <input id="unusualSpending" type="checkbox" checked={settings.notifications.unusualSpending}
                    onChange={(e) => setSettings({ ...settings, notifications: { ...settings.notifications, unusualSpending: e.target.checked } })} />
                  <label htmlFor="unusualSpending" className="switch" />
                  <span>Unusual Spending</span>
                </div>
              </div>
              <div className="form-group">
                <div className="toggle-row">
                  <input id="billReminders" type="checkbox" checked={settings.notifications.billReminders}
                    onChange={(e) => setSettings({ ...settings, notifications: { ...settings.notifications, billReminders: e.target.checked } })} />
                  <label htmlFor="billReminders" className="switch" />
                  <span>Bill Reminders</span>
                </div>
              </div>
              <div className="form-actions">
                <button className="save-btn" type="submit">
                  <FaSave /> Save Notifications
                </button>
              </div>
            </form>
          </div>

          {/* Preferences */}
          <div className="setting-group">
            <h2>
              <FaSlidersH /> Preferences
            </h2>
            <form onSubmit={handlePreferencesSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>
                    <FaMoneyBillWave /> Currency
                  </label>
                  <select
                    value={settings.preferences.currency}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        preferences: {
                          ...settings.preferences,
                          currency: e.target.value,
                        },
                      })
                    }
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>
                    <FaCalendar /> Date Format
                  </label>
                  <select
                    value={settings.preferences.dateFormat}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        preferences: {
                          ...settings.preferences,
                          dateFormat: e.target.value,
                        },
                      })
                    }
                  >
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>
                    <FaPalette /> Theme
                  </label>
                  <select
                    value={settings.preferences.theme}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        preferences: {
                          ...settings.preferences,
                          theme: e.target.value,
                        },
                      })
                    }
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="save-btn">
                  <FaSave /> Save Preferences
                </button>
              </div>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Settings;
