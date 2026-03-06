/**
 * Backend Routes - Alerts
 * Persistent risk alert queue with acknowledge/resolve lifecycle.
 */

const express = require('express');
const {
  appendSyncEvent,
  getAlertForUser,
  listAlertsForUser,
  updateAlertForUser
} = require('../data');
const { requireAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/authorize');
const { logAudit } = require('../services/auditService');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();
const ALLOWED_STATUS = new Set(['open', 'acknowledged', 'resolved']);

router.use(requireAuth);

router.get('/', requirePermission('tasks:read'), asyncHandler(async (req, res) => {
  const status = req.query.status ? String(req.query.status).trim() : undefined;
  if (status && !ALLOWED_STATUS.has(status)) {
    return res.status(400).json({
      error: 'ValidationError',
      message: 'status must be open, acknowledged, or resolved.'
    });
  }

  const alerts = await listAlertsForUser(req.user, {
    status,
    patientId: req.query.patientId,
    facilityId: req.query.facilityId,
    limit: req.query.limit,
    offset: req.query.offset
  });

  await logAudit(req, {
    action: 'alerts_list_viewed',
    resource: 'alerts:list',
    details: {
      count: alerts.length,
      status: status || null
    }
  });

  return res.json({
    count: alerts.length,
    alerts
  });
}));

router.patch('/:id/acknowledge', requirePermission('tasks:write'), asyncHandler(async (req, res) => {
  const current = await getAlertForUser(req.user, req.params.id);
  if (!current) {
    return res.status(404).json({
      error: 'NotFound',
      message: 'Alert not found or not accessible.'
    });
  }

  if (current.status === 'resolved') {
    return res.status(409).json({
      error: 'Conflict',
      message: 'Resolved alerts cannot be acknowledged.'
    });
  }

  const alert = await updateAlertForUser(req.user, req.params.id, {
    status: 'acknowledged',
    acknowledgedAt: current.acknowledgedAt || new Date().toISOString(),
    acknowledgedById: current.acknowledgedById || req.user.id
  });

  await logAudit(req, {
    action: 'alert_acknowledged',
    resource: `alert:${alert.id}`,
    details: {
      patientId: alert.patientId,
      predictionId: alert.predictionId,
      status: alert.status
    }
  });

  await appendSyncEvent({
    facilityId: alert.facilityId,
    eventType: 'mutation',
    operation: 'alert_updated',
    entityType: 'alert',
    entityId: alert.id,
    payload: {
      alertId: alert.id,
      patientId: alert.patientId,
      status: alert.status
    },
    actorUserId: req.user.id,
    ipAddress: req.ip
  });

  const wss = req.app.get('wss');
  if (wss) {
    wss.broadcastToFacility(alert.facilityId, 'RISK_ALERT_UPDATED', alert);
  }

  return res.json({ alert });
}));

router.patch('/:id/resolve', requirePermission('tasks:write'), asyncHandler(async (req, res) => {
  const current = await getAlertForUser(req.user, req.params.id);

  if (!current) {
    return res.status(404).json({
      error: 'NotFound',
      message: 'Alert not found or not accessible.'
    });
  }

  if (current.status === 'resolved') {
    return res.status(409).json({
      error: 'Conflict',
      message: 'Alert is already resolved.'
    });
  }

  const note = String(req.body.resolutionNote || req.body.note || '').trim();
  const timestamp = new Date().toISOString();
  const alert = await updateAlertForUser(req.user, req.params.id, {
    status: 'resolved',
    resolvedAt: timestamp,
    resolvedById: req.user.id,
    resolutionNote: note || null,
    acknowledgedAt: current.acknowledgedAt || timestamp,
    acknowledgedById: current.acknowledgedById || req.user.id
  });

  await logAudit(req, {
    action: 'alert_resolved',
    resource: `alert:${alert.id}`,
    details: {
      patientId: alert.patientId,
      predictionId: alert.predictionId,
      status: alert.status,
      resolutionNote: alert.resolutionNote || null
    }
  });

  await appendSyncEvent({
    facilityId: alert.facilityId,
    eventType: 'mutation',
    operation: 'alert_updated',
    entityType: 'alert',
    entityId: alert.id,
    payload: {
      alertId: alert.id,
      patientId: alert.patientId,
      status: alert.status
    },
    actorUserId: req.user.id,
    ipAddress: req.ip
  });

  const wss = req.app.get('wss');
  if (wss) {
    wss.broadcastToFacility(alert.facilityId, 'RISK_ALERT_UPDATED', alert);
  }

  return res.json({ alert });
}));

module.exports = router;
