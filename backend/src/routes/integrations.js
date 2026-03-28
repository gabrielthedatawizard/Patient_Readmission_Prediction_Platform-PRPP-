const express = require('express');
const { listFacilities } = require('../data');
const { requireAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/authorize');
const { getDhis2ConfigStatus } = require('../integrations/dhis2Client');
const { logAudit } = require('../services/auditService');
const { syncDhis2Facilities } = require('../services/dhis2SyncService');
const {
  buildFacilityDirectoryForUser,
  buildHierarchyTreeForUser
} = require('../services/workspaceScopeService');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();
const DHIS2_ADMIN_ROLES = new Set(['moh', 'ml_engineer']);

function ensureDhis2AdminAccess(user) {
  if (!DHIS2_ADMIN_ROLES.has(String(user?.role || ''))) {
    const error = new Error('DHIS2 integration is limited to national administrators and ML engineers.');
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

module.exports = router;
