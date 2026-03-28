const FIRST_NAMES = [
  'Amina',
  'Juma',
  'Neema',
  'Bakari',
  'Rehema',
  'Kelvin',
  'Farida',
  'Zawadi',
  'Moses',
  'Halima'
];

const LAST_NAMES = [
  'Mwakipesile',
  'Mushi',
  'Mrema',
  'Kweka',
  'Msuya',
  'Temu',
  'Mhando',
  'Mganga',
  'Mfaume',
  'Mallya'
];

const DIAGNOSES = [
  { code: 'B50.9', label: 'Malaria', group: 'malaria' },
  { code: 'J18.9', label: 'Pneumonia', group: 'respiratory' },
  { code: 'A15.0', label: 'Tuberculosis', group: 'tb' },
  { code: 'D57.1', label: 'Sickle cell crisis', group: 'sickle_cell' },
  { code: 'O14.9', label: 'Hypertensive disorder of pregnancy', group: 'obstetric' },
  { code: 'B20', label: 'HIV disease', group: 'hiv' }
];

function hashSeed(value) {
  return String(value || '')
    .split('')
    .reduce((total, character, index) => total + character.charCodeAt(0) * (index + 3), 0);
}

function pick(values, seed) {
  if (!values.length) {
    return null;
  }

  return values[Math.abs(seed) % values.length];
}

function round(value, digits = 3) {
  return Number(Number(value || 0).toFixed(digits));
}

function percentage(numerator, denominator) {
  if (!denominator) {
    return 0;
  }

  return round((numerator / denominator) * 100, 1);
}

function formatIsoDate(daysAgo) {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() - daysAgo);
  return now.toISOString();
}

function buildSandboxDataset(facilities = []) {
  const patients = [];
  const visits = [];
  const predictions = [];
  const tasks = [];
  const alerts = [];
  const trainingRows = [];

  facilities.forEach((facility, facilityIndex) => {
    const facilitySeed = hashSeed(facility.id || facility.name || facilityIndex);
    const patientCount = 6 + (facilitySeed % 4);

    for (let index = 0; index < patientCount; index += 1) {
      const seed = facilitySeed + index * 17;
      const diagnosis = pick(DIAGNOSES, seed);
      const firstName = pick(FIRST_NAMES, seed + 3);
      const lastName = pick(LAST_NAMES, seed + 11);
      const age = 18 + (seed % 57);
      const priorAdmissions12m = seed % 4;
      const readmitted30d = priorAdmissions12m > 1 || diagnosis.group === 'tb' ? 1 : index % 5 === 0 ? 1 : 0;
      const probability = round(0.12 + ((seed % 72) / 100), 3);
      const score = Math.max(18, Math.min(94, Math.round(probability * 100)));
      const tier = score >= 75 ? 'High' : score >= 45 ? 'Medium' : 'Low';
      const fallbackUsed = index % 6 === 0;
      const patientId = `SBX-${facility.id}-PT-${String(index + 1).padStart(3, '0')}`;
      const visitId = `SBX-${facility.id}-VIS-${String(index + 1).padStart(3, '0')}`;
      const predictionId = `SBX-${facility.id}-PRED-${String(index + 1).padStart(3, '0')}`;
      const taskId = `SBX-${facility.id}-TASK-${String(index + 1).padStart(3, '0')}`;
      const alertId = `SBX-${facility.id}-ALERT-${String(index + 1).padStart(3, '0')}`;
      const admissionDate = formatIsoDate(45 + facilityIndex * 5 + index * 3);
      const dischargeDate = formatIsoDate(40 + facilityIndex * 5 + index * 3);
      const generatedAt = formatIsoDate(38 + facilityIndex * 5 + index * 3);
      const featureCompleteness = round(0.82 + ((seed % 15) / 100), 3);
      const gender = index % 2 === 0 ? 'female' : 'male';

      patients.push({
        id: patientId,
        name: `${firstName} ${lastName}`,
        age,
        gender,
        phone: `+2557${String(10000000 + seed).slice(-8)}`,
        address: `${facility.district}, ${facility.region || facility.regionCode}`,
        insurance: index % 3 === 0 ? 'NHIF' : 'Cash',
        status: index % 4 === 0 ? 'discharge_planning' : 'admitted',
        facilityId: facility.id,
        createdAt: admissionDate,
        updatedAt: generatedAt,
        clinicalProfile: {
          priorAdmissions12m,
          lengthOfStayDays: 3 + (seed % 9),
          charlsonIndex: seed % 6,
          highRiskMedicationCount: seed % 3,
          malariaHistory: diagnosis.group === 'malaria',
          hivArtStatus: diagnosis.group === 'hiv',
          tbTreatmentStatus: diagnosis.group === 'tb',
          samIndicators: index % 9 === 0,
          sickleCellMarkers: diagnosis.group === 'sickle_cell',
          phoneAccess: true,
          transportationDifficulty: index % 4 === 0,
          livesAlone: index % 3 === 0
        }
      });

      visits.push({
        id: visitId,
        patientId,
        facilityId: facility.id,
        admissionDate,
        dischargeDate,
        diagnosis: diagnosis.code,
        diagnoses: [diagnosis.code],
        ward: facility.level?.includes('regional') ? 'Medical Ward' : 'General Ward',
        lengthOfStay: 3 + (seed % 9)
      });

      predictions.push({
        id: predictionId,
        patientId,
        visitId,
        facilityId: facility.id,
        score,
        probability,
        tier,
        modelVersion: fallbackUsed ? 'trip-sandbox-rules-v1' : 'trip-sandbox-xgb-v1',
        modelType: fallbackUsed ? 'rules_fallback' : 'xgboost_surrogate',
        method: fallbackUsed ? 'rules' : 'ml',
        fallbackUsed,
        generatedAt
      });

      tasks.push({
        id: taskId,
        patientId,
        predictionId,
        facilityId: facility.id,
        title: tier === 'High' ? 'Confirm follow-up package' : 'Review discharge education',
        priority: tier === 'High' ? 'high' : 'medium',
        status: index % 3 === 0 ? 'done' : 'pending',
        dueDate: formatIsoDate(35 + facilityIndex * 4 + index * 2)
      });

      if (tier === 'High') {
        alerts.push({
          id: alertId,
          patientId,
          predictionId,
          facilityId: facility.id,
          score,
          threshold: 75,
          tier,
          status: index % 4 === 0 ? 'acknowledged' : 'open',
          createdAt: generatedAt
        });
      }

      trainingRows.push({
        patientId,
        patientPseudoId: patientId,
        facilityId: facility.id,
        facilityName: facility.name,
        regionCode: facility.regionCode || null,
        district: facility.district || null,
        age,
        gender,
        diagnosisCode: diagnosis.code,
        diagnosisLabel: diagnosis.label,
        admissionDate,
        dischargeDate,
        lengthOfStayDays: 3 + (seed % 9),
        priorAdmissions12m,
        charlsonIndex: seed % 6,
        highRiskMedicationCount: seed % 3,
        malariaHistory: diagnosis.group === 'malaria' ? 1 : 0,
        hivArtStatus: diagnosis.group === 'hiv' ? 1 : 0,
        tbTreatmentStatus: diagnosis.group === 'tb' ? 1 : 0,
        samIndicators: index % 9 === 0 ? 1 : 0,
        sickleCellMarkers: diagnosis.group === 'sickle_cell' ? 1 : 0,
        predictionScore: score,
        predictionProbability: probability,
        predictionTier: tier,
        predictionGeneratedAt: generatedAt,
        fallbackUsed,
        modelVersion: fallbackUsed ? 'trip-sandbox-rules-v1' : 'trip-sandbox-xgb-v1',
        method: fallbackUsed ? 'rules' : 'ml',
        labelAvailable: true,
        readmitted30d,
        featureCompleteness
      });
    }
  });

  return {
    facilities,
    patients,
    visits,
    predictions,
    tasks,
    alerts,
    trainingRows
  };
}

function getSandboxDashboardKPIs(facilities = []) {
  const dataset = buildSandboxDataset(facilities);
  const completedTasks = dataset.tasks.filter((task) => task.status === 'done').length;
  const highRiskCount = dataset.predictions.filter((prediction) => prediction.tier === 'High').length;
  const readmissions = dataset.trainingRows.filter((row) => row.readmitted30d === 1).length;

  return {
    generatedAt: new Date().toISOString(),
    totalPatients: dataset.patients.length,
    highRiskCount,
    readmissions,
    readmissionRate: percentage(readmissions, dataset.trainingRows.length),
    interventionRate: percentage(completedTasks, dataset.tasks.length),
    avgLengthOfStay: round(
      dataset.trainingRows.reduce((total, row) => total + Number(row.lengthOfStayDays || 0), 0) /
        Math.max(dataset.trainingRows.length, 1),
      1
    )
  };
}

function getSandboxFacilityComparison(facilities = []) {
  const dataset = buildSandboxDataset(facilities);

  return facilities
    .map((facility) => {
      const facilityRows = dataset.trainingRows.filter((row) => row.facilityId === facility.id);
      const facilityPredictions = dataset.predictions.filter(
        (prediction) => prediction.facilityId === facility.id
      );
      const readmissions = facilityRows.filter((row) => row.readmitted30d === 1).length;
      const highRisk = facilityPredictions.filter((prediction) => prediction.tier === 'High').length;

      return {
        facilityId: facility.id,
        facilityName: facility.name,
        region: facility.regionCode || null,
        district: facility.district || null,
        totalPatients: facilityRows.length,
        highRiskCount: highRisk,
        readmissionRate: percentage(readmissions, facilityRows.length),
        avgRiskScore: round(
          facilityPredictions.reduce((total, prediction) => total + Number(prediction.score || 0), 0) /
            Math.max(facilityPredictions.length, 1),
          1
        )
      };
    })
    .sort((left, right) => right.totalPatients - left.totalPatients);
}

function getSandboxRegionalPerformance(facilities = []) {
  const rows = getSandboxFacilityComparison(facilities);
  const buckets = new Map();

  rows.forEach((row) => {
    const key = row.region || 'UNKNOWN';
    if (!buckets.has(key)) {
      buckets.set(key, {
        region: key,
        regionCode: key,
        facilityCount: 0,
        readmissionTotal: 0,
        highRiskCount: 0,
        totalPatients: 0
      });
    }

    const bucket = buckets.get(key);
    bucket.facilityCount += 1;
    bucket.readmissionTotal += Number(row.readmissionRate || 0);
    bucket.highRiskCount += Number(row.highRiskCount || 0);
    bucket.totalPatients += Number(row.totalPatients || 0);
  });

  return {
    count: rows.length,
    regions: Array.from(buckets.values()).map((bucket) => ({
      region: bucket.region,
      regionCode: bucket.regionCode,
      facilityCount: bucket.facilityCount,
      readmissionRate: bucket.facilityCount
        ? round(bucket.readmissionTotal / bucket.facilityCount, 1)
        : 0,
      highRiskCount: bucket.highRiskCount,
      totalPatients: bucket.totalPatients
    }))
  };
}

function getSandboxAnomalies(facilities = []) {
  const rows = getSandboxFacilityComparison(facilities);

  return rows
    .filter((row) => row.readmissionRate >= 18 || row.highRiskCount >= 3)
    .slice(0, 4)
    .map((row) => ({
      type: 'facility_watch',
      severity: row.readmissionRate >= 22 ? 'high' : 'medium',
      message: `${row.facilityName} has a ${row.readmissionRate.toFixed(1)}% sandbox readmission rate.`,
      action: 'Review discharge coordination, follow-up completion, and escalation workload.'
    }));
}

function getSandboxPolicyRecommendations(facilities = []) {
  const anomalies = getSandboxAnomalies(facilities);
  if (anomalies.length) {
    return {
      count: anomalies.length,
      recommendations: anomalies.map((item) => ({
        title: item.type,
        message: item.message,
        action: item.action,
        priority: item.severity === 'high' ? 'high' : 'medium'
      }))
    };
  }

  return {
    count: 1,
    recommendations: [
      {
        title: 'Sandbox readiness',
        message: 'The DHIS2-backed sandbox hierarchy is stable enough for regional walkthroughs and discharge-review practice.',
        action: 'Use the hierarchy navigator to compare facilities before enabling live operational reviews.',
        priority: 'low'
      }
    ]
  };
}

function getSandboxBedForecast(facilities = [], options = {}) {
  const facilityId = String(options.facilityId || '').trim();
  const selectedFacility = facilities.find((facility) => facility.id === facilityId) || facilities[0] || null;
  const horizonDays = Math.min(Math.max(Number(options.days) || 7, 3), 14);
  const baseline = selectedFacility ? 22 + (hashSeed(selectedFacility.id) % 18) : 30;

  return {
    generatedAt: new Date().toISOString(),
    horizonDays,
    facilityId: selectedFacility?.id || null,
    facilityName: selectedFacility?.name || 'Sandbox facility',
    forecast: Array.from({ length: horizonDays }).map((_, index) => ({
      day: index + 1,
      projectedOccupiedBeds: baseline + (index % 3) * 4,
      projectedDischarges: 3 + (index % 2),
      projectedAdmissions: 4 + (index % 4)
    }))
  };
}

function getSandboxAutomationSummary(facilities = []) {
  const dataset = buildSandboxDataset(facilities);
  const submittedAlerts = dataset.alerts.length;
  const completedTasks = dataset.tasks.filter((task) => task.status === 'done').length;

  return {
    generatedAt: new Date().toISOString(),
    tasksCompleted: completedTasks,
    totalTasks: dataset.tasks.length,
    interventionRate: percentage(completedTasks, dataset.tasks.length),
    alertsGenerated: submittedAlerts,
    smsSubmitted: Math.max(0, Math.floor(submittedAlerts * 0.6)),
    smsFailed: Math.max(0, Math.ceil(submittedAlerts * 0.1)),
    smsSkipped: Math.max(0, submittedAlerts - Math.floor(submittedAlerts * 0.7))
  };
}

function getSandboxQualitySnapshot(facilities = []) {
  const dataset = buildSandboxDataset(facilities);
  const completeness = round(
    dataset.trainingRows.reduce((total, row) => total + Number(row.featureCompleteness || 0), 0) /
      Math.max(dataset.trainingRows.length, 1),
    3
  );

  return {
    generatedAt: new Date().toISOString(),
    patientCount: dataset.patients.length,
    criticalFieldCompleteness: completeness,
    missingPhoneRate: round(
      dataset.patients.filter((patient) => !patient.phone).length / Math.max(dataset.patients.length, 1),
      3
    ),
    missingAddressRate: 0,
    labelCoverage: 1
  };
}

function getSandboxFairnessSnapshot(facilities = []) {
  const dataset = buildSandboxDataset(facilities);
  const femaleRows = dataset.trainingRows.filter((row) => row.gender === 'female');
  const maleRows = dataset.trainingRows.filter((row) => row.gender === 'male');
  const femaleRate = femaleRows.filter((row) => row.readmitted30d === 1).length / Math.max(femaleRows.length, 1);
  const maleRate = maleRows.filter((row) => row.readmitted30d === 1).length / Math.max(maleRows.length, 1);

  return {
    generatedAt: new Date().toISOString(),
    dimension: 'gender',
    fairnessStatus: Math.abs(femaleRate - maleRate) > 0.08 ? 'watch' : 'stable',
    variance: round(Math.abs(femaleRate - maleRate) * 100, 1),
    groups: [
      { label: 'female', rate: round(femaleRate, 3), count: femaleRows.length },
      { label: 'male', rate: round(maleRate, 3), count: maleRows.length }
    ]
  };
}

function countBy(items = [], selector) {
  return items.reduce((bucket, item) => {
    const key = selector(item) || 'unknown';
    bucket[key] = (bucket[key] || 0) + 1;
    return bucket;
  }, {});
}

function getSandboxMonitoringSnapshot(facilities = []) {
  const dataset = buildSandboxDataset(facilities);
  const readmissions = dataset.trainingRows.filter((row) => row.readmitted30d === 1).length;
  const fallbackCount = dataset.predictions.filter((prediction) => prediction.fallbackUsed).length;
  const avgProbability =
    dataset.predictions.reduce((total, prediction) => total + Number(prediction.probability || 0), 0) /
    Math.max(dataset.predictions.length, 1);
  const avgCompleteness =
    dataset.trainingRows.reduce((total, row) => total + Number(row.featureCompleteness || 0), 0) /
    Math.max(dataset.trainingRows.length, 1);

  return {
    generatedAt: new Date().toISOString(),
    patientCount: dataset.patients.length,
    visitCount: dataset.visits.length,
    labelledCount: dataset.trainingRows.length,
    predictionCoverage: 1,
    fallbackRate: round(fallbackCount / Math.max(dataset.predictions.length, 1), 3),
    readmissionRate30d: round(readmissions / Math.max(dataset.trainingRows.length, 1), 3),
    averageFeatureCompleteness: round(avgCompleteness, 3),
    averagePredictionProbability: round(avgProbability, 3),
    criticalFieldCoverage: {
      age: 1,
      diagnosisCode: 1,
      lengthOfStayDays: 1,
      priorAdmissions12m: 1,
      predictionScore: 1
    },
    modelVersionBreakdown: countBy(dataset.predictions, (prediction) => prediction.modelVersion),
    methodBreakdown: countBy(dataset.predictions, (prediction) => prediction.method),
    tierBreakdown: countBy(dataset.predictions, (prediction) => prediction.tier),
    operationalReviewRequired: fallbackCount > dataset.predictions.length * 0.2
  };
}

function getSandboxTrainingDataset(facilities = [], query = {}) {
  const dataset = buildSandboxDataset(facilities);
  const format = String(query.format || 'json').trim().toLowerCase();
  const labelledOnly = String(query.labelledOnly || 'true') !== 'false';
  const rows = labelledOnly
    ? dataset.trainingRows.filter((row) => row.labelAvailable)
    : dataset.trainingRows;

  return {
    generatedAt: new Date().toISOString(),
    options: {
      format,
      labelledOnly,
      facilityId: query.facilityId || null
    },
    patientCount: dataset.patients.length,
    count: rows.length,
    labelledCount: rows.filter((row) => row.labelAvailable).length,
    positiveCount: rows.filter((row) => row.readmitted30d === 1).length,
    predictionCoverage: 1,
    fields: rows.length ? Object.keys(rows[0]) : [],
    rows
  };
}

module.exports = {
  buildSandboxDataset,
  getSandboxAnomalies,
  getSandboxAutomationSummary,
  getSandboxBedForecast,
  getSandboxDashboardKPIs,
  getSandboxFacilityComparison,
  getSandboxFairnessSnapshot,
  getSandboxMonitoringSnapshot,
  getSandboxPolicyRecommendations,
  getSandboxQualitySnapshot,
  getSandboxRegionalPerformance,
  getSandboxTrainingDataset
};
