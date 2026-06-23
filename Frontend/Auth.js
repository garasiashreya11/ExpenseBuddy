import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Auth.css";
import { signIn as apiSignIn, signUp as apiSignUp, saveToken, getToken } from "./api";
import Modal from "./components/Modal";

function Auth() {
  const [tab, setTab] = useState("signin");
  const [showPassword, setShowPassword] = useState({});
  const [signInLoading, setSignInLoading] = useState(false);
  const [signUpLoading, setSignUpLoading] = useState(false);
  const [modal, setModal] = useState({ open: false, message: "" });
  const navigate = useNavigate();

  // Always show Auth first; do not auto-redirect to Home even if a token exists.

  const togglePassword = (field) => {
    setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;
    if (signInLoading) return;

    console.log('Attempting signin for:', email); // Debug log

    try {
      setSignInLoading(true);
      console.log('Making API call...'); // Debug log
      const res = await apiSignIn({ email, password });
      console.log('API response:', res); // Debug log

      // If signing in as a different user than the one stored locally,
      // reset per-user local data so Dashboard/History start empty.
      const prevUser = localStorage.getItem("currentUser");
      if (!prevUser || prevUser !== email) {
        try {
          localStorage.setItem("expenses", JSON.stringify([]));
          localStorage.setItem("groupExpenses", JSON.stringify([]));
          localStorage.setItem("groupMembers", JSON.stringify(["You"]));
        } catch (_) { /* ignore storage errors */ }
      }

      // Save JWT for authenticated API calls
      saveToken(res.token);
      // Keep currentUser for existing UI routing checks
      localStorage.setItem("currentUser", email);

      // Persist basic user info for Settings auto-fill
      if (res.user) {
        localStorage.setItem("user", JSON.stringify(res.user));
        // Also merge into settings.profile immediately for convenience
        try {
          const existing = JSON.parse(localStorage.getItem("settings")) || { profile: { firstName: "", lastName: "", email: "", phone: "" }, notifications: {}, preferences: { currency: "INR", dateFormat: "MM/DD/YYYY", theme: "light" } };
          const fullName = res.user.name || "";
          const parts = fullName.trim().split(/\s+/);
          const firstName = parts[0] || "";
          const lastName = parts.slice(1).join(" ") || "";
          const merged = {
            ...existing,
            profile: {
              ...existing.profile,
              firstName,
              lastName,
              email: res.user.email || existing.profile.email,
            },
          };
          localStorage.setItem("settings", JSON.stringify(merged));
        } catch (_) { /* ignore */ }
      }

      console.log('Navigating to /home...'); // Debug log
      setModal({ open: true, message: "Sign in successful! Redirecting..." });
      setTimeout(() => {
        navigate("/home");
      }, 1000);
    } catch (err) {
      console.error('Signin error:', err); // Debug log
      setModal({ open: true, message: err.message || "Sign in failed" });
    }
    finally {
      setSignInLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    const name = e.target.name.value;
    const email = e.target.email.value;
    const password = e.target.password.value;
    const confirmPassword = e.target["confirm-password"].value;
    if (signUpLoading) return;

    if (!name) { setModal({ open: true, message: "Name is required" }); return; }
    if (!email.includes("@")) { setModal({ open: true, message: "Invalid email" }); return; }
    if (password.length < 6) { setModal({ open: true, message: "Password must be at least 6 characters" }); return; }
    if (password !== confirmPassword) { setModal({ open: true, message: "Passwords do not match" }); return; }

    try {
      setSignUpLoading(true);
      await apiSignUp({ name, email, password });
      // Do NOT auto-login. Require explicit sign-in next.
      setModal({ open: true, message: "Sign up successful!" });
      setTab("signin");
    } catch (err) {
      setModal({ open: true, message: err.message || "Sign up failed" });
    }
    finally { setSignUpLoading(false); }
  };

  return (
    <div className="auth-page">
      <Modal open={modal.open} message={modal.message} onClose={() => setModal({ open: false, message: "" })} />
      <div className="background-decoration"></div>
      <main className="main-container">
        <section className="form-section">
          <div className="auth-topbar">
            <div className="auth-brand" aria-label="ExpenseBuddy brand">
              <span className="logo-mark" aria-hidden="true">
                <i className="fas fa-dollar-sign" />
              </span>
              <span className="brand-text">ExpenseBuddy</span>
            </div>
            <div className="tabs">
              <button
                className={`tab-button ${tab === "signin" ? "active" : ""}`}
                onClick={() => setTab("signin")}
              >
                Sign In
              </button>
              <button
                className={`tab-button ${tab === "signup" ? "active" : ""}`}
                onClick={() => setTab("signup")}
              >
                Sign Up
              </button>
            </div>
          </div>

          {/* Sign In Form */}
          {tab === "signin" && (
            <div className="form-content active">
              <h1>
                <i className="fas fa-sign-in-alt" style={{ color: "#007bff" }}></i>{" "}
                Sign In
              </h1>
              <p>Welcome back! Please enter your credentials.</p>
              <form onSubmit={handleSignIn}>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" name="email" placeholder="Enter your email" required />
                </div>
                <div className="form-group password-group">
                  <label>Password</label>
                  <div className="input-with-toggle">
                    <input
                      type={showPassword.signin ? "text" : "password"}
                      name="password"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => togglePassword("signin")}
                    >
                      <i className={`fas ${showPassword.signin ? "fa-eye-slash" : "fa-eye"}`}></i>
                    </button>
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={signInLoading}>
                    <i className="fas fa-sign-in-alt"></i> Sign In
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Sign Up Form */}
          {tab === "signup" && (
            <div className="form-content active">
              <h1>
                <i className="fas fa-user-plus" style={{ color: "#007bff" }}></i> Sign Up
              </h1>
              <p>Create a new account to start tracking your expenses.</p>
              <form onSubmit={handleSignUp}>
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" name="name" placeholder="Enter your full name" required />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" name="email" placeholder="Enter your email" required />
                </div>
                <div className="form-group password-group">
                  <label>Password</label>
                  <div className="input-with-toggle">
                    <input
                      type={showPassword.signup ? "text" : "password"}
                      name="password"
                      placeholder="Create a password"
                      required
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => togglePassword("signup")}
                    >
                      <i className={`fas ${showPassword.signup ? "fa-eye-slash" : "fa-eye"}`}></i>
                    </button>
                  </div>
                </div>
                <div className="form-group password-group">
                  <label>Confirm Password</label>
                  <div className="input-with-toggle">
                    <input
                      type={showPassword.confirm ? "text" : "password"}
                      name="confirm-password"
                      placeholder="Confirm your password"
                      required
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => togglePassword("confirm")}
                    >
                      <i className={`fas ${showPassword.confirm ? "fa-eye-slash" : "fa-eye"}`}></i>
                    </button>
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={signUpLoading}>
                    <i className="fas fa-user-plus"></i> Sign Up
                  </button>
                </div>
              </form>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default Auth;
