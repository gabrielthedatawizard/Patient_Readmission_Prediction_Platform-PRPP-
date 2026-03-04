import { trackEvent } from "./analytics";

const ASSIGNMENTS_STORAGE_KEY = "trip_experiment_assignments";
const EXPOSURES_STORAGE_KEY = "trip_experiment_exposures";

const EXPERIMENTS = {
  dashboardKpiOrder: {
    variants: [
      { name: "control", weight: 50 },
      { name: "prioritizeInterventions", weight: 50 },
    ],
  },
};

function readStorageJson(key) {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
}

function writeStorageJson(key, value) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // Storage can be unavailable in hardened browser modes.
  }
}

function hashToUnitInterval(input) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash / 4294967295;
}

function resolveVariant(config, seedValue) {
  const totalWeight = config.variants.reduce(
    (sum, variant) => sum + Number(variant.weight || 0),
    0,
  );
  const normalized = hashToUnitInterval(seedValue) * totalWeight;

  let cursor = 0;
  for (const variant of config.variants) {
    cursor += Number(variant.weight || 0);
    if (normalized <= cursor) {
      return variant.name;
    }
  }

  return config.variants[0]?.name || "control";
}

export function getExperimentVariant(experimentKey, subjectId = "anonymous") {
  const config = EXPERIMENTS[experimentKey];
  if (!config) {
    return "control";
  }

  const assignments = readStorageJson(ASSIGNMENTS_STORAGE_KEY);
  if (assignments[experimentKey]) {
    return assignments[experimentKey];
  }

  const variant = resolveVariant(config, `${experimentKey}:${subjectId}`);
  assignments[experimentKey] = variant;
  writeStorageJson(ASSIGNMENTS_STORAGE_KEY, assignments);

  return variant;
}

export function trackExperimentExposure(experimentKey, variant, subjectId = "anonymous") {
  const exposures = readStorageJson(EXPOSURES_STORAGE_KEY);
  const exposureKey = `${experimentKey}:${subjectId}`;

  if (exposures[exposureKey]) {
    return;
  }

  exposures[exposureKey] = {
    variant,
    trackedAt: new Date().toISOString(),
  };
  writeStorageJson(EXPOSURES_STORAGE_KEY, exposures);

  trackEvent("Experiment", "Exposure", `${experimentKey}:${variant}`);
}
