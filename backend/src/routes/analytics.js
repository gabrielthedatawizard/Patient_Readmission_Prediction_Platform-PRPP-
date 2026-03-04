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
const {
  getDashboardKPIs,
  getFacilityComparison,
  detectAnomalies
} = require('../services/analyticsService');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

router.use(requireAuth);

router.get('/dashboard', requirePermission('analytics:read'), asyncHandler(async (req, res) => {
  const dashboard = await getDashboardKPIs(req.user, {
    facilityId: req.query.facilityId,
    days: req.query.days,
    startDate: req.query.startDate,
    endDate: req.query.endDate
  });

  await logAudit(req, {
    action: 'analytics_dashboard_viewed',
    resource: 'analytics:dashboard',
    details: {
      facilityId: req.query.facilityId || null,
      days: req.query.days || 30
    }
  });

  return res.json(dashboard);
}));

router.get('/facilities', requirePermission('analytics:read'), asyncHandler(async (req, res) => {
  const facilities = await getFacilityComparison(req.user, {
    days: req.query.days,
    startDate: req.query.startDate,
    endDate: req.query.endDate
  });

  await logAudit(req, {
    action: 'analytics_facility_comparison_viewed',
    resource: 'analytics:facilities',
    details: {
      count: facilities.length
    }
  });

  return res.json({
    count: facilities.length,
    facilities
  });
}));

router.get('/anomalies', requirePermission('analytics:read'), asyncHandler(async (req, res) => {
  const anomalies = await detectAnomalies(req.user, {
    facilityId: req.query.facilityId
  });

  await logAudit(req, {
    action: 'analytics_anomalies_viewed',
    resource: 'analytics:anomalies',
    details: {
      count: anomalies.length
    }
  });

  return res.json({
    count: anomalies.length,
    anomalies
  });
}));

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
