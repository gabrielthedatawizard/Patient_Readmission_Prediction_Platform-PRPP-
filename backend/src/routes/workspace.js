const express = require('express');
const { listFacilities } = require('../data');
const { requireAuth } = require('../middleware/auth');
const { logAudit } = require('../services/auditService');
const {
  buildWorkspaceContext
} = require('../services/workspaceScopeService');
const { getDhis2ConfigStatus } = require('../integrations/dhis2Client');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

router.use(requireAuth);

router.get('/context', asyncHandler(async (req, res) => {
  const [facilities, dhis2Status] = await Promise.all([
    listFacilities(),
    Promise.resolve(getDhis2ConfigStatus())
  ]);
  const context = buildWorkspaceContext(req.user, facilities, dhis2Status);

  await logAudit(req, {
    action: 'workspace_context_viewed',
    resource: 'workspace:context',
    details: {
      hierarchyLevel: context.defaultScope.hierarchyLevel,
      facilitySource: context.defaultScope.facilitySource
    }
  });

  return res.json(context);
}));

module.exports = router;
