/**
 * Backend Routes - CHW
 * Community visit plans for CHW dashboard/mobile workflows.
 */

const express = require('express');
const { listPatientsForUser, listPredictionsForPatient } = require('../data');
const { requireAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/authorize');
const { requireRoleFeature } = require('../middleware/roleAccess');
const { buildTaskPatientSummary } = require('../config/roleAccess');
const { logAudit } = require('../services/auditService');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

router.use(requireAuth);

router.get(
  '/:id/visits',
  requirePermission('patients:read'),
  requireRoleFeature('communityVisits', 'This role does not use the community follow-up workspace.'),
  asyncHandler(async (req, res) => {
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
        patientSummary: buildTaskPatientSummary(req.user, patient, { latestPrediction: latest }),
        riskTier: latest?.tier || 'Low'
      };
    })
  );

  const sorted = scoredPatients
    .sort((left, right) => {
      const tierOrder = { High: 3, Medium: 2, Low: 1 };
      return Number(tierOrder[right.riskTier] || 0) - Number(tierOrder[left.riskTier] || 0);
    })
    .slice(0, 15);

  const today = sorted.slice(0, 8).map((entry, index) => ({
    id: `visit-${entry.patientSummary?.id || index}-${index}`,
    priority: entry.riskTier === 'High' ? 'high' : 'medium',
    scheduledDate: selectedDate.toISOString(),
    patient: {
      ...(entry.patientSummary || {}),
      riskTier: entry.riskTier
    }
  }));

  const overdue = sorted.slice(8, 10).map((entry, index) => ({
    id: `overdue-${entry.patientSummary?.id || index}-${index}`,
    priority: 'high',
    scheduledDate: new Date(selectedDate.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    patient: {
      ...(entry.patientSummary || {}),
      riskTier: entry.riskTier
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
  })
);

module.exports = router;
