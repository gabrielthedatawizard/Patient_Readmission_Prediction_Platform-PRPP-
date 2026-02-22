/**
 * Backend Routes - Analytics
 * Includes data quality and fairness oversight snapshots.
 */

const express = require('express');
const {
  buildDataQualitySnapshot,
  buildFairnessSnapshot
} = require('../data');
const { requireAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/authorize');
const { logAudit } = require('../services/auditService');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

router.use(requireAuth);

router.get('/quality', requirePermission('analytics:read'), asyncHandler(async (req, res) => {
  const quality = await buildDataQualitySnapshot();

  await logAudit(req, {
    action: 'analytics_quality_viewed',
    resource: 'analytics:quality',
    details: {
      completeness: quality.criticalFieldCompleteness
    }
  });

  return res.json({
    quality,
    escalationRequired: quality.criticalFieldCompleteness < 0.7
  });
}));

router.get('/fairness', requirePermission('analytics:read'), asyncHandler(async (req, res) => {
  const fairness = await buildFairnessSnapshot();

  await logAudit(req, {
    action: 'analytics_fairness_viewed',
    resource: 'analytics:fairness',
    details: {
      variance: fairness.variance
    }
  });

  return res.json({
    fairness,
    escalationRequired: fairness.fairnessStatus === 'alert'
  });
}));

module.exports = router;
