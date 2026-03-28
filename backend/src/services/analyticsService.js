const {
  getFacilityById,
  listAuditLogsForUser,
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

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

const FACILITY_BED_CAPACITY = {
  'FAC-MNH-001': 1500,
  'FAC-ARH-001': 900,
  'FAC-MWZ-001': 900,
  'FAC-DOD-001': 400,
  'FAC-MBE-001': 630
};

function estimateCapacityByLevel(level) {
  const normalized = String(level || '').toLowerCase();
  if (normalized.includes('national')) {
    return 1500;
  }
  if (normalized.includes('zonal')) {
    return 650;
  }
  if (normalized.includes('regional')) {
    return 900;
  }
  if (normalized.includes('district')) {
    return 300;
  }
  return 250;
}

function getPatientFacilityTimestamp(patient) {
  return (
    patient.admissionDate ||
    patient.updatedAt ||
    patient.createdAt ||
    patient.dischargeDate
  );
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

function createScopedFacilitySet(options = {}) {
  const facilityIds = new Set();

  if (options.facilityId) {
    facilityIds.add(String(options.facilityId));
  }

  if (Array.isArray(options.facilityIds)) {
    options.facilityIds
      .filter(Boolean)
      .forEach((facilityId) => facilityIds.add(String(facilityId)));
  }

  return facilityIds.size ? facilityIds : null;
}

function filterPatientsByFacilityScope(patients = [], options = {}) {
  const scopedFacilities = createScopedFacilitySet(options);
  if (!scopedFacilities) {
    return patients;
  }

  return patients.filter((patient) => scopedFacilities.has(String(patient.facilityId || '')));
}

async function getDashboardKPIs(user, options = {}) {
  const { startDate, endDate } = normalizeDateRange(options);
  const allPatients = await listPatientsForUser(user, {});
  const patients = filterPatientsByFacilityScope(allPatients, options).filter((patient) =>
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
  const scopedPatients = filterPatientsByFacilityScope(patients, options).filter((patient) =>
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
        district: facility?.district || null,
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
    facilityIds: options.facilityIds,
    startDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    endDate: now
  });
  const previous = await getDashboardKPIs(user, {
    facilityId: options.facilityId,
    facilityIds: options.facilityIds,
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

async function getBedForecast(user, options = {}) {
  const requestedDays = Number(options.days || 7);
  const horizonDays = clamp(Number.isFinite(requestedDays) ? requestedDays : 7, 3, 14);
  const facilityId = options.facilityId || null;
  const facilityIds = createScopedFacilitySet(options);

  const patients = filterPatientsByFacilityScope(
    await listPatientsForUser(user, {}),
    {
      facilityId,
      facilityIds: facilityIds ? Array.from(facilityIds) : undefined
    }
  );
  if (!patients.length) {
    return {
      generatedAt: new Date().toISOString(),
      horizonDays,
      network: [],
      facilities: []
    };
  }

  const predictionByPatient = await buildPredictionIndex(user, patients);
  const activePatients = patients.filter(
    (patient) => !['discharged', 'followup'].includes(String(patient.status || '').toLowerCase())
  );

  const forecastFacilityIds = facilityId
    ? [facilityId]
    : Array.from(new Set(patients.map((patient) => patient.facilityId).filter(Boolean)));

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const facilityForecasts = await Promise.all(
    forecastFacilityIds.map(async (id) => {
      const facility = await getFacilityById(id);
      const capacity = FACILITY_BED_CAPACITY[id] || estimateCapacityByLevel(facility?.level);
      const facilityPatients = patients.filter((patient) => patient.facilityId === id);
      const facilityActive = activePatients.filter((patient) => patient.facilityId === id);

      const recentAdmissions = facilityPatients.filter((patient) =>
        isInWindow(getPatientFacilityTimestamp(patient), thirtyDaysAgo, now)
      ).length;
      const baselineAdmissions = Math.max(recentAdmissions / 30, 0.4);

      const highRiskCount = facilityActive.reduce((count, patient) => {
        const prediction = predictionByPatient.get(patient.id);
        return prediction?.tier === 'High' ? count + 1 : count;
      }, 0);
      const highRiskShare =
        facilityActive.length > 0 ? highRiskCount / facilityActive.length : 0;

      let projectedOccupiedBeds = facilityActive.length;
      const timeline = [];

      for (let dayOffset = 1; dayOffset <= horizonDays; dayOffset += 1) {
        const date = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
        const weekdayCycle = 1 + Math.sin((date.getDay() / 7) * Math.PI * 2) * 0.04;
        const riskPressure = 1 + Math.min(highRiskShare * 0.25, 0.25);
        const predictedAdmissions = Math.max(
          0,
          Math.round(baselineAdmissions * weekdayCycle * riskPressure)
        );

        const dischargeReadiness = 0.11 + (1 - highRiskShare) * 0.04;
        const predictedDischarges = Math.max(
          0,
          Math.round(projectedOccupiedBeds * dischargeReadiness)
        );

        projectedOccupiedBeds = clamp(
          projectedOccupiedBeds + predictedAdmissions - predictedDischarges,
          0,
          Math.round(capacity * 1.3)
        );

        const projectedOccupancyRate =
          capacity > 0 ? Number(((projectedOccupiedBeds / capacity) * 100).toFixed(1)) : 0;

        timeline.push({
          date: date.toISOString(),
          dayLabel: date.toLocaleDateString('en-US', { weekday: 'short' }),
          predictedAdmissions,
          predictedDischarges,
          projectedOccupiedBeds,
          projectedOccupancyRate,
          status:
            projectedOccupancyRate >= 95
              ? 'critical'
              : projectedOccupancyRate >= 85
                ? 'watch'
                : 'stable'
        });
      }

      return {
        facilityId: id,
        facilityName: facility?.name || id,
        bedCapacity: capacity,
        currentOccupiedBeds: facilityActive.length,
        currentOccupancyRate: capacity
          ? Number(((facilityActive.length / capacity) * 100).toFixed(1))
          : 0,
        forecast: timeline
      };
    })
  );

  const network = [];
  for (let index = 0; index < horizonDays; index += 1) {
    const byDay = facilityForecasts.map((row) => row.forecast[index]).filter(Boolean);
    const projectedOccupiedBeds = byDay.reduce(
      (sum, day) => sum + Number(day.projectedOccupiedBeds || 0),
      0
    );
    const predictedAdmissions = byDay.reduce(
      (sum, day) => sum + Number(day.predictedAdmissions || 0),
      0
    );
    const predictedDischarges = byDay.reduce(
      (sum, day) => sum + Number(day.predictedDischarges || 0),
      0
    );
    const totalCapacity = facilityForecasts.reduce(
      (sum, row) => sum + Number(row.bedCapacity || 0),
      0
    );
    const projectedOccupancyRate = totalCapacity
      ? Number(((projectedOccupiedBeds / totalCapacity) * 100).toFixed(1))
      : 0;

    network.push({
      date: byDay[0]?.date || new Date(now.getTime() + (index + 1) * 24 * 60 * 60 * 1000).toISOString(),
      dayLabel: byDay[0]?.dayLabel || `D+${index + 1}`,
      projectedOccupiedBeds,
      projectedOccupancyRate,
      predictedAdmissions,
      predictedDischarges,
      targetOccupancyRate: 85
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    horizonDays,
    facilities: facilityForecasts,
    network
  };
}

async function getAutomationSummary(user, options = {}) {
  const { startDate, endDate } = normalizeDateRange(options);
  const patients = filterPatientsByFacilityScope(await listPatientsForUser(user, {}), options);
  const scopedPatients = patients.filter((patient) =>
    isInWindow(getPatientFacilityTimestamp(patient), startDate, endDate)
  );
  const tasks = await listTasksForUser(user, {});
  const auditLogs = await listAuditLogsForUser(user, { limit: 500 });

  const predictions = await Promise.all(
    scopedPatients.map(async (patient) => {
      const rows = await listPredictionsForPatient(user, patient.id);
      return rows.filter((prediction) => isInWindow(prediction.generatedAt, startDate, endDate));
    })
  );

  const flattenedPredictions = predictions.flat();
  const mlPredictions = flattenedPredictions.filter((prediction) => !prediction.fallbackUsed).length;
  const fallbackPredictions = flattenedPredictions.filter((prediction) => prediction.fallbackUsed).length;
  const highRiskPredictions = flattenedPredictions.filter(
    (prediction) => Number(prediction.score || 0) >= 80 || prediction.tier === 'High'
  ).length;

  const scopedTasks = tasks.filter((task) => isInWindow(task.createdAt, startDate, endDate));
  const autoGeneratedTasks = scopedTasks.filter((task) =>
    ['medication', 'followup', 'education'].includes(String(task.category || '').toLowerCase())
  ).length;

  const riskAlertsSent = auditLogs.filter(
    (log) =>
      log.action === 'risk_alert_dispatched' &&
      isInWindow(log.createdAt, startDate, endDate)
  ).length;
  const smsDeliveries = auditLogs.filter(
    (log) =>
      log.action === 'risk_alert_sms_delivery' &&
      isInWindow(log.createdAt, startDate, endDate)
  );
  const riskAlertSmsSubmitted = smsDeliveries.filter((log) =>
    ['submitted', 'buffered'].includes(String(log.details?.status || '').toLowerCase())
  ).length;
  const riskAlertSmsFailed = smsDeliveries.filter((log) =>
    ['failed', 'provider_not_configured', 'provider_disabled'].includes(
      String(log.details?.status || '').toLowerCase()
    )
  ).length;
  const riskAlertSmsSkipped = smsDeliveries.filter((log) =>
    String(log.details?.status || '').toLowerCase().startsWith('skipped_')
  ).length;
  const nlpExtractions = auditLogs.filter(
    (log) =>
      log.action === 'discharge_summary_extracted' &&
      isInWindow(log.createdAt, startDate, endDate)
  ).length;

  return {
    generatedAt: new Date().toISOString(),
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    totalPredictions: flattenedPredictions.length,
    mlPredictions,
    fallbackPredictions,
    highRiskPredictions,
    riskAlertsSent,
    riskAlertSmsSubmitted,
    riskAlertSmsFailed,
    riskAlertSmsSkipped,
    autoGeneratedTasks,
    nlpExtractions,
    automationCoverage: flattenedPredictions.length
      ? Number(
          (
            ((riskAlertsSent > 0 ? 1 : 0) +
              (autoGeneratedTasks > 0 ? 1 : 0) +
              (nlpExtractions > 0 ? 1 : 0)) /
            3
          ).toFixed(2)
        )
      : 0
  };
}

module.exports = {
  getDashboardKPIs,
  getFacilityComparison,
  detectAnomalies,
  getBedForecast,
  getAutomationSummary
};
