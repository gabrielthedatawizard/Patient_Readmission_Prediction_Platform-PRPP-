function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toTier(score) {
  if (score >= 70) {
    return 'High';
  }

  if (score >= 40) {
    return 'Medium';
  }

  return 'Low';
}

function calculateProfileRisk(profile = {}) {
  const age = Number(profile.age || 0);
  const priorAdmissions12m = Number(profile.priorAdmissions12m || 0);
  const lengthOfStayDays = Number(profile.lengthOfStayDays || 0);
  const charlsonIndex = Number(profile.charlsonIndex || 0);
  const highRiskMedicationCount = Number(profile.highRiskMedicationCount || 0);
  const icuStayDays = Number(profile.icuStayDays || 0);
  const egfrMissing = profile.egfr === null || profile.egfr === undefined;
  const hba1cMissing = profile.hba1c === null || profile.hba1c === undefined;
  const transportationDifficulty = Boolean(profile.transportationDifficulty);
  const livesAlone = Boolean(profile.livesAlone);
  const phoneAccess = profile.phoneAccess !== false;

  let score = 12;
  score += age >= 65 ? 14 : age >= 50 ? 8 : 3;
  score += priorAdmissions12m * 11;
  score += lengthOfStayDays * 1.8;
  score += charlsonIndex * 6;
  score += highRiskMedicationCount * 5;
  score += icuStayDays > 0 ? 8 : 0;
  score += transportationDifficulty ? 6 : 0;
  score += livesAlone ? 5 : 0;
  score += phoneAccess ? 0 : 4;
  score += egfrMissing ? 3 : 0;
  score += hba1cMissing ? 3 : 0;

  const boundedScore = Math.round(clamp(score, 1, 99));
  const completenessSignals = [egfrMissing, hba1cMissing].filter(Boolean).length;
  const confidence = Number((0.9 - completenessSignals * 0.1).toFixed(2));

  return {
    score: boundedScore,
    tier: toTier(boundedScore),
    confidence: clamp(confidence, 0.55, 0.95)
  };
}

function buildRiskFactors(prediction, patient) {
  if (prediction?.factors?.length) {
    return prediction.factors.map((factor) => ({
      factor: factor.label || factor.factor || 'Unknown factor',
      weight: Number(factor.weight || factor.value || 0),
      category: factor.category || 'clinical'
    }));
  }

  const profile = patient.clinicalProfile || {};
  const factors = [];

  if (Number(profile.priorAdmissions12m || 0) > 0) {
    factors.push({
      factor: `Prior admissions in 12m (${profile.priorAdmissions12m})`,
      weight: 0.2,
      category: 'clinical'
    });
  }

  if (Number(profile.charlsonIndex || 0) > 0) {
    factors.push({
      factor: `Comorbidity burden (Charlson ${profile.charlsonIndex})`,
      weight: 0.18,
      category: 'clinical'
    });
  }

  if (profile.transportationDifficulty) {
    factors.push({
      factor: 'Transportation difficulty reported',
      weight: 0.12,
      category: 'social'
    });
  }

  return factors;
}

function mapGender(value) {
  const normalized = String(value || '').toLowerCase();
  if (!normalized) {
    return 'Unknown';
  }
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function buildVitals(profile = {}) {
  const hasBp = profile.bpSystolic || profile.bpDiastolic;
  if (!hasBp) {
    return null;
  }

  return {
    bloodPressure: `${profile.bpSystolic || '--'}/${profile.bpDiastolic || '--'}`,
    heartRate: profile.heartRate || 78,
    temperature: profile.temperature || 36.8,
    oxygenSaturation: profile.oxygenSaturation || 96
  };
}

function buildLabs(profile = {}) {
  return {
    egfr: profile.egfr ?? null,
    hba1c: profile.hba1c ?? null,
    hemoglobin: profile.hemoglobin ?? null
  };
}

function mapTaskStatusToIntervention(status) {
  if (status === 'done') {
    return 'completed';
  }
  return status || 'pending';
}

export function mapApiPatientsToUiPatients(apiPatients = [], apiTasks = [], predictionByPatientId = {}) {
  const tasksByPatientId = new Map();
  apiTasks.forEach((task) => {
    if (!tasksByPatientId.has(task.patientId)) {
      tasksByPatientId.set(task.patientId, []);
    }
    tasksByPatientId.get(task.patientId).push(task);
  });

  return apiPatients.map((patient) => {
    const patientTasks = tasksByPatientId.get(patient.id) || [];
    const profile = patient.clinicalProfile || {};
    const latestPrediction = predictionByPatientId[patient.id] || null;
    const estimatedRisk = calculateProfileRisk(profile);
    const riskScore = latestPrediction?.score ?? estimatedRisk.score;
    const riskTier = latestPrediction?.tier || estimatedRisk.tier;
    const confidence = Number(latestPrediction?.confidence ?? estimatedRisk.confidence);
    const createdAt = patient.createdAt || new Date().toISOString();
    const admissionDate = patient.admissionDate || createdAt;
    const los = Number(profile.lengthOfStayDays || 0);

    return {
      id: patient.id,
      mrn: patient.id,
      name: patient.name,
      age: patient.age,
      gender: mapGender(patient.gender),
      facility: patient.facility?.name || patient.facilityId,
      facilityId: patient.facilityId,
      ward: patient.ward || 'General Ward',
      bed: patient.bed || null,
      admissionDate,
      expectedDischarge: patient.expectedDischarge || null,
      diagnosis: {
        primary: profile.primaryDiagnosis || patient.status?.replace('_', ' ') || 'Diagnosis pending',
        secondary: Array.isArray(profile.secondaryDiagnoses) ? profile.secondaryDiagnoses : [],
        icd10: Array.isArray(profile.icd10) ? profile.icd10 : []
      },
      riskScore,
      riskTier,
      riskConfidence: confidence,
      priorAdmissions: Number(profile.priorAdmissions12m || 0),
      priorAdmissionDates: [],
      lengthOfStay: los,
      vitals: buildVitals(profile),
      labs: buildLabs(profile),
      medications: Array.isArray(patient.medications) ? patient.medications : [],
      socialHistory: {
        livingSituation: profile.livesAlone ? 'Lives alone' : 'Lives with family',
        transportation: profile.transportationDifficulty ? 'Limited' : 'Adequate',
        phoneAccess: profile.phoneAccess !== false,
        primaryLanguage: 'Swahili',
        literacyLevel: 'Basic'
      },
      riskFactors: buildRiskFactors(latestPrediction, patient),
      interventionsNeeded: patientTasks.map((task) => ({
        type: task.category,
        priority: task.priority,
        status: mapTaskStatusToIntervention(task.status)
      }))
    };
  });
}

function mapTaskStatusToUi(status) {
  if (status === 'done') {
    return 'completed';
  }

  if (status === 'in-progress') {
    return 'in-progress';
  }

  return status || 'pending';
}

export function mapApiTasksToUiTasks(apiTasks = [], uiPatients = []) {
  const byPatientId = new Map(uiPatients.map((patient) => [patient.id, patient]));

  return apiTasks.map((task) => {
    const patient = task.patient || byPatientId.get(task.patientId) || null;
    const dueDateRaw = task.dueDate || new Date().toISOString();
    const parsedDueDate = new Date(dueDateRaw);

    return {
      id: task.id,
      type: task.category,
      title: task.title,
      patientId: task.patientId,
      patient: patient || null,
      priority: task.priority || 'medium',
      status: mapTaskStatusToUi(task.status),
      dueDate: Number.isNaN(parsedDueDate.getTime()) ? new Date() : parsedDueDate,
      category: task.category || 'intervention'
    };
  });
}

