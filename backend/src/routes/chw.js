/**
 * Backend Routes - CHW
 * Community visit plans for CHW dashboard/mobile workflows.
 */

const express = require('express');
const { listPatientsForUser, listPredictionsForPatient } = require('../data');
const { requireAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/authorize');
const { logAudit } = require('../services/auditService');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

router.use(requireAuth);

router.get('/:id/visits', requirePermission('patients:read'), asyncHandler(async (req, res) => {
  const date = req.query.date ? new Date(req.query.date) : new Date();
  const selectedDate = Number.isNaN(date.getTime()) ? new Date() : date;

  const patients = await listPatientsForUser(req.user, {
    status: 'followup'
  });

  const normalizedPatients = patients.length
    ? patients
    : await listPatientsForUser(req.user, {});

  const scoredPatients = await Promise.all(
    normalizedPatients.map(async (patient) => {
      const predictions = await listPredictionsForPatient(req.user, patient.id);
      const latest = predictions[0] || null;
      return {
        ...patient,
        riskScore: latest?.score || 0,
        riskTier: latest?.tier || 'Low'
      };
    })
  );

  const sorted = scoredPatients
    .sort((left, right) => Number(right.riskScore || 0) - Number(left.riskScore || 0))
    .slice(0, 15);

  const today = sorted.slice(0, 8).map((patient, index) => ({
    id: `visit-${patient.id}-${index}`,
    priority: Number(patient.riskScore || 0) >= 70 ? 'high' : 'medium',
    scheduledDate: selectedDate.toISOString(),
    patient: {
      id: patient.id,
      name: patient.name,
      address: patient.address || 'Address not recorded',
      phone: patient.phone || null,
      latitude: patient.clinicalProfile?.latitude || null,
      longitude: patient.clinicalProfile?.longitude || null,
      riskScore: Number(patient.riskScore || 0)
    }
  }));

  const overdue = sorted.slice(8, 10).map((patient, index) => ({
    id: `overdue-${patient.id}-${index}`,
    priority: 'high',
    scheduledDate: new Date(selectedDate.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    patient: {
      id: patient.id,
      name: patient.name,
      address: patient.address || 'Address not recorded',
      phone: patient.phone || null,
      latitude: patient.clinicalProfile?.latitude || null,
      longitude: patient.clinicalProfile?.longitude || null,
      riskScore: Number(patient.riskScore || 0)
    }
  }));

  await logAudit(req, {
    action: 'chw_visits_viewed',
    resource: `chw:${req.params.id}:visits`,
    details: {
      count: today.length,
      overdue: overdue.length
    }
  });

  return res.json({
    date: selectedDate.toISOString().split('T')[0],
    today,
    overdue
  });
}));

module.exports = router;
