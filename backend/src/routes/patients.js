/**
 * Backend Routes - Patients
 * Includes row-level access control and data quality validation.
 */

const express = require('express');
const {
  appendSyncEvent,
  createPatientForUser,
  createVisitForUser,
  getPatientForUser,
  getFacilityById,
  listPatientsForUser,
  listPredictionsForPatient,
  listVisitsForPatient,
  listTasksForUser,
  updatePatientForUser
} = require('../data');
const { requireAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/authorize');
const { logAudit } = require('../services/auditService');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

const ALLOWED_GENDERS = new Set(['male', 'female', 'other']);
const ALLOWED_STATUS = new Set(['admitted', 'discharge_planning', 'discharged', 'followup']);

function validateClinicalProfile(profile = {}) {
  const errors = [];

  const ranges = [
    ['egfr', 0, 200],
    ['hba1c', 3, 20],
    ['bpSystolic', 50, 300],
    ['bpDiastolic', 30, 200],
    ['hemoglobin', 2, 25],
    ['charlsonIndex', 0, 20],
    ['priorAdmissions12m', 0, 50],
    ['lengthOfStayDays', 0, 365]
  ];

  ranges.forEach(([field, min, max]) => {
    if (profile[field] === null || profile[field] === undefined || profile[field] === '') {
      return;
    }

    const numericValue = Number(profile[field]);

    if (!Number.isFinite(numericValue) || numericValue < min || numericValue > max) {
      errors.push(`${field} must be between ${min} and ${max}.`);
    }
  });

  return errors;
}

function validatePatientPayload(payload, { partial = false } = {}) {
  const errors = [];

  if (!partial && !payload.id) {
    errors.push('Patient id is required.');
  }

  if (!partial && !payload.name) {
    errors.push('Patient name is required.');
  }

  if (!partial && payload.age === undefined) {
    errors.push('Age is required.');
  }

  if (payload.age !== undefined) {
    const age = Number(payload.age);
    if (!Number.isInteger(age) || age < 0 || age > 120) {
      errors.push('Age must be an integer between 0 and 120.');
    }
  }

  if (!partial && !payload.gender) {
    errors.push('Gender is required.');
  }

  if (payload.gender !== undefined) {
    const gender = String(payload.gender).toLowerCase();
    if (!ALLOWED_GENDERS.has(gender)) {
      errors.push('Gender must be one of: male, female, other.');
    }
  }

  if (payload.status !== undefined && !ALLOWED_STATUS.has(payload.status)) {
    errors.push('Status must be one of: admitted, discharge_planning, discharged, followup.');
  }

  if (payload.clinicalProfile && typeof payload.clinicalProfile === 'object') {
    errors.push(...validateClinicalProfile(payload.clinicalProfile));
  }

  return errors;
}

function toArray(value) {
  if (value === undefined || value === null || value === '') {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  return String(value)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function validateEncounterPayload(payload = {}) {
  const errors = [];

  if (!payload.admissionDate) {
    errors.push('admissionDate is required.');
  }

  if (payload.admissionDate && Number.isNaN(new Date(payload.admissionDate).getTime())) {
    errors.push('admissionDate must be a valid ISO date.');
  }

  if (payload.dischargeDate && Number.isNaN(new Date(payload.dischargeDate).getTime())) {
    errors.push('dischargeDate must be a valid ISO date.');
  }

  const diagnosis = String(payload.diagnosis || '').trim();
  const diagnoses = toArray(payload.diagnoses);

  if (!diagnosis && diagnoses.length === 0) {
    errors.push('diagnosis or diagnoses is required.');
  }

  if (payload.lengthOfStay !== undefined) {
    const lengthOfStay = Number(payload.lengthOfStay);
    if (!Number.isInteger(lengthOfStay) || lengthOfStay < 0 || lengthOfStay > 365) {
      errors.push('lengthOfStay must be an integer between 0 and 365.');
    }
  }

  if (payload.labResults && typeof payload.labResults !== 'object') {
    errors.push('labResults must be an object.');
  }

  if (payload.vitalSigns && typeof payload.vitalSigns !== 'object') {
    errors.push('vitalSigns must be an object.');
  }

  if (payload.socialFactors && typeof payload.socialFactors !== 'object') {
    errors.push('socialFactors must be an object.');
  }

  if (payload.medications && !Array.isArray(payload.medications) && typeof payload.medications !== 'string') {
    errors.push('medications must be an array or comma-separated string.');
  }

  return errors;
}

function parseCsv(value) {
  if (!value) {
    return [];
  }
  return String(value)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

router.use(requireAuth);

router.get('/', requirePermission('patients:read'), asyncHandler(async (req, res) => {
  const include = new Set(parseCsv(req.query.include));
  const assignedTo = String(req.query.assignedTo || '').trim();
  const allPatients = await listPatientsForUser(req.user, {
    search: req.query.search,
    status: req.query.status,
    facilityId: req.query.facilityId
  });

  let patients = allPatients;

  if (assignedTo) {
    const assigneeId = assignedTo === 'self' ? req.user.id : assignedTo;
    const assignedTasks = await listTasksForUser(req.user, {
      assignee: assigneeId
    });
    if (assignedTasks.length > 0) {
      const assignedPatientIds = new Set(assignedTasks.map((task) => task.patientId));
      patients = patients.filter((patient) => assignedPatientIds.has(patient.id));
    }
  }

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.max(1, parseInt(req.query.limit, 10) || 20);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  const paginatedPatients = patients.slice(startIndex, endIndex);

  const withFacility = await Promise.all(
    paginatedPatients.map(async (patient) => {
      const [facility, predictions, tasks] = await Promise.all([
        getFacilityById(patient.facilityId),
        include.has('predictions') ? listPredictionsForPatient(req.user, patient.id) : Promise.resolve([]),
        include.has('tasks') ? listTasksForUser(req.user, { patientId: patient.id }) : Promise.resolve([])
      ]);

      return {
        ...patient,
        facility,
        ...(include.has('predictions')
          ? {
              predictions,
              latestPrediction: predictions[0] || null
            }
          : {}),
        ...(include.has('tasks')
          ? {
              tasks,
              pendingTasks: tasks.filter((task) => task.status !== 'done').length
            }
          : {})
      };
    })
  );

  await logAudit(req, {
    action: 'patients_list_viewed',
    resource: 'patients:list',
    details: {
      count: withFacility.length
    }
  });

  return res.json({
    count: patients.length,
    patients: withFacility,
    pagination: {
      total: patients.length,
      page,
      limit,
      totalPages: Math.ceil(patients.length / limit)
    }
  });
}));

router.get('/:id', requirePermission('patients:read'), asyncHandler(async (req, res) => {
  const patient = await getPatientForUser(req.user, req.params.id);

  if (!patient) {
    return res.status(404).json({
      error: 'NotFound',
      message: 'Patient not found or not accessible.'
    });
  }

  await logAudit(req, {
    action: 'patient_viewed',
    resource: `patient:${patient.id}`
  });

  const facility = await getFacilityById(patient.facilityId);

  return res.json({
    patient: {
      ...patient,
      facility
    }
  });
}));

router.get('/:id/encounters', requirePermission('patients:read'), asyncHandler(async (req, res) => {
  const patient = await getPatientForUser(req.user, req.params.id);

  if (!patient) {
    return res.status(404).json({
      error: 'NotFound',
      message: 'Patient not found or not accessible.'
    });
  }

  const visits = await listVisitsForPatient(req.user, req.params.id);

  await logAudit(req, {
    action: 'patient_encounters_viewed',
    resource: `patient:${patient.id}`,
    details: {
      count: visits.length
    }
  });

  return res.json({
    patientId: patient.id,
    count: visits.length,
    encounters: visits
  });
}));

router.post('/:id/encounters', requirePermission('patients:write'), asyncHandler(async (req, res) => {
  const patient = await getPatientForUser(req.user, req.params.id);

  if (!patient) {
    return res.status(404).json({
      error: 'NotFound',
      message: 'Patient not found or not accessible.'
    });
  }

  const payload = req.body || {};
  const errors = validateEncounterPayload(payload);

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'ValidationError',
      message: 'Encounter payload validation failed.',
      details: errors
    });
  }

  const diagnosis = String(payload.diagnosis || '').trim();
  const diagnoses = toArray(payload.diagnoses);

  try {
    const visit = await createVisitForUser(req.user, patient.id, {
      ...payload,
      diagnosis: diagnosis || String(diagnoses[0] || '').trim(),
      diagnoses: diagnoses.length ? diagnoses : diagnosis ? [diagnosis] : [],
      medications: toArray(payload.medications),
      lengthOfStay:
        payload.lengthOfStay !== undefined ? Number(payload.lengthOfStay) : undefined
    });

    await logAudit(req, {
      action: 'patient_encounter_created',
      resource: `visit:${visit.id}`,
      details: {
        patientId: patient.id
      }
    });

    await appendSyncEvent({
      facilityId: visit.facilityId,
      eventType: 'mutation',
      operation: 'visit_created',
      entityType: 'visit',
      entityId: visit.id,
      payload: {
        patientId: patient.id,
        visitId: visit.id
      },
      actorUserId: req.user.id,
      ipAddress: req.ip
    });

    return res.status(201).json({ encounter: visit });
  } catch (error) {
    return res.status(403).json({
      error: 'Forbidden',
      message: error.message
    });
  }
}));

router.post('/', requirePermission('patients:write'), asyncHandler(async (req, res) => {
  const payload = req.body || {};
  const errors = validatePatientPayload(payload, { partial: false });

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'ValidationError',
      message: 'Patient payload validation failed.',
      details: errors
    });
  }

  try {
    const patient = await createPatientForUser(req.user, {
      ...payload,
      age: Number(payload.age)
    });

    await logAudit(req, {
      action: 'patient_created',
      resource: `patient:${patient.id}`,
      details: {
        facilityId: patient.facilityId
      }
    });

    await appendSyncEvent({
      facilityId: patient.facilityId,
      eventType: 'mutation',
      operation: 'patient_created',
      entityType: 'patient',
      entityId: patient.id,
      payload: {
        patientId: patient.id,
        status: patient.status
      },
      actorUserId: req.user.id,
      ipAddress: req.ip
    });

    return res.status(201).json({ patient });
  } catch (error) {
    return res.status(403).json({
      error: 'Forbidden',
      message: error.message
    });
  }
}));

router.put('/:id', requirePermission('patients:write'), asyncHandler(async (req, res) => {
  const payload = req.body || {};
  const errors = validatePatientPayload(payload, { partial: true });

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'ValidationError',
      message: 'Patient payload validation failed.',
      details: errors
    });
  }

  try {
    const patient = await updatePatientForUser(req.user, req.params.id, payload);

    if (!patient) {
      return res.status(404).json({
        error: 'NotFound',
        message: 'Patient not found or not accessible.'
      });
    }

    await logAudit(req, {
      action: 'patient_updated',
      resource: `patient:${patient.id}`
    });

    await appendSyncEvent({
      facilityId: patient.facilityId,
      eventType: 'mutation',
      operation: 'patient_updated',
      entityType: 'patient',
      entityId: patient.id,
      payload: {
        patientId: patient.id,
        status: patient.status
      },
      actorUserId: req.user.id,
      ipAddress: req.ip
    });

    return res.json({ patient });
  } catch (error) {
    return res.status(403).json({
      error: 'Forbidden',
      message: error.message
    });
  }
}));

module.exports = router;
