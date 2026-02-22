const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const { ROLES } = require('../config/roles');

const DEMO_PASSWORD = 'Trip@2026';
const DEFAULT_PASSWORD_HASH = bcrypt.hashSync(DEMO_PASSWORD, 10);

const facilities = [
  { id: 'FAC-MNH-001', name: 'Muhimbili National Hospital', regionCode: 'DAR', district: 'Ilala', level: 'national_referral' },
  { id: 'FAC-ARH-001', name: 'Arusha Regional Hospital', regionCode: 'ARU', district: 'Arusha', level: 'regional_referral' },
  { id: 'FAC-MWZ-001', name: 'Mwanza Regional Hospital', regionCode: 'MWZ', district: 'Nyamagana', level: 'regional_referral' },
  { id: 'FAC-DOD-001', name: 'Dodoma District Hospital', regionCode: 'DOD', district: 'Dodoma', level: 'district' },
  { id: 'FAC-MBE-001', name: 'Mbeya Zonal Hospital', regionCode: 'MBE', district: 'Mbeya', level: 'zonal_referral' }
];

const roleToFacility = {
  facility_manager: 'FAC-MNH-001',
  clinician: 'FAC-ARH-001',
  nurse: 'FAC-ARH-001',
  pharmacist: 'FAC-MWZ-001',
  hro: 'FAC-DOD-001',
  chw: 'FAC-DOD-001'
};

const roleToRegion = {
  rhmt: 'DAR',
  chmt: 'ARU'
};

const users = ROLES.map((role, index) => {
  const facilityId = roleToFacility[role] || null;
  const regionCode = roleToRegion[role] || (facilityId ? getFacilityById(facilityId)?.regionCode || null : null);

  return {
    id: `USR-${String(index + 1).padStart(4, '0')}`,
    email: `${role}@trip.go.tz`,
    passwordHash: DEFAULT_PASSWORD_HASH,
    fullName: `${role.replace('_', ' ')} Demo User`,
    role,
    facilityId,
    regionCode,
    mfaEnabled: false,
    createdAt: new Date().toISOString()
  };
});

const patients = [
  {
    id: 'PT-2026-0001',
    name: 'Amina Mwambungu',
    age: 67,
    gender: 'female',
    phone: '+255700100001',
    address: 'Ilala, Dar es Salaam',
    insurance: 'NHIF',
    facilityId: 'FAC-MNH-001',
    status: 'admitted',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    clinicalProfile: {
      age: 67,
      priorAdmissions12m: 3,
      lengthOfStayDays: 9,
      charlsonIndex: 4,
      egfr: 52,
      hemoglobin: 9.6,
      hba1c: 8.9,
      phoneAccess: true,
      transportationDifficulty: true,
      livesAlone: false,
      highRiskMedicationCount: 2,
      icuStayDays: 0,
      bpSystolic: 148,
      bpDiastolic: 92
    }
  },
  {
    id: 'PT-2026-0002',
    name: 'Juma Kweka',
    age: 44,
    gender: 'male',
    phone: '+255700100002',
    address: 'Arusha City, Arusha',
    insurance: 'Cash',
    facilityId: 'FAC-ARH-001',
    status: 'admitted',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    clinicalProfile: {
      age: 44,
      priorAdmissions12m: 1,
      lengthOfStayDays: 4,
      charlsonIndex: 2,
      egfr: 82,
      hemoglobin: 12.5,
      hba1c: 7.2,
      phoneAccess: true,
      transportationDifficulty: false,
      livesAlone: false,
      highRiskMedicationCount: 0,
      icuStayDays: 0,
      bpSystolic: 130,
      bpDiastolic: 85
    }
  },
  {
    id: 'PT-2026-0003',
    name: 'Rehema Mussa',
    age: 73,
    gender: 'female',
    phone: null,
    address: 'Chamwino, Dodoma',
    insurance: 'NHIF',
    facilityId: 'FAC-DOD-001',
    status: 'discharge_planning',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    clinicalProfile: {
      age: 73,
      priorAdmissions12m: 2,
      lengthOfStayDays: 11,
      charlsonIndex: 5,
      egfr: null,
      hemoglobin: 10.1,
      hba1c: null,
      phoneAccess: false,
      transportationDifficulty: true,
      livesAlone: true,
      highRiskMedicationCount: 1,
      icuStayDays: 1,
      bpSystolic: null,
      bpDiastolic: null
    }
  }
];

const predictions = [];
const tasks = [];
const auditLogs = [];

function nowIso() {
  return new Date().toISOString();
}

function getFacilityById(facilityId) {
  return facilities.find((facility) => facility.id === facilityId) || null;
}

function getUserByEmail(email) {
  return users.find((user) => user.email.toLowerCase() === String(email || '').toLowerCase()) || null;
}

function getUserById(id) {
  return users.find((user) => user.id === id) || null;
}

function toPublicUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    facilityId: user.facilityId,
    regionCode: user.regionCode,
    mfaEnabled: user.mfaEnabled
  };
}

function canAccessFacility(user, facilityId) {
  const facility = getFacilityById(facilityId);

  if (!user || !facility) {
    return false;
  }

  if (user.role === 'moh' || user.role === 'ml_engineer') {
    return true;
  }

  if (user.role === 'rhmt' || user.role === 'chmt') {
    return user.regionCode === facility.regionCode;
  }

  return user.facilityId === facilityId;
}

function canAccessPatient(user, patient) {
  if (!user || !patient) {
    return false;
  }

  return canAccessFacility(user, patient.facilityId);
}

function listPatientsForUser(user, filters = {}) {
  const normalizedSearch = String(filters.search || '').toLowerCase().trim();

  return patients.filter((patient) => {
    if (!canAccessPatient(user, patient)) {
      return false;
    }

    if (filters.facilityId && patient.facilityId !== filters.facilityId) {
      return false;
    }

    if (filters.status && patient.status !== filters.status) {
      return false;
    }

    if (normalizedSearch) {
      const matches =
        patient.id.toLowerCase().includes(normalizedSearch) ||
        patient.name.toLowerCase().includes(normalizedSearch);

      if (!matches) {
        return false;
      }
    }

    return true;
  });
}

function getPatientById(patientId) {
  return patients.find((patient) => patient.id === patientId) || null;
}

function getPatientForUser(user, patientId) {
  const patient = getPatientById(patientId);

  if (!patient || !canAccessPatient(user, patient)) {
    return null;
  }

  return patient;
}

function createPatientForUser(user, payload) {
  const facilityId = payload.facilityId || user.facilityId;

  if (!facilityId || !canAccessFacility(user, facilityId)) {
    throw new Error('You do not have access to create a patient in this facility.');
  }

  const patient = {
    id: payload.id,
    name: payload.name,
    age: payload.age,
    gender: String(payload.gender || '').toLowerCase(),
    phone: payload.phone || null,
    address: payload.address || null,
    insurance: payload.insurance || null,
    facilityId,
    status: payload.status || 'admitted',
    createdAt: nowIso(),
    updatedAt: nowIso(),
    clinicalProfile: payload.clinicalProfile || {
      age: payload.age
    }
  };

  patients.push(patient);
  return patient;
}

function updatePatientForUser(user, patientId, payload) {
  const patient = getPatientForUser(user, patientId);

  if (!patient) {
    return null;
  }

  if (payload.facilityId && payload.facilityId !== patient.facilityId) {
    if (!canAccessFacility(user, payload.facilityId)) {
      throw new Error('You do not have access to move this patient to the requested facility.');
    }

    patient.facilityId = payload.facilityId;
  }

  if (payload.name !== undefined) {
    patient.name = payload.name;
  }

  if (payload.age !== undefined) {
    patient.age = payload.age;
  }

  if (payload.gender !== undefined) {
    patient.gender = String(payload.gender).toLowerCase();
  }

  if (payload.phone !== undefined) {
    patient.phone = payload.phone;
  }

  if (payload.address !== undefined) {
    patient.address = payload.address;
  }

  if (payload.insurance !== undefined) {
    patient.insurance = payload.insurance;
  }

  if (payload.status !== undefined) {
    patient.status = payload.status;
  }

  if (payload.clinicalProfile && typeof payload.clinicalProfile === 'object') {
    patient.clinicalProfile = {
      ...patient.clinicalProfile,
      ...payload.clinicalProfile
    };
  }

  patient.updatedAt = nowIso();
  return patient;
}

function createPrediction(entry) {
  const prediction = {
    id: entry.id || randomUUID(),
    patientId: entry.patientId,
    facilityId: entry.facilityId,
    score: entry.score,
    tier: entry.tier,
    confidence: entry.confidence,
    confidenceInterval: entry.confidenceInterval,
    modelVersion: entry.modelVersion,
    modelType: entry.modelType,
    fallbackUsed: Boolean(entry.fallbackUsed),
    factors: entry.factors || [],
    explanation: entry.explanation || null,
    dataQuality: entry.dataQuality || null,
    createdBy: entry.createdBy || null,
    generatedAt: nowIso(),
    override: null
  };

  predictions.push(prediction);
  return prediction;
}

function getPredictionById(predictionId) {
  return predictions.find((prediction) => prediction.id === predictionId) || null;
}

function getPredictionForUser(user, predictionId) {
  const prediction = getPredictionById(predictionId);

  if (!prediction || !canAccessFacility(user, prediction.facilityId)) {
    return null;
  }

  return prediction;
}

function listPredictionsForPatient(user, patientId) {
  const patient = getPatientForUser(user, patientId);

  if (!patient) {
    return [];
  }

  return predictions
    .filter((prediction) => prediction.patientId === patientId)
    .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
}

function updatePredictionOverrideForUser(user, predictionId, overridePayload) {
  const prediction = getPredictionForUser(user, predictionId);

  if (!prediction) {
    return null;
  }

  prediction.override = {
    overriddenBy: user.id,
    previousTier: prediction.tier,
    newTier: overridePayload.newTier,
    reason: overridePayload.reason,
    overriddenAt: nowIso()
  };

  prediction.tier = overridePayload.newTier;
  return prediction;
}

function createTasks(taskEntries) {
  const createdTasks = taskEntries.map((entry) => {
    const task = {
      id: entry.id || randomUUID(),
      patientId: entry.patientId,
      predictionId: entry.predictionId,
      facilityId: entry.facilityId,
      title: entry.title,
      category: entry.category,
      priority: entry.priority,
      status: entry.status || 'pending',
      dueDate: entry.dueDate,
      assignee: entry.assignee || null,
      createdBy: entry.createdBy || null,
      completedAt: null,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };

    tasks.push(task);
    return task;
  });

  return createdTasks;
}

function listTasksForUser(user, filters = {}) {
  return tasks.filter((task) => {
    if (!canAccessFacility(user, task.facilityId)) {
      return false;
    }

    if (filters.patientId && task.patientId !== filters.patientId) {
      return false;
    }

    if (filters.status && task.status !== filters.status) {
      return false;
    }

    if (filters.priority && task.priority !== filters.priority) {
      return false;
    }

    return true;
  });
}

function updateTaskForUser(user, taskId, patch) {
  const task = tasks.find((item) => item.id === taskId);

  if (!task || !canAccessFacility(user, task.facilityId)) {
    return null;
  }

  if (patch.status !== undefined) {
    task.status = patch.status;
  }

  if (patch.assignee !== undefined) {
    task.assignee = patch.assignee;
  }

  if (patch.dueDate !== undefined) {
    task.dueDate = patch.dueDate;
  }

  if (task.status === 'done') {
    task.completedAt = nowIso();
  }

  task.updatedAt = nowIso();
  return task;
}

function createAuditLog(entry) {
  const log = {
    id: randomUUID(),
    userId: entry.userId || null,
    userRole: entry.userRole || null,
    action: entry.action,
    resource: entry.resource || null,
    details: entry.details || null,
    ipAddress: entry.ipAddress || null,
    facilityId: entry.facilityId || null,
    regionCode: entry.regionCode || null,
    createdAt: nowIso()
  };

  auditLogs.unshift(log);
  if (auditLogs.length > 5000) {
    auditLogs.length = 5000;
  }

  return log;
}

function listAuditLogsForUser(user, options = {}) {
  const limit = Math.min(Number(options.limit) || 100, 500);
  const offset = Math.max(Number(options.offset) || 0, 0);

  const scoped = auditLogs.filter((log) => {
    if (user.role === 'moh' || user.role === 'ml_engineer') {
      return true;
    }

    if (user.role === 'rhmt') {
      return log.regionCode === user.regionCode;
    }

    return log.facilityId === user.facilityId;
  });

  return scoped.slice(offset, offset + limit);
}

function buildDataQualitySnapshot() {
  const criticalFields = ['egfr', 'hba1c', 'bpSystolic', 'bpDiastolic', 'hemoglobin'];
  let totalCells = 0;
  let presentCells = 0;

  patients.forEach((patient) => {
    criticalFields.forEach((field) => {
      totalCells += 1;

      const value = patient.clinicalProfile?.[field];
      if (value !== null && value !== undefined && value !== '') {
        presentCells += 1;
      }
    });
  });

  const completeness = totalCells === 0 ? 1 : presentCells / totalCells;

  return {
    generatedAt: nowIso(),
    patientCount: patients.length,
    criticalFieldCompleteness: Number(completeness.toFixed(3)),
    qualityStatus: completeness < 0.7 ? 'alert' : 'ok'
  };
}

function buildFairnessSnapshot() {
  const totals = new Map();

  predictions.forEach((prediction) => {
    const patient = getPatientById(prediction.patientId);
    if (!patient) {
      return;
    }

    const key = patient.gender || 'unknown';
    if (!totals.has(key)) {
      totals.set(key, { count: 0, scoreSum: 0 });
    }

    const current = totals.get(key);
    current.count += 1;
    current.scoreSum += prediction.score;
  });

  const groups = Array.from(totals.entries()).map(([group, stats]) => ({
    group,
    predictionCount: stats.count,
    meanScore: Number((stats.scoreSum / stats.count).toFixed(2))
  }));

  const means = groups.map((group) => group.meanScore);
  const variance = means.length >= 2 ? Math.max(...means) - Math.min(...means) : 0;

  return {
    generatedAt: nowIso(),
    dimension: 'gender',
    groups,
    variance,
    fairnessStatus: variance > 12 ? 'alert' : 'ok'
  };
}

module.exports = {
  DEMO_PASSWORD,
  facilities,
  users,
  getFacilityById,
  getUserByEmail,
  getUserById,
  toPublicUser,
  canAccessFacility,
  canAccessPatient,
  listPatientsForUser,
  getPatientById,
  getPatientForUser,
  createPatientForUser,
  updatePatientForUser,
  createPrediction,
  getPredictionForUser,
  listPredictionsForPatient,
  updatePredictionOverrideForUser,
  createTasks,
  listTasksForUser,
  updateTaskForUser,
  createAuditLog,
  listAuditLogsForUser,
  buildDataQualitySnapshot,
  buildFairnessSnapshot
};
