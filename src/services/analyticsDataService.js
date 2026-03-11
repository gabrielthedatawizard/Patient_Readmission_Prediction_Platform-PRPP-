import { buildApiUrl } from "./runtimeConfig";

async function request(path) {
  const response = await fetch(buildApiUrl(path), {
    credentials: "include",
  });

  if (!response.ok) {
    const error = new Error(`Analytics request failed (${response.status}).`);
    error.status = response.status;
    throw error;
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

export async function fetchBedForecast({ facilityId, days = 7 } = {}) {
  const query = new URLSearchParams();
  if (facilityId) {
    query.set("facilityId", facilityId);
  }
  query.set("days", String(days));

  return request(`/analytics/bed-forecast?${query.toString()}`);
}

export async function fetchAutomationSummary({ facilityId, days = 30 } = {}) {
  const query = new URLSearchParams();
  if (facilityId) {
    query.set("facilityId", facilityId);
  }
  query.set("days", String(days));

  return request(`/analytics/automation-summary?${query.toString()}`);
}

export async function fetchQualitySnapshot({ facilityId } = {}) {
  const query = new URLSearchParams();
  if (facilityId) {
    query.set("facilityId", facilityId);
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return request(`/analytics/quality${suffix}`);
}

export async function fetchFairnessSnapshot({ facilityId } = {}) {
  const query = new URLSearchParams();
  if (facilityId) {
    query.set("facilityId", facilityId);
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return request(`/analytics/fairness${suffix}`);
}
