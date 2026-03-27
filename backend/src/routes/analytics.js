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
  detectAnomalies,
  getBedForecast,
  getAutomationSummary
} = require('../services/analyticsService');
const {
  buildModelMonitoringSnapshot,
  buildTrainingDataset,
  ensureMlExportAccess,
  serializeRowsToCsv
} = require('../services/mlDatasetService');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

router.use(requireAuth);

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function groupFacilitiesByRegion(facilities = []) {
  const grouped = new Map();

  facilities.forEach((facility) => {
    const key = facility.region || 'Unknown';
    if (!grouped.has(key)) {
      grouped.set(key, {
        region: key,
        regionCode: key,
        facilityCount: 0,
        readmissionTotal: 0,
        highRiskTotal: 0,
        patientTotal: 0
      });
    }

    const bucket = grouped.get(key);
    bucket.facilityCount += 1;
    bucket.readmissionTotal += toNumber(facility.readmissionRate);
    bucket.highRiskTotal += toNumber(facility.highRiskCount);
    bucket.patientTotal += toNumber(facility.totalPatients);
  });

  return Array.from(grouped.values()).map((bucket) => ({
    region: bucket.region,
    regionCode: bucket.regionCode,
    facilityCount: bucket.facilityCount,
    readmissionRate: bucket.facilityCount
      ? Number((bucket.readmissionTotal / bucket.facilityCount).toFixed(1))
      : 0,
    highRiskCount: bucket.highRiskTotal,
    totalPatients: bucket.patientTotal
  }));
}

function applyLocationFilters(facilities = [], query = {}) {
  const region = String(query.region || '').trim().toLowerCase();
  const district = String(query.district || '').trim().toLowerCase();

  return facilities.filter((facility) => {
    if (region && String(facility.region || '').toLowerCase() !== region) {
      return false;
    }

    if (district && String(facility.district || '').toLowerCase() !== district) {
      return false;
    }

    return true;
  });
}

function ensureDatasetExportEnabled() {
  if (process.env.ENABLE_DATA_EXPORT === 'false') {
    const error = new Error('Dataset export is disabled in this environment.');
    error.statusCode = 403;
    throw error;
  }
}

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

router.get('/national/kpis', requirePermission('analytics:read'), asyncHandler(async (req, res) => {
  const dashboard = await getDashboardKPIs(req.user, {
    facilityId: req.query.facilityId,
    days: req.query.days,
    startDate: req.query.startDate,
    endDate: req.query.endDate
  });

  const facilities = await getFacilityComparison(req.user, {
    days: req.query.days,
    startDate: req.query.startDate,
    endDate: req.query.endDate
  });
  const scopedFacilities = applyLocationFilters(facilities, req.query);

  return res.json({
    ...dashboard,
    totalFacilities: scopedFacilities.length,
    activeFacilities: scopedFacilities.filter((item) => Number(item.totalPatients || 0) > 0).length,
    livesSaved: Math.max(Math.round(toNumber(dashboard.highRiskCount) * 0.18), 0)
  });
}));

router.get('/regional-performance', requirePermission('analytics:read'), asyncHandler(async (req, res) => {
  const facilities = await getFacilityComparison(req.user, {
    days: req.query.days,
    startDate: req.query.startDate,
    endDate: req.query.endDate
  });
  const scopedFacilities = applyLocationFilters(facilities, req.query);

  return res.json({
    count: scopedFacilities.length,
    regions: groupFacilitiesByRegion(scopedFacilities)
  });
}));

router.get('/facility-rankings', requirePermission('analytics:read'), asyncHandler(async (req, res) => {
  const facilities = await getFacilityComparison(req.user, {
    days: req.query.days,
    startDate: req.query.startDate,
    endDate: req.query.endDate
  });
  const scopedFacilities = applyLocationFilters(facilities, req.query);

  const sorted = [...scopedFacilities].sort(
    (left, right) => toNumber(left.readmissionRate) - toNumber(right.readmissionRate)
  );

  const limit = Math.min(Math.max(Number(req.query.limit) || 5, 1), 20);
  const top = sorted.slice(0, limit);
  const bottom = sorted.slice(Math.max(sorted.length - limit, 0)).reverse();

  return res.json({
    count: scopedFacilities.length,
    top,
    bottom,
    all: sorted
  });
}));

router.get('/policy-recommendations', requirePermission('analytics:read'), asyncHandler(async (req, res) => {
  const [dashboard, anomalies] = await Promise.all([
    getDashboardKPIs(req.user, {
      facilityId: req.query.facilityId,
      days: req.query.days,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    }),
    detectAnomalies(req.user, {
      facilityId: req.query.facilityId
    })
  ]);

  const recommendations = anomalies.map((item) => ({
    title: item.type || 'Operational signal',
    message: item.message,
    action: item.action,
    priority: item.severity === 'high' ? 'high' : 'medium'
  }));

  if (!recommendations.length) {
    recommendations.push({
      title: 'Sustain intervention coverage',
      message: `Intervention completion is ${toNumber(dashboard.interventionRate).toFixed(1)}%.`,
      action: 'Maintain discharge task compliance and weekly review cadence.',
      priority: 'low'
    });
  }

  return res.json({
    count: recommendations.length,
    recommendations
  });
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

router.get('/bed-forecast', requirePermission('analytics:read'), asyncHandler(async (req, res) => {
  const forecast = await getBedForecast(req.user, {
    facilityId: req.query.facilityId,
    days: req.query.days
  });

  await logAudit(req, {
    action: 'analytics_bed_forecast_viewed',
    resource: 'analytics:bed_forecast',
    details: {
      facilityId: req.query.facilityId || null,
      horizonDays: forecast.horizonDays
    }
  });

  return res.json(forecast);
}));

router.get('/automation-summary', requirePermission('analytics:read'), asyncHandler(async (req, res) => {
  const summary = await getAutomationSummary(req.user, {
    facilityId: req.query.facilityId,
    days: req.query.days,
    startDate: req.query.startDate,
    endDate: req.query.endDate
  });

  await logAudit(req, {
    action: 'analytics_automation_summary_viewed',
    resource: 'analytics:automation_summary',
    details: {
      facilityId: req.query.facilityId || null,
      days: req.query.days || 30
    }
  });

  return res.json(summary);
}));

router.get('/ml/training-dataset', requirePermission('analytics:read'), asyncHandler(async (req, res) => {
  ensureDatasetExportEnabled();
  ensureMlExportAccess(req.user);

  const dataset = await buildTrainingDataset(req.user, req.query);
  const format = String(req.query.format || 'json').trim().toLowerCase();

  await logAudit(req, {
    action: 'analytics_ml_training_dataset_exported',
    resource: 'analytics:ml:training_dataset',
    details: {
      format,
      count: dataset.count,
      patientCount: dataset.patientCount,
      labelledOnly: dataset.options.labelledOnly,
      facilityId: dataset.options.facilityId || null
    }
  });

  if (format === 'csv') {
    const csv = serializeRowsToCsv(dataset.rows);
    const stamp = dataset.generatedAt.slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="trip-training-dataset-${stamp}.csv"`
    );

    return res.send(csv);
  }

  return res.json(dataset);
}));

router.get('/ml/monitoring', requirePermission('analytics:read'), asyncHandler(async (req, res) => {
  ensureDatasetExportEnabled();
  ensureMlExportAccess(req.user);

  const monitoring = await buildModelMonitoringSnapshot(req.user, req.query);

  await logAudit(req, {
    action: 'analytics_ml_monitoring_viewed',
    resource: 'analytics:ml:monitoring',
    details: {
      visitCount: monitoring.visitCount,
      readmissionRate30d: monitoring.readmissionRate30d,
      fallbackRate: monitoring.fallbackRate,
      operationalReviewRequired: monitoring.operationalReviewRequired
    }
  });

  return res.json(monitoring);
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
