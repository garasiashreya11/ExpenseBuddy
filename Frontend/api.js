// Simple API helper that supports both CRA proxy (Option A) and full base URL via .env (Option B)
// If REACT_APP_API_BASE is set, it will use that. Otherwise it will use relative paths so the CRA proxy works.

const BASE = process.env.REACT_APP_API_BASE || ""; // "" lets CRA proxy forward to backend

// Token management (JWT)
const TOKEN_KEY = "auth_token";
export const saveToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

// Generic request helper
export async function apiFetch(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const message = (isJson && data && (data.message || data.error)) || res.statusText;
    throw new Error(message || "Request failed");
  }
  return data;
}

// Auth APIs
export function signUp({ name, email, password }) {
  return apiFetch("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export function signIn({ email, password }) {
  return apiFetch("/api/auth/signin", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

// Expense APIs
export function createExpense(expense) {
  return apiFetch("/api/expenses", {
    method: "POST",
    body: JSON.stringify(expense),
  });
}

export function listExpenses(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const path = qs ? `/api/expenses?${qs}` : "/api/expenses";
  return apiFetch(path, { method: "GET" });
}
