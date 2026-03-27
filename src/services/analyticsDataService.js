import { requestBlob, requestJson } from "./apiClient";

export async function fetchDashboardKPIs({ facilityId, days = 30 } = {}) {
  const query = new URLSearchParams();
  if (facilityId) {
    query.set("facilityId", facilityId);
  }
  query.set("days", String(days));

  return requestJson(`/analytics/dashboard?${query.toString()}`);
}

export async function fetchFacilityComparison({ days = 30 } = {}) {
  const query = new URLSearchParams();
  query.set("days", String(days));
  const payload = await requestJson(`/analytics/facilities?${query.toString()}`);
  return payload?.facilities || [];
}

export async function fetchAnomalies({ facilityId } = {}) {
  const query = new URLSearchParams();
  if (facilityId) {
    query.set("facilityId", facilityId);
  }
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const payload = await requestJson(`/analytics/anomalies${suffix}`);
  return payload?.anomalies || [];
}

export async function fetchBedForecast({ facilityId, days = 7 } = {}) {
  const query = new URLSearchParams();
  if (facilityId) {
    query.set("facilityId", facilityId);
  }
  query.set("days", String(days));

  return requestJson(`/analytics/bed-forecast?${query.toString()}`);
}

export async function fetchAutomationSummary({ facilityId, days = 30 } = {}) {
  const query = new URLSearchParams();
  if (facilityId) {
    query.set("facilityId", facilityId);
  }
  query.set("days", String(days));

  return requestJson(`/analytics/automation-summary?${query.toString()}`);
}

export async function fetchQualitySnapshot({ facilityId } = {}) {
  const query = new URLSearchParams();
  if (facilityId) {
    query.set("facilityId", facilityId);
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return requestJson(`/analytics/quality${suffix}`);
}

export async function fetchFairnessSnapshot({ facilityId } = {}) {
  const query = new URLSearchParams();
  if (facilityId) {
    query.set("facilityId", facilityId);
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return requestJson(`/analytics/fairness${suffix}`);
}

export async function fetchMlMonitoring() {
  return requestJson("/analytics/ml/monitoring");
}

export async function exportTrainingDataset({
  format = "csv",
  labelledOnly = true,
} = {}) {
  const query = new URLSearchParams({
    format,
    labelledOnly: String(labelledOnly),
  });

  return requestBlob(`/analytics/ml/training-dataset?${query.toString()}`, {
    headers: {
      Accept: format === "csv" ? "text/csv" : "application/json",
    },
  });
}
