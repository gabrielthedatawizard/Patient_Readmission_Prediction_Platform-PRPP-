import { requestBlob, requestJson } from "./apiClient";
import { appendScopeToPath } from "./workspaceScope";

function withScope(path, scope) {
  return appendScopeToPath(path, scope || {});
}

export async function fetchDashboardKPIs({ facilityId, days = 30, scope } = {}) {
  const query = new URLSearchParams();
  if (facilityId) {
    query.set("facilityId", facilityId);
  }
  query.set("days", String(days));

  return requestJson(withScope(`/analytics/dashboard?${query.toString()}`, scope));
}

export async function fetchFacilityComparison({ days = 30, scope } = {}) {
  const query = new URLSearchParams();
  query.set("days", String(days));
  const payload = await requestJson(withScope(`/analytics/facilities?${query.toString()}`, scope));
  return payload?.facilities || [];
}

export async function fetchAnomalies({ facilityId, scope } = {}) {
  const query = new URLSearchParams();
  if (facilityId) {
    query.set("facilityId", facilityId);
  }
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const payload = await requestJson(withScope(`/analytics/anomalies${suffix}`, scope));
  return payload?.anomalies || [];
}

export async function fetchBedForecast({ facilityId, days = 7, scope } = {}) {
  const query = new URLSearchParams();
  if (facilityId) {
    query.set("facilityId", facilityId);
  }
  query.set("days", String(days));

  return requestJson(withScope(`/analytics/bed-forecast?${query.toString()}`, scope));
}

export async function fetchAutomationSummary({ facilityId, days = 30, scope } = {}) {
  const query = new URLSearchParams();
  if (facilityId) {
    query.set("facilityId", facilityId);
  }
  query.set("days", String(days));

  return requestJson(withScope(`/analytics/automation-summary?${query.toString()}`, scope));
}

export async function fetchQualitySnapshot({ facilityId, scope } = {}) {
  const query = new URLSearchParams();
  if (facilityId) {
    query.set("facilityId", facilityId);
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return requestJson(withScope(`/analytics/quality${suffix}`, scope));
}

export async function fetchFairnessSnapshot({ facilityId, scope } = {}) {
  const query = new URLSearchParams();
  if (facilityId) {
    query.set("facilityId", facilityId);
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return requestJson(withScope(`/analytics/fairness${suffix}`, scope));
}

export async function fetchMlMonitoring({ scope } = {}) {
  return requestJson(withScope("/analytics/ml/monitoring", scope));
}

export async function exportTrainingDataset({
  format = "csv",
  labelledOnly = true,
  scope,
} = {}) {
  const query = new URLSearchParams({
    format,
    labelledOnly: String(labelledOnly),
  });

  return requestBlob(withScope(`/analytics/ml/training-dataset?${query.toString()}`, scope), {
    headers: {
      Accept: format === "csv" ? "text/csv" : "application/json",
    },
  });
}
