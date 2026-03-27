const {
  listPatientsForUser,
  listPredictionsForPatient,
  listVisitsForPatient
} = require('../data');
const { buildPredictionFeatures } = require('./predictionFeatureBuilder');

const DAY_MS = 24 * 60 * 60 * 1000;
const ML_EXPORT_ROLES = new Set(['moh', 'ml_engineer']);
const CRITICAL_FIELDS = ['egfr', 'hemoglobin', 'hba1c', 'bpSystolic', 'bpDiastolic'];

function createForbiddenError(message) {
  const error = new Error(message);
  error.statusCode = 403;
  return error;
}

function ensureMlExportAccess(user) {
  if (!ML_EXPORT_ROLES.has(String(user?.role || ''))) {
    throw createForbiddenError('ML dataset export is limited to national administrators and ML engineers.');
  }
}

function normalizeBooleanQuery(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'n'].includes(normalized)) {
    return false;
  }

  return defaultValue;
}

function toNumber(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toIsoDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function sortVisits(visits = []) {
  return [...visits].sort((left, right) => {
    const leftTime = new Date(left?.admissionDate || left?.dischargeDate || 0).getTime();
    const rightTime = new Date(right?.admissionDate || right?.dischargeDate || 0).getTime();
    return leftTime - rightTime;
  });
}

function deriveReadmissionOutcome(currentVisit, orderedVisits = []) {
  const dischargeTime = new Date(
    currentVisit?.dischargeDate || currentVisit?.admissionDate || Number.NaN
  ).getTime();

  if (!Number.isFinite(dischargeTime)) {
    return {
      labelAvailable: false,
      readmitted30d: null,
      daysToReadmission: null
    };
  }

  const nextVisit = orderedVisits.find((visit) => {
    if (!visit || visit.id === currentVisit.id) {
      return false;
    }

    const admissionTime = new Date(visit.admissionDate || Number.NaN).getTime();
    return Number.isFinite(admissionTime) && admissionTime > dischargeTime;
  });

  if (!nextVisit) {
    return {
      labelAvailable: true,
      readmitted30d: 0,
      daysToReadmission: null
    };
  }

  const admissionTime = new Date(nextVisit.admissionDate).getTime();
  const daysToReadmission = Math.round((admissionTime - dischargeTime) / DAY_MS);

  return {
    labelAvailable: true,
    readmitted30d: daysToReadmission <= 30 ? 1 : 0,
    daysToReadmission
  };
}

function findPredictionForVisit(predictions = [], visit) {
  if (!visit) {
    return null;
  }

  const exact = predictions.find((prediction) => prediction.visitId === visit.id);
  if (exact) {
    return exact;
  }

  const anchorTime = new Date(visit.dischargeDate || visit.admissionDate || Number.NaN).getTime();
  if (!Number.isFinite(anchorTime)) {
    return null;
  }

  const candidates = predictions
    .filter((prediction) => {
      const generatedTime = new Date(prediction.generatedAt || Number.NaN).getTime();
      return Number.isFinite(generatedTime) && generatedTime >= anchorTime;
    })
    .sort((left, right) => {
      const leftTime = new Date(left.generatedAt).getTime();
      const rightTime = new Date(right.generatedAt).getTime();
      return leftTime - rightTime;
    });

  return candidates[0] || null;
}

function toCsvValue(value) {
  if (value === undefined || value === null) {
    return '';
  }

  const normalized =
    typeof value === 'string'
      ? value
      : Array.isArray(value)
        ? value.join('|')
        : typeof value === 'object'
          ? JSON.stringify(value)
          : String(value);

  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }

  return normalized;
}

function serializeRowsToCsv(rows = []) {
  if (!rows.length) {
    return '';
  }

  const fields = Object.keys(rows[0]);
  const lines = [fields.join(',')];

  rows.forEach((row) => {
    lines.push(fields.map((field) => toCsvValue(row[field])).join(','));
  });

  return `${lines.join('\n')}\n`;
}

function parseDatasetOptions(query = {}) {
  return {
    facilityId: String(query.facilityId || '').trim() || undefined,
    limitPatients: Math.min(Math.max(Number(query.limitPatients) || 250, 1), 2000),
    labelledOnly: normalizeBooleanQuery(query.labelledOnly, false),
    includeIdentifiers: normalizeBooleanQuery(query.includeIdentifiers, false)
  };
}

function buildDatasetRow({
  patient,
  visit,
  visits,
  predictions,
  includeIdentifiers = false
}) {
  const { modelFeatures, featureSnapshot, analysisSummary } = buildPredictionFeatures({
    patient,
    visit,
    visits,
    requestFeatures: {}
  });
  const outcome = deriveReadmissionOutcome(visit, visits);
  const prediction = findPredictionForVisit(predictions, visit);
  const missingData = Array.isArray(analysisSummary.missingData) ? analysisSummary.missingData : [];
  const featureCompleteness = Number(
    ((CRITICAL_FIELDS.length - missingData.length) / CRITICAL_FIELDS.length).toFixed(3)
  );

  const row = {
    facilityId: patient.facilityId,
    visitId: visit.id,
    admissionDate: toIsoDate(visit.admissionDate),
    dischargeDate: toIsoDate(visit.dischargeDate),
    ward: visit.ward || null,
    dischargeDisposition: visit.dischargeDisposition || null,
    age: modelFeatures.age,
    gender: modelFeatures.gender,
    diagnosis: modelFeatures.diagnosis,
    diagnoses: modelFeatures.diagnoses || [],
    medicationCount: modelFeatures.medicationCount,
    highRiskMedicationCount: modelFeatures.highRiskMedicationCount,
    priorAdmissions6mo: modelFeatures.priorAdmissions6mo,
    priorAdmissions12m: modelFeatures.priorAdmissions12m,
    lengthOfStayDays: modelFeatures.lengthOfStayDays,
    charlsonIndex: modelFeatures.charlsonIndex,
    egfr: modelFeatures.egfr,
    hemoglobin: modelFeatures.hemoglobin,
    hba1c: modelFeatures.hba1c,
    bpSystolic: modelFeatures.bpSystolic,
    bpDiastolic: modelFeatures.bpDiastolic,
    icuStayDays: modelFeatures.icuStayDays,
    phoneAccess: modelFeatures.phoneAccess,
    transportationDifficulty: modelFeatures.transportationDifficulty,
    livesAlone: modelFeatures.livesAlone,
    hasHeartFailure: modelFeatures.hasHeartFailure,
    hasDiabetes: modelFeatures.hasDiabetes,
    hasCkd: modelFeatures.hasCkd,
    hasMalaria: modelFeatures.hasMalaria,
    hasHiv: modelFeatures.hasHiv,
    onArt: modelFeatures.onArt,
    hasTuberculosis: modelFeatures.hasTuberculosis,
    hasSevereAcuteMalnutrition: modelFeatures.hasSevereAcuteMalnutrition,
    hasSickleCellDisease: modelFeatures.hasSickleCellDisease,
    neonatalRisk: modelFeatures.neonatalRisk,
    labAbnormalities: analysisSummary.labAbnormalities || [],
    socialRiskFactors: analysisSummary.socialRiskFactors || [],
    tanzaniaPriorityConditions: analysisSummary.tanzaniaPriorityConditions || [],
    neonatalRiskFactors: analysisSummary.neonatalRiskFactors || [],
    treatmentSignals: analysisSummary.treatmentSignals || [],
    medicationRiskProfile: analysisSummary.medicationRiskProfile || 'unknown',
    utilizationRiskProfile: analysisSummary.utilizationRiskProfile || 'unknown',
    missingData,
    featureCompleteness,
    labelAvailable: outcome.labelAvailable,
    readmitted30d: outcome.readmitted30d,
    daysToReadmission: outcome.daysToReadmission,
    predictionScore: prediction?.score ?? null,
    predictionProbability: prediction?.probability ?? null,
    predictionConfidence: prediction?.confidence ?? null,
    predictionTier: prediction?.tier ?? null,
    predictionMethod: prediction?.method ?? null,
    predictionModelVersion: prediction?.modelVersion ?? null,
    predictionFallbackUsed: prediction?.fallbackUsed ?? null,
    predictionGeneratedAt: prediction?.generatedAt ?? null,
    sourceFeatureSnapshot: featureSnapshot
  };

  if (includeIdentifiers) {
    row.patientId = patient.id;
    row.patientName = patient.name;
  }

  return row;
}

async function buildTrainingDataset(user, query = {}) {
  ensureMlExportAccess(user);

  const options = parseDatasetOptions(query);
  const patients = (await listPatientsForUser(user, { facilityId: options.facilityId })).slice(
    0,
    options.limitPatients
  );
  const rows = [];

  for (const patient of patients) {
    const [visitsRaw, predictions] = await Promise.all([
      listVisitsForPatient(user, patient.id),
      listPredictionsForPatient(user, patient.id)
    ]);
    const visits = sortVisits(visitsRaw);

    visits.forEach((visit) => {
      const row = buildDatasetRow({
        patient,
        visit,
        visits,
        predictions,
        includeIdentifiers: options.includeIdentifiers
      });

      if (!options.labelledOnly || row.labelAvailable) {
        rows.push(row);
      }
    });
  }

  const labelledRows = rows.filter((row) => row.labelAvailable);
  const predictedRows = rows.filter((row) => row.predictionScore !== null);
  const positiveRows = labelledRows.filter((row) => row.readmitted30d === 1);

  return {
    generatedAt: new Date().toISOString(),
    options,
    patientCount: patients.length,
    count: rows.length,
    labelledCount: labelledRows.length,
    positiveCount: positiveRows.length,
    predictionCoverage: rows.length ? Number((predictedRows.length / rows.length).toFixed(3)) : 0,
    fields: rows.length ? Object.keys(rows[0]) : [],
    rows
  };
}

function countBy(rows = [], key) {
  const bucket = {};

  rows.forEach((row) => {
    const value = row[key];
    const normalized = value === undefined || value === null || value === '' ? 'unknown' : String(value);
    bucket[normalized] = (bucket[normalized] || 0) + 1;
  });

  return bucket;
}

function roundMetric(value, digits = 3) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Number(value.toFixed(digits));
}

function safeRate(numerator, denominator, digits = 3) {
  if (!denominator) {
    return 0;
  }

  return roundMetric(numerator / denominator, digits);
}

function average(rows = [], selector) {
  if (!rows.length) {
    return 0;
  }

  const total = rows.reduce((sum, row) => sum + selector(row), 0);
  return total / rows.length;
}

function summarizeCriticalFieldCoverage(rows = []) {
  return CRITICAL_FIELDS.reduce((summary, field) => {
    const presentCount = rows.filter((row) => row[field] !== null && row[field] !== undefined).length;
    summary[field] = rows.length ? Number((presentCount / rows.length).toFixed(3)) : 0;
    return summary;
  }, {});
}

function getPredictionProbability(row) {
  const probability = toNumber(row.predictionProbability);
  if (probability !== null) {
    return probability;
  }

  const score = toNumber(row.predictionScore);
  return score !== null ? Number((score / 100).toFixed(3)) : null;
}

function getEventTimestamp(row) {
  const candidates = [row.dischargeDate, row.admissionDate, row.predictionGeneratedAt];

  for (const candidate of candidates) {
    const timestamp = new Date(candidate || Number.NaN).getTime();
    if (Number.isFinite(timestamp)) {
      return timestamp;
    }
  }

  return null;
}

function formatDateRange(rows = []) {
  if (!rows.length) {
    return {
      start: null,
      end: null
    };
  }

  const timestamps = rows
    .map((row) => getEventTimestamp(row))
    .filter((timestamp) => Number.isFinite(timestamp))
    .sort((left, right) => left - right);

  if (!timestamps.length) {
    return {
      start: null,
      end: null
    };
  }

  return {
    start: new Date(timestamps[0]).toISOString(),
    end: new Date(timestamps[timestamps.length - 1]).toISOString()
  };
}

function buildCalibrationSnapshot(rows = []) {
  const eligibleRows = rows.filter((row) => {
    const probability = getPredictionProbability(row);
    return probability !== null && row.labelAvailable && row.readmitted30d !== null;
  });

  if (!eligibleRows.length) {
    return {
      status: 'insufficient_data',
      eligibleCount: 0,
      brierScore: null,
      expectedCalibrationError: null,
      maxCalibrationGap: null,
      bins: []
    };
  }

  const binCount = Math.min(5, Math.max(3, Math.floor(Math.sqrt(eligibleRows.length))));
  const bins = Array.from({ length: binCount }, (_, index) => ({
    index,
    count: 0,
    predictedTotal: 0,
    observedTotal: 0
  }));

  let brierTotal = 0;

  eligibleRows.forEach((row) => {
    const probability = getPredictionProbability(row);
    const observed = row.readmitted30d === 1 ? 1 : 0;
    const scaled = Math.min(binCount - 1, Math.floor(probability * binCount));
    const bucket = bins[scaled];
    bucket.count += 1;
    bucket.predictedTotal += probability;
    bucket.observedTotal += observed;
    brierTotal += (probability - observed) ** 2;
  });

  const calibrationBins = bins
    .filter((bucket) => bucket.count > 0)
    .map((bucket) => {
      const predictedMean = bucket.predictedTotal / bucket.count;
      const observedRate = bucket.observedTotal / bucket.count;
      return {
        label: `${roundMetric(bucket.index / binCount, 2)}-${roundMetric((bucket.index + 1) / binCount, 2)}`,
        count: bucket.count,
        averagePrediction: roundMetric(predictedMean),
        observedRate: roundMetric(observedRate),
        gap: roundMetric(Math.abs(predictedMean - observedRate))
      };
    });

  const expectedCalibrationError = calibrationBins.reduce(
    (sum, bucket) => sum + (bucket.gap * bucket.count) / eligibleRows.length,
    0
  );
  const maxCalibrationGap = calibrationBins.reduce(
    (maxGap, bucket) => Math.max(maxGap, bucket.gap),
    0
  );

  const status =
    maxCalibrationGap >= 0.2 || expectedCalibrationError >= 0.12
      ? 'alert'
      : maxCalibrationGap >= 0.1 || expectedCalibrationError >= 0.06
        ? 'watch'
        : 'stable';

  return {
    status,
    eligibleCount: eligibleRows.length,
    brierScore: roundMetric(brierTotal / eligibleRows.length),
    expectedCalibrationError: roundMetric(expectedCalibrationError),
    maxCalibrationGap: roundMetric(maxCalibrationGap),
    bins: calibrationBins
  };
}

function createCohortSummary(label, rows = []) {
  const predictedRows = rows.filter((row) => getPredictionProbability(row) !== null);
  const labelledRows = rows.filter((row) => row.labelAvailable);

  return {
    label,
    count: rows.length,
    labelledCount: labelledRows.length,
    predictionCoverage: safeRate(predictedRows.length, rows.length),
    readmissionRate30d: safeRate(
      labelledRows.filter((row) => row.readmitted30d === 1).length,
      labelledRows.length
    ),
    averagePredictionProbability: roundMetric(
      average(predictedRows, (row) => getPredictionProbability(row) || 0)
    ),
    fallbackRate: safeRate(
      predictedRows.filter((row) => row.predictionMethod === 'rules').length,
      predictedRows.length
    ),
    averageFeatureCompleteness: roundMetric(
      average(rows, (row) => toNumber(row.featureCompleteness, 0))
    )
  };
}

function buildGroupedCohorts(rows = [], key, limit = 10) {
  const buckets = new Map();

  rows.forEach((row) => {
    const label =
      row[key] === undefined || row[key] === null || row[key] === ''
        ? 'unknown'
        : String(row[key]);
    if (!buckets.has(label)) {
      buckets.set(label, []);
    }
    buckets.get(label).push(row);
  });

  return Array.from(buckets.entries())
    .map(([label, groupedRows]) => createCohortSummary(label, groupedRows))
    .sort((left, right) => right.count - left.count)
    .slice(0, limit);
}

function buildPriorityConditionCohorts(rows = []) {
  const definitions = [
    ['malaria', 'hasMalaria'],
    ['hiv', 'hasHiv'],
    ['on_art', 'onArt'],
    ['tuberculosis', 'hasTuberculosis'],
    ['severe_acute_malnutrition', 'hasSevereAcuteMalnutrition'],
    ['sickle_cell_disease', 'hasSickleCellDisease'],
    ['neonatal_risk', 'neonatalRisk']
  ];

  return definitions.map(([label, key]) => {
    const cohortRows = rows.filter((row) => Boolean(row[key]));
    return createCohortSummary(label, cohortRows);
  });
}

function buildDriftSnapshot(rows = []) {
  const orderedRows = [...rows]
    .filter((row) => Number.isFinite(getEventTimestamp(row)))
    .sort((left, right) => getEventTimestamp(left) - getEventTimestamp(right));

  if (orderedRows.length < 6) {
    return {
      status: 'insufficient_data',
      baselineWindow: {
        count: orderedRows.length,
        ...formatDateRange(orderedRows)
      },
      recentWindow: {
        count: 0,
        start: null,
        end: null
      },
      signals: []
    };
  }

  const recentSize = Math.max(2, Math.floor(orderedRows.length * 0.3));
  const baselineRows = orderedRows.slice(0, orderedRows.length - recentSize);
  const recentRows = orderedRows.slice(-recentSize);

  const createSignal = (metric, baselineValue, recentValue, threshold) => {
    const delta = recentValue - baselineValue;
    const absoluteDelta = Math.abs(delta);
    return {
      metric,
      baseline: roundMetric(baselineValue),
      recent: roundMetric(recentValue),
      delta: roundMetric(delta),
      threshold,
      status:
        absoluteDelta >= threshold
          ? 'alert'
          : absoluteDelta >= threshold / 2
            ? 'watch'
            : 'stable'
    };
  };

  const baselinePredicted = baselineRows.filter((row) => getPredictionProbability(row) !== null);
  const recentPredicted = recentRows.filter((row) => getPredictionProbability(row) !== null);
  const baselineLabelled = baselineRows.filter((row) => row.labelAvailable);
  const recentLabelled = recentRows.filter((row) => row.labelAvailable);

  const signals = [
    createSignal(
      'readmissionRate30d',
      safeRate(
        baselineLabelled.filter((row) => row.readmitted30d === 1).length,
        baselineLabelled.length
      ),
      safeRate(
        recentLabelled.filter((row) => row.readmitted30d === 1).length,
        recentLabelled.length
      ),
      0.08
    ),
    createSignal(
      'averagePredictionProbability',
      average(baselinePredicted, (row) => getPredictionProbability(row) || 0),
      average(recentPredicted, (row) => getPredictionProbability(row) || 0),
      0.08
    ),
    createSignal(
      'fallbackRate',
      safeRate(
        baselinePredicted.filter((row) => row.predictionMethod === 'rules').length,
        baselinePredicted.length
      ),
      safeRate(
        recentPredicted.filter((row) => row.predictionMethod === 'rules').length,
        recentPredicted.length
      ),
      0.1
    ),
    createSignal(
      'averageFeatureCompleteness',
      average(baselineRows, (row) => toNumber(row.featureCompleteness, 0)),
      average(recentRows, (row) => toNumber(row.featureCompleteness, 0)),
      0.08
    )
  ];

  return {
    status: signals.some((signal) => signal.status === 'alert')
      ? 'alert'
      : signals.some((signal) => signal.status === 'watch')
        ? 'watch'
        : 'stable',
    baselineWindow: {
      count: baselineRows.length,
      ...formatDateRange(baselineRows)
    },
    recentWindow: {
      count: recentRows.length,
      ...formatDateRange(recentRows)
    },
    signals
  };
}

function summarizeMissingData(rows = []) {
  const missingFieldCounts = {};

  rows.forEach((row) => {
    const fields = Array.isArray(row.missingData) ? row.missingData : [];
    fields.forEach((field) => {
      missingFieldCounts[field] = (missingFieldCounts[field] || 0) + 1;
    });
  });

  return {
    rowsWithLowCompleteness: rows.filter((row) => toNumber(row.featureCompleteness, 0) < 0.6).length,
    rowsWithAnyCriticalMissingness: rows.filter(
      (row) => Array.isArray(row.missingData) && row.missingData.length > 0
    ).length,
    topMissingFields: Object.entries(missingFieldCounts)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 10)
      .map(([field, count]) => ({
        field,
        count,
        rate: safeRate(count, rows.length)
      }))
  };
}

function buildTanzaniaCoverageSnapshot(rows = []) {
  const definitions = [
    ['malaria', 'hasMalaria'],
    ['hiv', 'hasHiv'],
    ['on_art', 'onArt'],
    ['tuberculosis', 'hasTuberculosis'],
    ['severe_acute_malnutrition', 'hasSevereAcuteMalnutrition'],
    ['sickle_cell_disease', 'hasSickleCellDisease'],
    ['neonatal_risk', 'neonatalRisk']
  ];

  const conditionCoverage = definitions.map(([label, key]) => {
    const positiveRows = rows.filter((row) => Boolean(row[key]));
    return {
      condition: label,
      count: positiveRows.length,
      rate: safeRate(positiveRows.length, rows.length),
      labelledReadmissionRate: safeRate(
        positiveRows.filter((row) => row.labelAvailable && row.readmitted30d === 1).length,
        positiveRows.filter((row) => row.labelAvailable).length
      )
    };
  });

  const rowsWithAnyPriorityCondition = rows.filter((row) =>
    definitions.some(([, key]) => Boolean(row[key]))
  );

  return {
    rowsWithAnyPriorityCondition: {
      count: rowsWithAnyPriorityCondition.length,
      rate: safeRate(rowsWithAnyPriorityCondition.length, rows.length)
    },
    rowsWithNoPriorityCondition: {
      count: rows.length - rowsWithAnyPriorityCondition.length,
      rate: safeRate(rows.length - rowsWithAnyPriorityCondition.length, rows.length)
    },
    conditions: conditionCoverage
  };
}

function buildThresholdSnapshot({
  fallbackRate,
  calibration,
  criticalFieldCoverage,
  drift
}) {
  const fallbackThreshold = {
    metric: 'fallbackRate',
    threshold: 0.35,
    value: fallbackRate,
    triggered: fallbackRate >= 0.35
  };
  const calibrationThreshold = {
    metric: 'expectedCalibrationError',
    threshold: 0.1,
    value: calibration.expectedCalibrationError,
    triggered:
      calibration.expectedCalibrationError !== null && calibration.expectedCalibrationError >= 0.1
  };
  const criticalFieldThreshold = {
    metric: 'criticalFieldCoverage',
    threshold: 0.75,
    value: criticalFieldCoverage,
    triggered: Object.values(criticalFieldCoverage).some((coverage) => coverage < 0.75)
  };
  const driftThreshold = {
    metric: 'driftStatus',
    threshold: 'watch',
    value: drift.status,
    triggered: ['watch', 'alert'].includes(drift.status)
  };

  const checks = [fallbackThreshold, calibrationThreshold, criticalFieldThreshold, driftThreshold];

  return {
    checks,
    operationalReviewRequired: checks.some((check) => check.triggered)
  };
}

async function buildModelMonitoringSnapshot(user, query = {}) {
  const dataset = await buildTrainingDataset(user, {
    ...query,
    includeIdentifiers: false
  });
  const rows = dataset.rows;
  const labelledRows = rows.filter((row) => row.labelAvailable);
  const predictedRows = rows.filter((row) => row.predictionScore !== null);
  const fallbackRows = predictedRows.filter((row) => row.predictionMethod === 'rules');
  const averageCompleteness = rows.length
    ? Number(
        (
          rows.reduce((sum, row) => sum + toNumber(row.featureCompleteness, 0), 0) / rows.length
        ).toFixed(3)
      )
    : 0;
  const averageProbability = predictedRows.length
    ? Number(
        (
          predictedRows.reduce((sum, row) => sum + toNumber(row.predictionProbability, 0), 0) /
          predictedRows.length
        ).toFixed(3)
      )
    : 0;
  const criticalFieldCoverage = summarizeCriticalFieldCoverage(rows);
  const calibration = buildCalibrationSnapshot(rows);
  const drift = buildDriftSnapshot(rows);
  const missingness = summarizeMissingData(rows);
  const cohorts = {
    gender: buildGroupedCohorts(labelledRows, 'gender', 6),
    facility: buildGroupedCohorts(labelledRows, 'facilityId', 10),
    predictionTier: buildGroupedCohorts(predictedRows, 'predictionTier', 5),
    tanzaniaPriorityConditions: buildPriorityConditionCohorts(labelledRows)
  };
  const tanzaniaFeatureCoverage = buildTanzaniaCoverageSnapshot(rows);
  const thresholds = buildThresholdSnapshot({
    fallbackRate: predictedRows.length
      ? Number((fallbackRows.length / predictedRows.length).toFixed(3))
      : 0,
    calibration,
    criticalFieldCoverage,
    drift
  });

  return {
    generatedAt: dataset.generatedAt,
    patientCount: dataset.patientCount,
    visitCount: rows.length,
    labelledCount: labelledRows.length,
    predictionCoverage: dataset.predictionCoverage,
    readmissionRate30d: labelledRows.length
      ? Number(
          (
            labelledRows.filter((row) => row.readmitted30d === 1).length / labelledRows.length
          ).toFixed(3)
        )
      : 0,
    fallbackRate: predictedRows.length
      ? Number((fallbackRows.length / predictedRows.length).toFixed(3))
      : 0,
    averageFeatureCompleteness: averageCompleteness,
    averagePredictionProbability: averageProbability,
    criticalFieldCoverage,
    missingness,
    calibration,
    drift,
    cohorts,
    tanzaniaFeatureCoverage,
    thresholds,
    operationalReviewRequired: thresholds.operationalReviewRequired,
    modelVersionBreakdown: countBy(predictedRows, 'predictionModelVersion'),
    methodBreakdown: countBy(predictedRows, 'predictionMethod'),
    tierBreakdown: countBy(predictedRows, 'predictionTier')
  };
}

module.exports = {
  ensureMlExportAccess,
  parseDatasetOptions,
  buildTrainingDataset,
  buildModelMonitoringSnapshot,
  serializeRowsToCsv
};
