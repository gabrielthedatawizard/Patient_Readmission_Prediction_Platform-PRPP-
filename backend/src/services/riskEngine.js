const MODEL_VERSION_PRIMARY = 'trip-rules-xgb-surrogate-v1';
const MODEL_VERSION_FALLBACK = 'trip-rules-logreg-fallback-v1';

const CRITICAL_FIELDS = ['egfr', 'hba1c', 'bpSystolic', 'bpDiastolic', 'hemoglobin'];
const IMPUTATION_DEFAULTS = {
  egfr: 60,
  hba1c: 8,
  bpSystolic: 140,
  bpDiastolic: 90,
  hemoglobin: 11
};

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeFeatures(features = {}) {
  return {
    age: toNumber(features.age),
    priorAdmissions12m: toNumber(features.priorAdmissions12m),
    lengthOfStayDays: toNumber(features.lengthOfStayDays),
    charlsonIndex: toNumber(features.charlsonIndex),
    egfr: toNumber(features.egfr),
    hemoglobin: toNumber(features.hemoglobin),
    hba1c: toNumber(features.hba1c),
    bpSystolic: toNumber(features.bpSystolic),
    bpDiastolic: toNumber(features.bpDiastolic),
    highRiskMedicationCount: toNumber(features.highRiskMedicationCount),
    icuStayDays: toNumber(features.icuStayDays),
    phoneAccess: Boolean(features.phoneAccess),
    transportationDifficulty: Boolean(features.transportationDifficulty),
    livesAlone: Boolean(features.livesAlone)
  };
}

function applyImputation(features) {
  const missing = [];
  const imputed = {};

  CRITICAL_FIELDS.forEach((field) => {
    const value = features[field];
    if (value === null || value === undefined) {
      missing.push(field);
      imputed[field] = IMPUTATION_DEFAULTS[field];
    }
  });

  return {
    hydrated: {
      ...features,
      ...imputed
    },
    missing,
    imputed
  };
}

function computeDataQuality(normalized, missing, imputed) {
  const presentCritical = CRITICAL_FIELDS.length - missing.length;
  const completeness = presentCritical / CRITICAL_FIELDS.length;

  return {
    completeness: Number(completeness.toFixed(3)),
    missingCriticalFields: missing,
    imputedValues: imputed
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

function formatFactors(contributions, score) {
  const total = contributions.reduce((accumulator, item) => accumulator + item.contribution, 0) || 1;

  return contributions
    .sort((left, right) => right.contribution - left.contribution)
    .slice(0, 5)
    .map((item) => ({
      factor: item.factor,
      contribution: item.contribution,
      weight: Number((item.contribution / total).toFixed(3)),
      impact: item.description
    }));
}

function generateExplanation(tier, factors) {
  if (!factors.length) {
    return 'Risk score is low with limited high-impact factors.';
  }

  const factorSummary = factors.slice(0, 3).map((factor) => factor.factor).join(', ');

  if (tier === 'High') {
    return `High risk because of ${factorSummary}.`;
  }

  if (tier === 'Medium') {
    return `Medium risk driven by ${factorSummary}.`;
  }

  return `Low risk; the strongest drivers are ${factorSummary}.`;
}

function addContribution(target, factor, contribution, description) {
  if (contribution <= 0) {
    return;
  }

  target.push({ factor, contribution, description });
}

function runPrimaryModel(features, dataQuality) {
  const contributions = [];
  let score = 18;

  if (features.age >= 75) {
    score += 14;
    addContribution(contributions, 'Advanced age', 14, 'Age 75 or above increases readmission probability.');
  } else if (features.age >= 60) {
    score += 8;
    addContribution(contributions, 'Older age', 8, 'Age 60-74 carries elevated readmission risk.');
  }

  if (features.priorAdmissions12m >= 3) {
    score += 18;
    addContribution(contributions, 'Frequent prior admissions', 18, 'Three or more admissions in the past year.');
  } else if (features.priorAdmissions12m >= 1) {
    score += 8;
    addContribution(contributions, 'Prior admissions', 8, 'At least one admission in the past year.');
  }

  if (features.lengthOfStayDays >= 10) {
    score += 10;
    addContribution(contributions, 'Long current stay', 10, 'Admission duration is ten days or longer.');
  } else if (features.lengthOfStayDays >= 5) {
    score += 4;
    addContribution(contributions, 'Moderate length of stay', 4, 'Current admission exceeds five days.');
  }

  if (features.charlsonIndex >= 5) {
    score += 15;
    addContribution(contributions, 'High comorbidity burden', 15, 'Charlson index is 5 or higher.');
  } else if (features.charlsonIndex >= 3) {
    score += 8;
    addContribution(contributions, 'Comorbidity burden', 8, 'Charlson index is between 3 and 4.');
  } else if (features.charlsonIndex >= 1) {
    score += 3;
    addContribution(contributions, 'Chronic conditions present', 3, 'At least one chronic comorbidity is documented.');
  }

  if (features.egfr < 60) {
    score += 10;
    addContribution(contributions, 'Reduced kidney function', 10, 'eGFR below 60 mL/min/1.73m2.');
  }

  if (features.hemoglobin < 10) {
    score += 7;
    addContribution(contributions, 'Anemia marker', 7, 'Hemoglobin below 10 g/dL.');
  }

  if (features.hba1c >= 9) {
    score += 8;
    addContribution(contributions, 'Poor glycemic control', 8, 'HbA1c at 9% or higher.');
  }

  if (features.highRiskMedicationCount >= 2) {
    score += 8;
    addContribution(contributions, 'High-risk medications', 8, 'Two or more high-risk medications prescribed.');
  } else if (features.highRiskMedicationCount >= 1) {
    score += 4;
    addContribution(contributions, 'High-risk medication present', 4, 'At least one high-risk medication prescribed.');
  }

  if (features.icuStayDays >= 2) {
    score += 8;
    addContribution(contributions, 'Recent ICU utilization', 8, 'ICU stay extends beyond 48 hours.');
  }

  if (!features.phoneAccess) {
    score += 6;
    addContribution(contributions, 'No phone access', 6, 'Follow-up and reminders are harder to deliver.');
  }

  if (features.transportationDifficulty) {
    score += 8;
    addContribution(contributions, 'Transport barrier', 8, 'Patient reports transport difficulty to facility.');
  }

  if (features.livesAlone) {
    score += 5;
    addContribution(contributions, 'Lives alone', 5, 'Limited household support after discharge.');
  }

  if (dataQuality.missingCriticalFields.length > 0) {
    const missingPenalty = dataQuality.missingCriticalFields.length * 2;
    score += missingPenalty;
    addContribution(contributions, 'Critical data missing', missingPenalty, 'Missing labs and vitals increase uncertainty and risk.');
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  return {
    score,
    factors: formatFactors(contributions, score)
  };
}

function runFallbackModel(features, dataQuality) {
  const contributions = [];
  let score = 15;

  if (features.age >= 65) {
    score += 10;
    addContribution(contributions, 'Older age', 10, 'Age 65+ in fallback model.');
  }

  if (features.priorAdmissions12m >= 1) {
    score += 15;
    addContribution(contributions, 'Prior admissions', 15, 'Prior admission history in fallback model.');
  }

  if (features.charlsonIndex >= 3) {
    score += 12;
    addContribution(contributions, 'Comorbidity burden', 12, 'Multiple chronic conditions.');
  }

  if (features.lengthOfStayDays >= 7) {
    score += 8;
    addContribution(contributions, 'Prolonged stay', 8, 'Long admission in fallback model.');
  }

  if (!features.phoneAccess || features.transportationDifficulty) {
    score += 8;
    addContribution(contributions, 'Follow-up barrier', 8, 'Communication or transport barriers identified.');
  }

  score += dataQuality.missingCriticalFields.length * 3;

  score = Math.max(0, Math.min(100, Math.round(score)));
  return {
    score,
    factors: formatFactors(contributions, score)
  };
}

function buildConfidence(score, completeness, fallbackUsed) {
  const baseConfidence = 0.55 + completeness * 0.4;
  const fallbackPenalty = fallbackUsed ? 0.1 : 0;
  const veryHighRiskPenalty = score >= 90 ? 0.05 : 0;
  const confidence = Math.max(0.5, Math.min(0.95, baseConfidence - fallbackPenalty - veryHighRiskPenalty));

  const intervalHalfWidth = Math.round((1 - confidence) * 28 + 4);

  return {
    confidence: Number(confidence.toFixed(3)),
    confidenceInterval: {
      low: Math.max(0, score - intervalHalfWidth),
      high: Math.min(100, score + intervalHalfWidth)
    }
  };
}

function predictReadmission(inputFeatures = {}, options = {}) {
  const normalized = normalizeFeatures(inputFeatures);
  const { hydrated, missing, imputed } = applyImputation(normalized);
  const dataQuality = computeDataQuality(normalized, missing, imputed);

  const forcePrimaryFailure =
    options.forcePrimaryFailure === true || process.env.TRIP_FORCE_MODEL_FAILURE === 'true';

  let scorePackage;
  let fallbackUsed = false;
  let modelType = 'xgboost_surrogate';
  let modelVersion = MODEL_VERSION_PRIMARY;

  try {
    if (forcePrimaryFailure) {
      throw new Error('Forced primary model failure for resilience testing.');
    }

    scorePackage = runPrimaryModel(hydrated, dataQuality);
  } catch (error) {
    fallbackUsed = true;
    modelType = 'logistic_fallback';
    modelVersion = MODEL_VERSION_FALLBACK;
    scorePackage = runFallbackModel(hydrated, dataQuality);
  }

  const tier = scoreToTier(scorePackage.score);
  const confidencePackage = buildConfidence(scorePackage.score, dataQuality.completeness, fallbackUsed);

  return {
    score: scorePackage.score,
    tier,
    modelType,
    modelVersion,
    fallbackUsed,
    factors: scorePackage.factors,
    explanation: generateExplanation(tier, scorePackage.factors),
    dataQuality,
    confidence: confidencePackage.confidence,
    confidenceInterval: confidencePackage.confidenceInterval
  };
}

module.exports = {
  predictReadmission,
  normalizeFeatures,
  scoreToTier
};
