/**
 * Backend Routes - CHW
 * Community visit plans for CHW dashboard/mobile workflows.
 */

const express = require('express');
const {
  getPatientForUser,
  listPatientsForUser,
  listPredictionsForPatient,
  listFollowUpSchedulesForUser,
  updateFollowUpScheduleForUser
} = require('../data');
const { requireAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/authorize');
const { requireRoleFeature } = require('../middleware/roleAccess');
const { buildTaskPatientSummary } = require('../config/roleAccess');
const { logAudit } = require('../services/auditService');
const { asyncHandler } = require('../utils/asyncHandler');
const { prisma } = require('../lib/prisma');

const router = express.Router();

const PRIORITY_BY_TIER = { VeryHigh: 'high', High: 'high', Medium: 'medium', Low: 'low' };

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

router.use(requireAuth);

router.get(
  '/:id/visits',
  requirePermission('patients:read'),
  requireRoleFeature('communityVisits', 'This role does not use the community follow-up workspace.'),
  asyncHandler(async (req, res) => {
  const date = req.query.date ? new Date(req.query.date) : new Date();
  const selectedDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const chwId = req.params.id;
  const assigneeId = chwId === 'self' ? req.user.id : chwId;

  const dayStart = startOfDay(selectedDate);
  const dayEnd = endOfDay(selectedDate);

  if (typeof listFollowUpSchedulesForUser === 'function') {
    const [todaySchedules, overdueSchedules] = await Promise.all([
      listFollowUpSchedulesForUser(req.user, {
        assignedToId: assigneeId,
        status: 'scheduled',
        scheduledFrom: dayStart.toISOString(),
        scheduledTo: dayEnd.toISOString()
      }),
      listFollowUpSchedulesForUser(req.user, {
        assignedToId: assigneeId,
        status: 'scheduled',
        scheduledTo: new Date(dayStart.getTime() - 1).toISOString()
      })
    ]);

    const enrichSchedule = async (schedule) => {
      const patient = await getPatientForUser(req.user, schedule.patientId);
      const predictions = await listPredictionsForPatient(req.user, schedule.patientId);
      const latest = predictions[0] || null;
      const tier = latest?.tier || 'Low';
      return {
        id: schedule.id,
        followUpType: schedule.followUpType,
        title: schedule.title,
        scheduledDate: schedule.scheduledFor,
        priority: PRIORITY_BY_TIER[tier] || 'medium',
        patient: {
          id: schedule.patientId,
          name: patient?.name || 'Unknown patient',
          address: patient?.address || null,
          area: patient?.area || null,
          phone: patient?.phone || null,
          latitude: patient?.latitude || null,
          longitude: patient?.longitude || null,
          riskTier: tier
        }
      };
    };

    const [today, overdue] = await Promise.all([
      Promise.all(todaySchedules.map(enrichSchedule)),
      Promise.all(overdueSchedules.map(enrichSchedule))
    ]);

    const highPriorityCount = today.filter((v) => v.priority === 'high').length;

    await logAudit(req, {
      action: 'chw_visits_viewed',
      resource: `chw:${chwId}:visits`,
      details: { count: today.length, overdue: overdue.length, source: 'follow_up_schedules' }
    });

    return res.json({
      date: selectedDate.toISOString().split('T')[0],
      today,
      overdue,
      highPriorityCount
    });
  }

  // Fallback: build synthetic visit list from patients in followup status
  const patients = await listPatientsForUser(req.user, { status: 'followup' });
  const normalizedPatients = patients.length ? patients : await listPatientsForUser(req.user, {});

  const patientIds = normalizedPatients.map(p => p.id);
  const allPreds = await prisma.prediction.findMany({
    where: { patientId: { in: patientIds } },
    orderBy: { generatedAt: 'desc' }
  });
  const predMap = new Map();
  for (const p of allPreds) {
    if (!predMap.has(p.patientId)) predMap.set(p.patientId, p);
  }

  const scoredPatients = await Promise.all(
    normalizedPatients.map(async (patient) => {
      const latest = predMap.get(patient.id) || null;
      return {
        patientSummary: buildTaskPatientSummary(req.user, patient, { latestPrediction: latest }),
        riskTier: latest?.tier || 'Low'
      };
    })
  );

  const sorted = scoredPatients
    .sort((left, right) => {
      const tierOrder = { VeryHigh: 4, High: 3, Medium: 2, Low: 1 };
      return Number(tierOrder[right.riskTier] || 0) - Number(tierOrder[left.riskTier] || 0);
    })
    .slice(0, 15);

  const today = sorted.slice(0, 8).map((entry, index) => ({
    id: `visit-${entry.patientSummary?.id || index}-${index}`,
    priority: PRIORITY_BY_TIER[entry.riskTier] || 'medium',
    scheduledDate: selectedDate.toISOString(),
    patient: { ...(entry.patientSummary || {}), riskTier: entry.riskTier }
  }));

  const overdue = sorted.slice(8, 10).map((entry, index) => ({
    id: `overdue-${entry.patientSummary?.id || index}-${index}`,
    priority: 'high',
    scheduledDate: new Date(selectedDate.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    patient: { ...(entry.patientSummary || {}), riskTier: entry.riskTier }
  }));

  await logAudit(req, {
    action: 'chw_visits_viewed',
    resource: `chw:${chwId}:visits`,
    details: { count: today.length, overdue: overdue.length, source: 'patients_fallback' }
  });

  return res.json({ date: selectedDate.toISOString().split('T')[0], today, overdue });
  })
);

router.put(
  '/:id/follow-up-schedules/:scheduleId',
  requirePermission('patients:write'),
  requireRoleFeature('communityVisits', 'This role does not use the community follow-up workspace.'),
  asyncHandler(async (req, res) => {
  if (typeof updateFollowUpScheduleForUser !== 'function') {
    return res.status(503).json({
      error: 'NotAvailable',
      message: 'Outcome recording requires the Prisma data provider.'
    });
  }

  const { scheduleId } = req.params;
  const { status, outcome, notes, outcomeDetails, completedAt } = req.body || {};

  const updated = await updateFollowUpScheduleForUser(req.user, scheduleId, {
    status,
    outcome,
    notes,
    outcomeDetails,
    completedAt: completedAt || (status === 'Completed' ? new Date().toISOString() : undefined)
  });

  if (!updated) {
    return res.status(404).json({
      error: 'NotFound',
      message: 'Follow-up schedule not found or not accessible.'
    });
  }

  await logAudit(req, {
    action: 'chw_follow_up_outcome_recorded',
    resource: `follow_up_schedule:${scheduleId}`,
    details: { status, outcome }
  });

  return res.json({ schedule: updated });
  })
);

module.exports = router;
