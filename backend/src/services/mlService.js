const { predictReadmission } = require('./riskEngine');

const ML_API_URL = (process.env.ML_API_URL || 'http://localhost:5001').replace(/\/$/, '');
const ML_TIMEOUT_MS = Number(process.env.ML_TIMEOUT_MS) || 5000;
const ML_FALLBACK_ENABLED = process.env.ML_FALLBACK_ENABLED !== 'false';
const SUPPORTED_RUNTIME_MODES = new Set(['auto', 'fallback_only', 'external_required']);

function isLoopbackHost(hostname) {
  return ['localhost', '127.0.0.1', '::1'].includes(String(hostname || '').toLowerCase());
}

function hasUsableExternalMlService(url) {
  try {
    const parsed = new URL(String(url || ''));
    return !isLoopbackHost(parsed.hostname);
  } catch (error) {
    return false;
  }
}

function getRequestedMlRuntimeMode() {
  const configured = String(process.env.ML_RUNTIME_MODE || 'auto').trim().toLowerCase();
  return SUPPORTED_RUNTIME_MODES.has(configured) ? configured : 'auto';
}

function resolveMlRuntimeConfig() {
  const requestedMode = getRequestedMlRuntimeMode();
  const externalServiceConfigured = hasUsableExternalMlService(ML_API_URL);

  const runtime = {
    url: ML_API_URL,
    requestedMode,
    fallbackEnabled: ML_FALLBACK_ENABLED,
    externalServiceConfigured,
    effectiveMode: 'misconfigured',
    canUseExternalService: false,
    fallbackOnError: false,
    message: 'ML runtime is not configured.'
  };

  if (requestedMode === 'fallback_only') {
    if (!ML_FALLBACK_ENABLED) {
      runtime.message = 'ML_RUNTIME_MODE=fallback_only requires ML_FALLBACK_ENABLED=true.';
      return runtime;
    }

    runtime.effectiveMode = 'fallback_only';
    runtime.message = 'Configured to use the local rules fallback only.';
    return runtime;
  }

  if (requestedMode === 'external_required') {
    if (!externalServiceConfigured) {
      runtime.message =
        'ML_RUNTIME_MODE=external_required but ML_API_URL does not point to a usable external service.';
      return runtime;
    }

    runtime.effectiveMode = 'external_ml';
    runtime.canUseExternalService = true;
    runtime.message = 'Configured to require the external ML service.';
    return runtime;
  }

  if (externalServiceConfigured) {
    runtime.effectiveMode = ML_FALLBACK_ENABLED ? 'external_with_fallback' : 'external_ml';
    runtime.canUseExternalService = true;
    runtime.fallbackOnError = ML_FALLBACK_ENABLED;
    runtime.message = ML_FALLBACK_ENABLED
      ? 'External ML is preferred and the local rules fallback remains available.'
      : 'External ML is active and fallback is disabled.';
    return runtime;
  }

  if (ML_FALLBACK_ENABLED) {
    runtime.effectiveMode = 'fallback_only';
    runtime.message = 'No usable external ML service is configured; using the local rules fallback only.';
    return runtime;
  }

  runtime.message =
    'No usable external ML service is configured and fallback is disabled.';
  return runtime;
}

function buildFallbackPrediction(features = {}) {
  const fallbackModel = predictReadmission(
    {
      ...features,
      priorAdmissions12m: Math.max(features.priorAdmissions6mo, 0),
      lengthOfStayDays: features.lengthOfStay
    },
    { forcePrimaryFailure: true }
  );

  return {
    score: fallbackModel.score,
    tier: fallbackModel.tier,
    probability: fallbackModel.probability,
    confidence: fallbackModel.confidence,
    confidenceInterval: fallbackModel.confidenceInterval,
    factors: fallbackModel.factors || [],
    explanation: fallbackModel.explanation,
    modelVersion: fallbackModel.modelVersion || 'rules-v1.0',
    modelType: fallbackModel.modelType || 'rules_fallback',
    fallbackUsed: true,
    method: 'rules',
    dataQuality: null,
    analysisSummary: null
  };
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeInputFeatures(features = {}) {
  return {
    age: toNumber(features.age),
    gender: features.gender || 'unknown',
    diagnosis: features.diagnosis || 'unknown',
    diagnoses: Array.isArray(features.diagnoses) ? features.diagnoses : [],
    lengthOfStay: toNumber(features.lengthOfStay ?? features.lengthOfStayDays),
    priorAdmissions6mo: toNumber(features.priorAdmissions6mo ?? features.priorAdmissions12m),
    priorAdmissions12m: toNumber(features.priorAdmissions12m ?? features.priorAdmissions6mo),
    charlsonIndex: toNumber(features.charlsonIndex),
    egfr: features.egfr,
    hemoglobin: features.hemoglobin,
    hba1c: features.hba1c,
    bpSystolic: features.bpSystolic,
    bpDiastolic: features.bpDiastolic,
    medicationCount: toNumber(features.medicationCount),
    highRiskMedicationCount: toNumber(features.highRiskMedicationCount),
    icuStayDays: toNumber(features.icuStayDays),
    phoneAccess: features.phoneAccess,
    transportationDifficulty: features.transportationDifficulty,
    livesAlone: features.livesAlone,
    hasHeartFailure: Boolean(features.hasHeartFailure),
    hasDiabetes: Boolean(features.hasDiabetes),
    hasCkd: Boolean(features.hasCkd)
  };
}

function scoreToTier(score) {
  if (score >= 70) {
    return 'High';
  }
  if (score >= 40) {
    return 'Medium';
  }
  return 'Low';
}

function normalizeExternalPrediction(payload = {}, fallbackFeatures = {}) {
  const probability = Number(
    Math.max(0, Math.min(1, toNumber(payload.probability, Number.NaN))).toFixed(3)
  );
  const scoreCandidate =
    payload.score !== undefined ? payload.score : toNumber(payload.probability, 0) * 100;
  const score = Math.max(0, Math.min(100, Math.round(toNumber(scoreCandidate, 0))));
  const tier = payload.tier || scoreToTier(score);
  const confidence = Number(
    Math.max(0.5, Math.min(0.99, toNumber(payload.confidence, 0.85))).toFixed(3)
  );
  const interval = payload.confidenceInterval || {};

  return {
    score,
    tier,
    probability: Number.isFinite(probability) ? probability : Number((score / 100).toFixed(3)),
    confidence,
    confidenceInterval: {
      low: toNumber(interval.low, Math.max(score - 10, 0)),
      high: toNumber(interval.high, Math.min(score + 10, 100))
    },
    factors: Array.isArray(payload.factors)
      ? payload.factors
      : [{ factor: 'External ML score', weight: 1, impact: 'ML service response' }],
    explanation: payload.explanation || 'Prediction generated by external ML service.',
    modelVersion: payload.modelVersion || 'external-ml-v1',
    modelType: payload.modelType || 'external_ml',
    dataQuality:
      payload.dataQuality && typeof payload.dataQuality === 'object'
        ? payload.dataQuality
        : null,
    analysisSummary:
      payload.analysisSummary && typeof payload.analysisSummary === 'object'
        ? payload.analysisSummary
        : null,
    fallbackUsed: false,
    method: 'ml',
    inputEcho: fallbackFeatures
  };
}

function safeParseJson(rawValue) {
  if (!rawValue) {
    return null;
  }
  try {
    return JSON.parse(rawValue);
  } catch (error) {
    return null;
  }
}

function readRemoteErrorMessage(payload) {
  if (!payload) {
    return null;
  }
  if (typeof payload === 'string') {
    return payload;
  }
  if (typeof payload.message === 'string') {
    return payload.message;
  }
  if (typeof payload.error === 'string') {
    return payload.error;
  }
  if (payload.error && typeof payload.error.message === 'string') {
    return payload.error.message;
  }
  if (payload.details && typeof payload.details.message === 'string') {
    return payload.details.message;
  }
  return null;
}

async function postJson(url, body, timeoutMs) {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    const rawResponse = await response.text();
    const payload = safeParseJson(rawResponse);

    if (!response.ok) {
      const message =
        readRemoteErrorMessage(payload) || `ML service request failed with status ${response.status}`;
      const error = new Error(message);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return payload || {};
  } finally {
    clearTimeout(timeoutHandle);
  }
}

async function generatePrediction(visitId, rawFeatures = {}) {
  const features = normalizeInputFeatures(rawFeatures);
  const runtime = resolveMlRuntimeConfig();

  if (runtime.effectiveMode === 'misconfigured') {
    throw new Error(runtime.message);
  }

  if (runtime.effectiveMode === 'fallback_only') {
    return buildFallbackPrediction(features);
  }

  try {
    const responsePayload = await postJson(
      `${runtime.url}/api/v1/predict`,
      { visitId, features },
      ML_TIMEOUT_MS
    );

    return normalizeExternalPrediction(responsePayload, features);
  } catch (error) {
    if (!runtime.fallbackOnError) {
      throw new Error(
        `External ML service is unavailable and fallback is disabled for the current runtime mode: ${String(error?.message || error)}`
      );
    }

    return buildFallbackPrediction(features);
  }
}

module.exports = {
  generatePrediction,
  getMlRuntimeConfig: resolveMlRuntimeConfig
};
