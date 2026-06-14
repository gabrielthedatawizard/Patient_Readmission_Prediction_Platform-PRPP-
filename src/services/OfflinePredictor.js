/**
 * TRIP Offline Edge AI Predictor
 * Provides zero-dependency in-browser predictions using a mathematically
 * exact replica of the ML service's Surrogate Logistic Regression model.
 * 
 * Perfect for offline mode in rural clinics without the 10MB payload of ONNX.
 */

// Model weights synced from app/predictor.py (v2.1 fallback)
// Hard-coded default in case of initial startup failure
const DEFAULT_MODEL_ARTIFACT = {
  model_name: "TRIP Edge Surrogate Model",
  model_version: "trip-clinical-edge-v1",
  model_type: "logistic_regression_surrogate",
  artifact_source: "builtin-edge",
  intercept: -4.1,
  score_thresholds: { medium: 0.35, high: 0.60, very_high: 0.85 },
  confidence_interval_width: 0.12,
  feature_weights: {
      age_scaled: 0.55,
      prior_admissions_6mo_scaled: 0.45,
      prior_admissions_12m_scaled: 0.40,
      length_of_stay_scaled: 0.28,
      charlson_index_scaled: 0.32,
      egfr_low_severity: 0.62,
      anemia_severity: 0.44,
      hba1c_risk: 0.30,
      high_bp_flag: 0.22,
      high_risk_medication_scaled: 0.26,
      icu_stay_scaled: 0.29,
      no_phone_access_flag: 0.38,
      transportation_difficulty_flag: 0.42,
      lives_alone_flag: 0.18,
      heart_failure_flag: 0.65,
      diabetes_flag: 0.20,
      ckd_flag: 0.34,
      malaria_flag: 0.22,
      hiv_flag: 0.48,
      art_gap_flag: 0.24,
      tb_flag: 0.44,
      sam_flag: 0.58,
      sickle_cell_flag: 0.30,
      neonatal_risk_flag: 0.62,
  }
};

let MODEL_ARTIFACT = { ...DEFAULT_MODEL_ARTIFACT };

try {
  const cached = localStorage.getItem('trip_edge_model_artifact');
  if (cached) {
    MODEL_ARTIFACT = JSON.parse(cached);
  }
} catch (e) {
  console.warn("Failed to load cached edge model artifact", e);
}

/**
 * Syncs the latest edge model weights from the ML service
 */
export async function syncEdgeModel() {
  try {
    const mlUrl = import.meta.env.VITE_ML_API_URL || 'http://localhost:8000';
    const response = await fetch(`${mlUrl}/api/v1/model/edge-artifact`);
    if (response.ok) {
      const artifact = await response.json();
      MODEL_ARTIFACT = artifact;
      localStorage.setItem('trip_edge_model_artifact', JSON.stringify(artifact));
      localStorage.setItem('trip_edge_model_sync_time', new Date().toISOString());
      console.log('Successfully synced edge model artifact: ', artifact.model_version);
      return true;
    }
  } catch (error) {
    console.warn('Silent failure syncing edge model, using current cache/builtin.', error);
  }
  return false;
}

/**
 * Returns read-only metadata about the currently loaded edge model
 */
export function getEdgeModelMetadata() {
  return {
    name: MODEL_ARTIFACT.model_name,
    version: MODEL_ARTIFACT.model_version,
    type: MODEL_ARTIFACT.model_type,
    source: MODEL_ARTIFACT.artifact_source,
    lastSync: localStorage.getItem('trip_edge_model_sync_time') || 'Never'
  };
}

const FEATURE_LABELS = {
  age_scaled: "Advanced age",
  prior_admissions_12m_scaled: "Annual admissions burden",
  prior_admissions_6mo_scaled: "Recent admissions burden",
  length_of_stay_scaled: "Prolonged stay burden",
  charlson_index_scaled: "Comorbidity burden",
  egfr_low_severity: "Reduced kidney function",
  anemia_severity: "Anemia severity",
  hba1c_risk: "Poor glycemic control",
  high_bp_flag: "Elevated blood pressure",
  high_risk_medication_scaled: "High-risk medication burden",
  icu_stay_scaled: "ICU exposure",
  no_phone_access_flag: "No phone access",
  transportation_difficulty_flag: "Transport barrier",
  lives_alone_flag: "Lives alone",
  heart_failure_flag: "Heart failure diagnosis",
  diabetes_flag: "Diabetes diagnosis",
  ckd_flag: "CKD diagnosis",
  malaria_flag: "Malaria diagnosis",
  hiv_flag: "HIV diagnosis",
  art_gap_flag: "HIV without ART coverage",
  tb_flag: "Tuberculosis diagnosis",
  sam_flag: "Severe acute malnutrition",
  sickle_cell_flag: "Sickle cell disease",
  neonatal_risk_flag: "Neonatal risk"
};

const HIV_SUPPRESSED_KEYS = ["hiv_flag", "art_gap_flag"];
const CRITICAL_FIELDS = ["egfr", "hemoglobin", "hba1c", "bpSystolic", "bpDiastolic"];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function sigmoid(value) {
  return 1.0 / (1.0 + Math.exp(-clamp(value, -20, 20)));
}

function extractSurrogateFeatures(normalized) {
  const egfr = normalized.egfr;
  const hemoglobin = normalized.hemoglobin;
  const hba1c = normalized.hba1c;
  const bp_systolic = normalized.bpSystolic;
  const bp_diastolic = normalized.bpDiastolic;

  return {
    age_scaled: clamp(normalized.age - 18.0, 0.0, 100.0) / 60.0,
    prior_admissions_6mo_scaled: (normalized.priorAdmissions6mo || 0) / 2.0,
    prior_admissions_12m_scaled: (normalized.priorAdmissions12m || 0) / 3.0,
    length_of_stay_scaled: (normalized.lengthOfStayDays || 0) / 7.0,
    charlson_index_scaled: (normalized.charlsonIndex || 0) / 2.5,
    egfr_low_severity: egfr !== null && egfr !== undefined ? clamp((60.0 - egfr) / 25.0, 0.0, 5.0) : 0.0,
    anemia_severity: hemoglobin !== null && hemoglobin !== undefined ? clamp((10.5 - hemoglobin) / 1.5, 0.0, 5.0) : 0.0,
    hba1c_risk: hba1c !== null && hba1c !== undefined ? clamp((hba1c - 8.0) / 2.0, 0.0, 5.0) : 0.0,
    high_bp_flag: ((bp_systolic && bp_systolic >= 150) || (bp_diastolic && bp_diastolic >= 95)) ? 1.0 : 0.0,
    high_risk_medication_scaled: (normalized.highRiskMedicationCount || 0) / 2.0,
    icu_stay_scaled: (normalized.icuStayDays || 0) / 2.5,
    no_phone_access_flag: normalized.phoneAccess === false ? 1.0 : 0.0,
    transportation_difficulty_flag: normalized.transportationDifficulty ? 1.0 : 0.0,
    lives_alone_flag: normalized.livesAlone ? 1.0 : 0.0,
    heart_failure_flag: normalized.hasHeartFailure ? 1.0 : 0.0,
    diabetes_flag: normalized.hasDiabetes ? 1.0 : 0.0,
    ckd_flag: normalized.hasCkd ? 1.0 : 0.0,
    malaria_flag: normalized.hasMalaria ? 1.0 : 0.0,
    hiv_flag: normalized.hasHiv ? 1.0 : 0.0,
    art_gap_flag: (normalized.hasHiv && !normalized.onArt) ? 1.0 : 0.0,
    tb_flag: normalized.hasTuberculosis ? 1.0 : 0.0,
    sam_flag: normalized.hasSevereAcuteMalnutrition ? 1.0 : 0.0,
    sickle_cell_flag: normalized.hasSickleCellDisease ? 1.0 : 0.0,
    neonatal_risk_flag: normalized.neonatalRisk ? 1.0 : 0.0,
  };
}

function scoreToTier(probability, thresholds) {
  if (probability >= thresholds.very_high) return "VeryHigh";
  if (probability >= thresholds.high) return "High";
  if (probability >= thresholds.medium) return "Medium";
  return "Low";
}

/**
 * Predicts readmission risk fully offline
 * @param {Object} patientProfile - A clinical profile object
 */
export function predictOffline(patientProfile) {
  const norm = {
    age: patientProfile.age || 0,
    priorAdmissions6mo: patientProfile.priorAdmissions6mo || 0,
    priorAdmissions12m: patientProfile.priorAdmissions12m || 0,
    lengthOfStayDays: patientProfile.lengthOfStayDays || 0,
    charlsonIndex: patientProfile.charlsonIndex || 0,
    egfr: patientProfile.egfr,
    hemoglobin: patientProfile.hemoglobin,
    hba1c: patientProfile.hba1c,
    bpSystolic: patientProfile.bpSystolic,
    bpDiastolic: patientProfile.bpDiastolic,
    highRiskMedicationCount: patientProfile.highRiskMedicationCount || 0,
    icuStayDays: patientProfile.icuStayDays || 0,
    phoneAccess: patientProfile.phoneAccess,
    transportationDifficulty: patientProfile.transportationDifficulty,
    livesAlone: patientProfile.livesAlone,
    hasHeartFailure: patientProfile.hasHeartFailure,
    hasDiabetes: patientProfile.hasDiabetes,
    hasCkd: patientProfile.hasCkd,
    hasMalaria: patientProfile.hasMalaria,
    hasHiv: patientProfile.hasHiv,
    onArt: patientProfile.onArt,
    hasTuberculosis: patientProfile.hasTuberculosis,
    hasSevereAcuteMalnutrition: patientProfile.hasSevereAcuteMalnutrition,
    hasSickleCellDisease: patientProfile.hasSickleCellDisease,
    neonatalRisk: patientProfile.neonatalRisk,
  };

  const engineered = extractSurrogateFeatures(norm);
  let logit = MODEL_ARTIFACT.intercept;
  const weights = MODEL_ARTIFACT.feature_weights;
  let weightedContributions = [];

  for (const [feat, val] of Object.entries(engineered)) {
    const weight = weights[feat] || 0.0;
    const contribution = weight * val;
    logit += contribution;
    if (Math.abs(contribution) > 0) {
      weightedContributions.push({ featureName: feat, contribution });
    }
  }

  const probability = clamp(sigmoid(logit), 0.0, 1.0);
  const score = Math.round(probability * 100);
  const tier = scoreToTier(probability, MODEL_ARTIFACT.score_thresholds);

  // Compute confidence based on data completeness
  const missing = CRITICAL_FIELDS.filter(f => norm[f] === undefined || norm[f] === null);
  const completeness = (CRITICAL_FIELDS.length - missing.length) / CRITICAL_FIELDS.length;
  const margin = Math.abs(probability - 0.5) * 2.0;
  const confidence = clamp(0.56 + completeness * 0.24 + margin * 0.15, 0.50, 0.95);

  // Format factors, suppressing HIV keys strictly
  const visibleContributions = weightedContributions.filter(w => !HIV_SUPPRESSED_KEYS.includes(w.featureName));
  const totalAbs = visibleContributions.reduce((sum, item) => sum + Math.abs(item.contribution), 0) || 1.0;
  
  visibleContributions.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  
  const factors = visibleContributions.slice(0, 5).map(item => ({
    factor: FEATURE_LABELS[item.featureName] || item.featureName,
    weight: Math.round((Math.abs(item.contribution) / totalAbs) * 1000) / 1000,
    contribution: item.contribution,
    direction: item.contribution >= 0 ? "increase" : "decrease"
  }));

  return {
    score,
    probability,
    tier,
    factors,
    confidence,
    fallbackUsed: true,
    dataQuality: {
      completeness,
      missingCriticalFields: missing
    },
    modelVersion: MODEL_ARTIFACT.model_version,
    modelType: MODEL_ARTIFACT.model_type,
    generatedAt: new Date().toISOString()
  };
}
