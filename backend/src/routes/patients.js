/**
 * Backend Routes - Patients
 * Includes row-level access control and data quality validation.
 */

const express = require('express');
const {
  appendSyncEvent,
  createPatientForUser,
  getPatientForUser,
  getFacilityById,
  listPatientsForUser,
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

router.use(requireAuth);

router.get('/', requirePermission('patients:read'), asyncHandler(async (req, res) => {
  const patients = await listPatientsForUser(req.user, {
    search: req.query.search,
    status: req.query.status,
    facilityId: req.query.facilityId
  });

  const withFacility = await Promise.all(
    patients.map(async (patient) => ({
      ...patient,
      facility: await getFacilityById(patient.facilityId)
    }))
  );

  await logAudit(req, {
    action: 'patients_list_viewed',
    resource: 'patients:list',
    details: {
      count: withFacility.length
    }
  });

  return res.json({
    count: withFacility.length,
    patients: withFacility
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
