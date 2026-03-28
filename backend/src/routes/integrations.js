const express = require('express');
const { listFacilities } = require('../data');
const { requireAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/authorize');
const { getDhis2ConfigStatus } = require('../integrations/dhis2Client');
const { logAudit } = require('../services/auditService');
const {
  buildNotificationVerificationStatus,
  runNotificationVerificationTest
} = require('../services/notificationVerificationService');
const { syncDhis2Facilities } = require('../services/dhis2SyncService');
const {
  buildFacilityDirectoryForUser,
  buildHierarchyTreeForUser
} = require('../services/workspaceScopeService');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();
const DHIS2_ADMIN_ROLES = new Set(['moh', 'ml_engineer']);
const NOTIFICATION_ADMIN_ROLES = new Set(['moh', 'ml_engineer']);

function ensureDhis2AdminAccess(user) {
  if (!DHIS2_ADMIN_ROLES.has(String(user?.role || ''))) {
    const error = new Error('DHIS2 integration is limited to national administrators and ML engineers.');
    error.statusCode = 403;
    throw error;
  }
}

function ensureNotificationAdminAccess(user) {
  if (!NOTIFICATION_ADMIN_ROLES.has(String(user?.role || ''))) {
    const error = new Error('Notification verification is limited to national administrators and ML engineers.');
    error.statusCode = 403;
    throw error;
  }
}

router.use(requireAuth);

router.get('/dhis2/tree', asyncHandler(async (req, res) => {
  const [facilities, dhis2Status] = await Promise.all([
    listFacilities(),
    Promise.resolve(getDhis2ConfigStatus())
  ]);
  const tree = buildHierarchyTreeForUser(req.user, facilities, dhis2Status);

  return res.json(tree);
}));

router.get('/dhis2/facilities', asyncHandler(async (req, res) => {
  const [facilities, dhis2Status] = await Promise.all([
    listFacilities(),
    Promise.resolve(getDhis2ConfigStatus())
  ]);
  const directory = buildFacilityDirectoryForUser(req.user, facilities, req.query, dhis2Status);

  return res.json(directory);
}));

router.get('/dhis2/status', requirePermission('analytics:read'), asyncHandler(async (req, res) => {
  ensureDhis2AdminAccess(req.user);
  const status = getDhis2ConfigStatus();

  await logAudit(req, {
    action: 'integration_dhis2_status_viewed',
    resource: 'integrations:dhis2:status',
    details: {
      configured: status.configured
    }
  });

  return res.json(status);
}));

router.post('/dhis2/sync', requirePermission('analytics:read'), asyncHandler(async (req, res) => {
  ensureDhis2AdminAccess(req.user);

  const syncResult = await syncDhis2Facilities({
    rootOrgUnitId: req.body?.rootOrgUnitId,
    facilityLevels: req.body?.facilityLevels,
    regionLevel: req.body?.regionLevel,
    districtLevel: req.body?.districtLevel,
    levelMapping: req.body?.levelMapping,
    dryRun: req.body?.dryRun !== false
  });

  await logAudit(req, {
    action: 'integration_dhis2_sync_triggered',
    resource: 'integrations:dhis2:sync',
    details: {
      dryRun: syncResult.dryRun,
      total: syncResult.summary.total,
      imported: syncResult.summary.imported,
      updated: syncResult.summary.updated,
      matchedByName: syncResult.summary.matchedByName
    }
  });

  return res.json(syncResult);
}));

router.get('/notifications/status', requirePermission('analytics:read'), asyncHandler(async (req, res) => {
  ensureNotificationAdminAccess(req.user);
  const status = await buildNotificationVerificationStatus(req.user);

  await logAudit(req, {
    action: 'integration_notifications_status_viewed',
    resource: 'integrations:notifications:status',
    details: {
      provider: status.provider,
      status: status.gateway?.status || 'unknown',
      recipientCount: status.recipientCount,
      liveSendAllowed: status.liveSendAllowed
    }
  });

  return res.json(status);
}));

router.post('/notifications/test', requirePermission('analytics:read'), asyncHandler(async (req, res) => {
  ensureNotificationAdminAccess(req.user);
  const liveSend = req.body?.liveSend === true;
  const sendAll = req.body?.sendAll === true;

  const result = await runNotificationVerificationTest({
    user: req.user,
    liveSend,
    sendAll,
    message: req.body?.message
  });

  await logAudit(req, {
    action: 'integration_notifications_test_triggered',
    resource: 'integrations:notifications:test',
    details: {
      dryRun: result.dryRun,
      provider: result.provider,
      targetMode: result.targetMode,
      recipientCount: result.recipientCount,
      recipients: result.recipients,
      liveSendAllowed: result.liveSendAllowed,
      blockedReason: result.liveSendBlockedReason || null
    }
  });

  if (Array.isArray(result.results)) {
    for (const delivery of result.results) {
      await logAudit(req, {
        action: 'integration_notifications_test_delivery',
        resource: 'integrations:notifications:test',
        details: {
          status: delivery.status,
          provider: delivery.provider || result.provider,
          targetMode: result.targetMode,
          target: delivery.target,
          attemptedAt: delivery.attemptedAt || null,
          providerStatus: delivery.providerStatus || null,
          providerStatusCode: delivery.providerStatusCode ?? null,
          messageId: delivery.messageId || null,
          cost: delivery.cost || null,
          error: delivery.error || null
        }
      });
    }
  }

  return res.json(result);
}));

module.exports = router;
