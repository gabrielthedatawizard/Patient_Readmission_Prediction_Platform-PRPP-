const STORAGE_KEY = "trip_feature_flags";

const DEFAULT_FLAGS = {
  analyticsAuditTrail: true,
  dataQualityDashboard: true,
  analyticsPdfExport: true,
};

const ENV_FLAG_MAP = {
  analyticsAuditTrail: "VITE_FLAG_ANALYTICS_AUDIT_TRAIL",
  dataQualityDashboard: "VITE_FLAG_DATA_QUALITY_DASHBOARD",
  analyticsPdfExport: "VITE_FLAG_ANALYTICS_PDF_EXPORT",
};

function parseBoolean(value) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const normalized = String(value).trim().toLowerCase();

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return undefined;
}

function readEnvironmentFlags() {
  return Object.entries(ENV_FLAG_MAP).reduce((accumulator, [flag, envKey]) => {
    const parsed = parseBoolean(import.meta.env?.[envKey]);
    if (parsed !== undefined) {
      accumulator[flag] = parsed;
    }
    return accumulator;
  }, {});
}

function readLocalOverrides() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return {};
    }

    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    return Object.keys(DEFAULT_FLAGS).reduce((accumulator, flag) => {
      const normalized = parseBoolean(parsed[flag]);
      if (normalized !== undefined) {
        accumulator[flag] = normalized;
      }
      return accumulator;
    }, {});
  } catch (error) {
    return {};
  }
}

let cachedFlags = null;

function computeFlags() {
  return {
    ...DEFAULT_FLAGS,
    ...readEnvironmentFlags(),
    ...readLocalOverrides(),
  };
}

export function getFeatureFlags({ forceRefresh = false } = {}) {
  if (!cachedFlags || forceRefresh) {
    cachedFlags = computeFlags();
  }
  return cachedFlags;
}

export function isFeatureEnabled(flagName) {
  return Boolean(getFeatureFlags()[flagName]);
}
