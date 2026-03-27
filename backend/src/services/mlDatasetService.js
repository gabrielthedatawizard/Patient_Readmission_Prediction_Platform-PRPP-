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

function summarizeCriticalFieldCoverage(rows = []) {
  return CRITICAL_FIELDS.reduce((summary, field) => {
    const presentCount = rows.filter((row) => row[field] !== null && row[field] !== undefined).length;
    summary[field] = rows.length ? Number((presentCount / rows.length).toFixed(3)) : 0;
    return summary;
  }, {});
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
    criticalFieldCoverage: summarizeCriticalFieldCoverage(rows),
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
