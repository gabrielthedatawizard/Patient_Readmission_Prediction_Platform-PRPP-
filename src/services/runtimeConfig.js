const DEFAULT_API_BASE = "/api";

function normalizeBaseUrl(value, fallback) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return fallback;
  }

  return normalized.replace(/\/$/, "");
}

export const API_BASE = normalizeBaseUrl(
  import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL,
  DEFAULT_API_BASE,
);

export function buildApiUrl(path = "") {
  const normalizedPath = String(path || "").trim();
  if (!normalizedPath) {
    return API_BASE;
  }

  if (
    normalizedPath.startsWith("http://") ||
    normalizedPath.startsWith("https://")
  ) {
    return normalizedPath;
  }

  if (normalizedPath.startsWith("/")) {
    return `${API_BASE}${normalizedPath}`;
  }

  return `${API_BASE}/${normalizedPath}`;
}

export function getProtectedDeploymentMessage(rawText) {
  const text = String(rawText || "");
  if (
    text.includes("Vercel Authentication") ||
    text.includes("Authentication Required") ||
    text.includes("x-vercel-protection-bypass")
  ) {
    return "This deployment is protected by Vercel Authentication. Sign in to Vercel or disable deployment protection for the API.";
  }

  return null;
}

export function isWebSocketEnabled() {
  return import.meta.env.VITE_DISABLE_WEBSOCKETS !== "true";
}

export function getWebSocketBaseUrl() {
  const configured = normalizeBaseUrl(import.meta.env.VITE_WS_URL, "");
  if (configured) {
    return configured;
  }

  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}`;
  }

  if (API_BASE.startsWith("http://") || API_BASE.startsWith("https://")) {
    const url = new URL(API_BASE);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = url.pathname.replace(/\/api\/?$/, "");
    return `${url.origin}${url.pathname}`.replace(/\/$/, "");
  }

  return "ws://localhost:5000";
}
