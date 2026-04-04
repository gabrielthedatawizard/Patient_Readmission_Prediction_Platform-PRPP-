/**
 * Backend Routes - Audit Logs
 */

const express = require('express');
const { listAuditLogsForUser } = require('../data');
const { requireAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/authorize');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

router.use(requireAuth);
router.use(requirePermission('audit:read'));

router.get('/', asyncHandler(async (req, res) => {
  const logs = await listAuditLogsForUser(req.user, {
    limit: req.query.limit,
    offset: req.query.offset
  });

  return res.json({
    count: logs.length,
    logs
  });
}));

router.get('/verify', asyncHandler(async (req, res) => {
  const { verifyAuditChain } = require('../services/auditService');
  const result = await verifyAuditChain(req.user, {
    facilityId: req.query.facilityId
  });

  return res.json(result);
}));

module.exports = router;
