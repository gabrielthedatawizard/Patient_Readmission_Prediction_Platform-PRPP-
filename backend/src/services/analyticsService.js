const {
  getFacilityById,
  listPatientsForUser,
  listPredictionsForPatient,
  listTasksForUser
} = require('../data');

function toDate(value, fallback) {
  if (!value) {
    return fallback;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function normalizeDateRange({ days = 30, startDate, endDate } = {}) {
  const end = toDate(endDate, new Date());
  const startFallback = new Date(end.getTime() - Number(days || 30) * 24 * 60 * 60 * 1000);
  const start = toDate(startDate, startFallback);

  return { startDate: start, endDate: end };
}

function isInWindow(value, startDate, endDate) {
  const parsed = toDate(value, null);
  if (!parsed) {
    return false;
  }

  return parsed >= startDate && parsed <= endDate;
}

function extractPatientTimestamp(patient) {
  return patient.admissionDate || patient.dischargeDate || patient.updatedAt || patient.createdAt;
}

function extractLengthOfStay(patient) {
  const profile = patient.clinicalProfile || {};
  const los = Number(
    profile.lengthOfStayDays ??
      patient.lengthOfStay ??
      patient.lengthOfStayDays ??
      0
  );

  return Number.isFinite(los) ? los : 0;
}

async function buildPredictionIndex(user, patients) {
  const entries = await Promise.all(
    patients.map(async (patient) => {
      const predictions = await listPredictionsForPatient(user, patient.id);
      return [patient.id, predictions[0] || null];
    })
  );

  return new Map(entries);
}

async function getDashboardKPIs(user, options = {}) {
  const { startDate, endDate } = normalizeDateRange(options);
  const facilityId = options.facilityId || null;
  const allPatients = await listPatientsForUser(user, {
    ...(facilityId ? { facilityId } : {})
  });
  const patients = allPatients.filter((patient) =>
    isInWindow(extractPatientTimestamp(patient), startDate, endDate)
  );

  const predictionByPatient = await buildPredictionIndex(user, patients);
  const tasks = await listTasksForUser(user, {});
  const scopedTaskPatientIds = new Set(patients.map((patient) => patient.id));
  const scopedTasks = tasks.filter((task) => scopedTaskPatientIds.has(task.patientId));

  const totalPatients = patients.length;
  const highRiskCount = patients.reduce((count, patient) => {
    const prediction = predictionByPatient.get(patient.id);
    return prediction?.tier === 'High' ? count + 1 : count;
  }, 0);
  const readmissions = patients.reduce((count, patient) => {
    const priorAdmissions = Number(patient.clinicalProfile?.priorAdmissions12m || 0);
    return priorAdmissions > 0 ? count + 1 : count;
  }, 0);
  const completedTasks = scopedTasks.filter((task) => task.status === 'done').length;
  const totalTasks = scopedTasks.length;
  const avgLengthOfStayRaw = patients.reduce((sum, patient) => sum + extractLengthOfStay(patient), 0);
  const avgLengthOfStay = totalPatients
    ? Number((avgLengthOfStayRaw / totalPatients).toFixed(1))
    : 0;

  const readmissionRate = totalPatients
    ? Number(((readmissions / totalPatients) * 100).toFixed(1))
    : 0;
  const interventionRate = totalTasks
    ? Number(((completedTasks / totalTasks) * 100).toFixed(1))
    : 0;

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    totalPatients,
    highRiskCount,
    readmissions,
    readmissionRate,
    interventionRate,
    avgLengthOfStay
  };
}

async function getFacilityComparison(user, options = {}) {
  const { startDate, endDate } = normalizeDateRange(options);
  const patients = await listPatientsForUser(user, {});
  const scopedPatients = patients.filter((patient) =>
    isInWindow(extractPatientTimestamp(patient), startDate, endDate)
  );
  const predictionByPatient = await buildPredictionIndex(user, scopedPatients);

  const grouped = new Map();
  for (const patient of scopedPatients) {
    const facilityId = patient.facilityId || 'unknown';
    if (!grouped.has(facilityId)) {
      grouped.set(facilityId, {
        facilityId,
        totalPatients: 0,
        highRiskCount: 0,
        readmissions: 0,
        scoreTotal: 0,
        scoreCount: 0
      });
    }

    const bucket = grouped.get(facilityId);
    bucket.totalPatients += 1;
    bucket.readmissions += Number(patient.clinicalProfile?.priorAdmissions12m || 0) > 0 ? 1 : 0;

    const prediction = predictionByPatient.get(patient.id);
    if (prediction?.tier === 'High') {
      bucket.highRiskCount += 1;
    }

    if (Number.isFinite(Number(prediction?.score))) {
      bucket.scoreTotal += Number(prediction.score);
      bucket.scoreCount += 1;
    }
  }

  const rows = await Promise.all(
    Array.from(grouped.values()).map(async (bucket) => {
      const facility = await getFacilityById(bucket.facilityId);
      const readmissionRate = bucket.totalPatients
        ? Number(((bucket.readmissions / bucket.totalPatients) * 100).toFixed(1))
        : 0;
      const averageRiskScore = bucket.scoreCount
        ? Number((bucket.scoreTotal / bucket.scoreCount).toFixed(1))
        : 0;

      return {
        facilityId: bucket.facilityId,
        facilityName: facility?.name || bucket.facilityId,
        region: facility?.regionCode || null,
        totalPatients: bucket.totalPatients,
        highRiskCount: bucket.highRiskCount,
        readmissionRate,
        avgRiskScore: averageRiskScore
      };
    })
  );

  return rows.sort((left, right) => right.totalPatients - left.totalPatients);
}

async function detectAnomalies(user, options = {}) {
  const now = new Date();
  const current = await getDashboardKPIs(user, {
    facilityId: options.facilityId,
    startDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    endDate: now
  });
  const previous = await getDashboardKPIs(user, {
    facilityId: options.facilityId,
    startDate: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
    endDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  });

  const anomalies = [];

  if (previous.readmissionRate > 0 && current.readmissionRate > previous.readmissionRate * 1.2) {
    anomalies.push({
      type: 'readmission_spike',
      severity: 'high',
      message: `Readmission rate increased from ${previous.readmissionRate.toFixed(1)}% to ${current.readmissionRate.toFixed(1)}%.`,
      action: 'Review recent discharge cases and adherence interventions.'
    });
  }

  if (current.interventionRate > 0 && current.interventionRate < 70) {
    anomalies.push({
      type: 'low_intervention',
      severity: 'medium',
      message: `Intervention completion is ${current.interventionRate.toFixed(1)}% in the last 7 days.`,
      action: 'Follow up on pending tasks with discharge coordinators.'
    });
  }

  if (current.highRiskCount > current.totalPatients * 0.35 && current.totalPatients > 0) {
    anomalies.push({
      type: 'high_risk_load',
      severity: 'medium',
      message: `High-risk caseload is ${current.highRiskCount}/${current.totalPatients} in the last 7 days.`,
      action: 'Consider additional clinician review and CHW follow-up capacity.'
    });
  }

  return anomalies;
}

module.exports = {
  getDashboardKPIs,
  getFacilityComparison,
  detectAnomalies
};

