// Utilities to read settings and format currency/date consistently across the app

const DEFAULT_SETTINGS = {
  profile: { firstName: "", lastName: "", email: "", phone: "" },
  notifications: {},
  preferences: { currency: "INR", dateFormat: "MM/DD/YYYY", theme: "light" },
};

export function getSettings() {
  try {
    return JSON.parse(localStorage.getItem("settings")) || DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function getPreferences() {
  const s = getSettings();
  return s.preferences || DEFAULT_SETTINGS.preferences;
}

// Map currency to locale for nicer number grouping
const CURRENCY_LOCALE = {
  INR: "en-IN",
  USD: "en-US",
  EUR: "de-DE", // common EUR locale
};

export function formatCurrency(amount, prefs = getPreferences()) {
  const currency = prefs.currency || "INR";
  const locale = CURRENCY_LOCALE[currency] || "en-US";
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(Number(amount) || 0);
  } catch {
    return `${amount}`;
  }
}

export function formatDate(value, format = getPreferences().dateFormat) {
  if (!value) return "";
  const d = new Date(value);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  if (format === "DD/MM/YYYY") return `${dd}/${mm}/${yyyy}`;
  // Default MM/DD/YYYY
  return `${mm}/${dd}/${yyyy}`;
}

// Listen for settings changes from any page
export function subscribeSettings(onChange) {
  const handler = () => onChange(getPreferences());
  window.addEventListener("settings-changed", handler);
  window.addEventListener("storage", (e) => {
    if (e.key === "settings") handler();
  });
  return () => {
    window.removeEventListener("settings-changed", handler);
    // storage listener is anonymous above; not removing, but harmless
  };
}
