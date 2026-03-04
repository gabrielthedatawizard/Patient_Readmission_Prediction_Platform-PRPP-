import { getStoredToken } from "./apiClient";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

async function request(path) {
  const token = getStoredToken();
  if (!token) {
    throw new Error("Missing session token.");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Analytics request failed (${response.status}).`);
  }

  return response.json();
}

export async function fetchDashboardKPIs({ facilityId, days = 30 } = {}) {
  const query = new URLSearchParams();
  if (facilityId) {
    query.set("facilityId", facilityId);
  }
  query.set("days", String(days));

  return request(`/analytics/dashboard?${query.toString()}`);
}

export async function fetchFacilityComparison({ days = 30 } = {}) {
  const query = new URLSearchParams();
  query.set("days", String(days));
  const payload = await request(`/analytics/facilities?${query.toString()}`);
  return payload?.facilities || [];
}

export async function fetchAnomalies({ facilityId } = {}) {
  const query = new URLSearchParams();
  if (facilityId) {
    query.set("facilityId", facilityId);
  }
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const payload = await request(`/analytics/anomalies${suffix}`);
  return payload?.anomalies || [];
}

