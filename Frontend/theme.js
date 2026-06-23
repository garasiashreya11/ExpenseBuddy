// Simple theme helper based on user's requested approach
// Usage: applyTheme(true) for dark, applyTheme(false) for light.
export function applyTheme(dark) {
  const root = document.documentElement;
  const body = document.body;
  
  if (dark) {
    root.style.setProperty("--bg-color", "#121212");
    root.style.setProperty("--text-color", "#ffffff");
    root.style.setProperty("--btn-bg", "#1f1f1f");
    root.style.setProperty("--btn-text", "#ffffff");
    // Extended tokens so components restyle properly in dark
    root.style.setProperty("--card", "#1e1e1e");
    root.style.setProperty("--border", "#2a2a2a");
    root.style.setProperty("--muted", "#a1a1aa");
    root.style.setProperty("--primary", "#3b82f6");
    root.style.setProperty("--success", "#22c55e");
    root.style.setProperty("--danger", "#ef4444");
    root.style.setProperty("--warning", "#f59e0b");
    root.style.setProperty("--ring", "rgba(59,130,246,0.30)");
    body.setAttribute("data-theme", "dark");
  } else {
    root.style.setProperty("--bg-color", "#ffffff");
    root.style.setProperty("--text-color", "#000000");
    root.style.setProperty("--btn-bg", "#e0e0e0");
    root.style.setProperty("--btn-text", "#000000");
    // Light tokens
    root.style.setProperty("--card", "#ffffff");
    root.style.setProperty("--border", "#e5e7eb");
    root.style.setProperty("--muted", "#64748b");
    root.style.setProperty("--primary", "#2563eb");
    root.style.setProperty("--success", "#10b981");
    root.style.setProperty("--danger", "#ef4444");
    root.style.setProperty("--warning", "#f59e0b");
    root.style.setProperty("--ring", "rgba(37,99,235,0.12)");
    body.setAttribute("data-theme", "light");
  }
}

export function initThemeFromStorage() {
  const val = localStorage.getItem('darkMode');
  const dark = val === 'true';
  applyTheme(dark);
  return dark;
}
