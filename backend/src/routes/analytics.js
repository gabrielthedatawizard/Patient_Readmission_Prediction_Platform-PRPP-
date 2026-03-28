/**
 * Backend Routes - Analytics
 * Includes data quality and fairness oversight snapshots.
 */

const express = require('express');
const { listFacilities } = require('../data');
const {
  buildDataQualitySnapshot,
  buildFairnessSnapshot
} = require('../data');
const { getDhis2ConfigStatus } = require('../integrations/dhis2Client');
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
const {
  buildFacilityDirectoryForUser,
  getFacilitySourceLabel,
  sanitizeSelection
} = require('../services/workspaceScopeService');
const {
  getSandboxAnomalies,
  getSandboxAutomationSummary,
  getSandboxBedForecast,
  getSandboxDashboardKPIs,
  getSandboxFacilityComparison,
  getSandboxFairnessSnapshot,
  getSandboxMonitoringSnapshot,
  getSandboxPolicyRecommendations,
  getSandboxQualitySnapshot,
  getSandboxRegionalPerformance,
  getSandboxTrainingDataset
} = require('../services/sandboxDemoService');
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

function normalizeOperationalMode(user, requestedMode) {
  const normalizedRole = String(user?.role || '').trim().toLowerCase();
  const normalizedMode = String(requestedMode || '').trim().toLowerCase();
  if (normalizedMode !== 'sandbox') {
    return 'normal';
  }

  return ['moh', 'ml_engineer'].includes(normalizedRole) ? 'sandbox' : 'normal';
}

async function buildAnalyticsWorkspace(req) {
  const facilities = await listFacilities();
  const dhis2Status = getDhis2ConfigStatus();
  const selection = sanitizeSelection(req.user, facilities, req.query);

  return {
    selection,
    facilityIds: selection.visibleFacilities.map((facility) => facility.id),
    facilitySource: getFacilitySourceLabel(dhis2Status, facilities),
    operationalMode: normalizeOperationalMode(req.user, req.query.operationalMode),
    facilitiesInScope: selection.visibleFacilities,
    facilityDirectory: buildFacilityDirectoryForUser(req.user, facilities, req.query, dhis2Status)
  };
}

function withScope(payload, workspace) {
  return {
    ...payload,
    scope: {
      ...workspace.facilityDirectory.scope,
      facilitySource: workspace.facilitySource,
      operationalMode: workspace.operationalMode
    }
  };
}

function ensureDatasetExportEnabled() {
  if (process.env.ENABLE_DATA_EXPORT === 'false') {
    const error = new Error('Dataset export is disabled in this environment.');
    error.statusCode = 403;
    throw error;
  }
}

router.get('/dashboard', requirePermission('analytics:read'), asyncHandler(async (req, res) => {
  const workspace = await buildAnalyticsWorkspace(req);
  const dashboard = workspace.operationalMode === 'sandbox'
    ? getSandboxDashboardKPIs(workspace.facilitiesInScope)
    : await getDashboardKPIs(req.user, {
        facilityId: req.query.facilityId,
        facilityIds: workspace.facilityIds,
        days: req.query.days,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      });

  await logAudit(req, {
    action: 'analytics_dashboard_viewed',
    resource: 'analytics:dashboard',
    details: {
      facilityId: req.query.facilityId || null,
      hierarchyLevel: workspace.facilityDirectory.scope.hierarchyLevel,
      days: req.query.days || 30,
      operationalMode: workspace.operationalMode
    }
  });

  return res.json(withScope(dashboard, workspace));
}));

router.get('/national/kpis', requirePermission('analytics:read'), asyncHandler(async (req, res) => {
  const workspace = await buildAnalyticsWorkspace(req);
  const dashboard = workspace.operationalMode === 'sandbox'
    ? getSandboxDashboardKPIs(workspace.facilitiesInScope)
    : await getDashboardKPIs(req.user, {
        facilityId: req.query.facilityId,
        facilityIds: workspace.facilityIds,
        days: req.query.days,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      });

  const facilities = workspace.operationalMode === 'sandbox'
    ? getSandboxFacilityComparison(workspace.facilitiesInScope)
    : await getFacilityComparison(req.user, {
        days: req.query.days,
        facilityIds: workspace.facilityIds,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      });

  return res.json(withScope({
    ...dashboard,
    totalFacilities: workspace.facilitiesInScope.length,
    activeFacilities: facilities.filter((item) => Number(item.totalPatients || 0) > 0).length,
    livesSaved: Math.max(Math.round(toNumber(dashboard.highRiskCount) * 0.18), 0)
  }, workspace));
}));

router.get('/regional-performance', requirePermission('analytics:read'), asyncHandler(async (req, res) => {
  const workspace = await buildAnalyticsWorkspace(req);
  const facilities = workspace.operationalMode === 'sandbox'
    ? getSandboxFacilityComparison(workspace.facilitiesInScope)
    : await getFacilityComparison(req.user, {
        days: req.query.days,
        facilityIds: workspace.facilityIds,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      });
  const scopedFacilities = workspace.operationalMode === 'sandbox'
    ? facilities
    : applyLocationFilters(facilities, req.query);

  const payload = workspace.operationalMode === 'sandbox'
    ? getSandboxRegionalPerformance(workspace.facilitiesInScope)
    : {
        count: scopedFacilities.length,
        regions: groupFacilitiesByRegion(scopedFacilities)
      };

  return res.json(withScope(payload, workspace));
}));

router.get('/facility-rankings', requirePermission('analytics:read'), asyncHandler(async (req, res) => {
  const workspace = await buildAnalyticsWorkspace(req);
  const facilities = workspace.operationalMode === 'sandbox'
    ? getSandboxFacilityComparison(workspace.facilitiesInScope)
    : await getFacilityComparison(req.user, {
        days: req.query.days,
        facilityIds: workspace.facilityIds,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      });
  const scopedFacilities = workspace.operationalMode === 'sandbox'
    ? facilities
    : applyLocationFilters(facilities, req.query);

  const sorted = [...scopedFacilities].sort(
    (left, right) => toNumber(left.readmissionRate) - toNumber(right.readmissionRate)
  );

  const limit = Math.min(Math.max(Number(req.query.limit) || 5, 1), 20);
  const top = sorted.slice(0, limit);
  const bottom = sorted.slice(Math.max(sorted.length - limit, 0)).reverse();

  return res.json(withScope({
    count: scopedFacilities.length,
    top,
    bottom,
    all: sorted
  }, workspace));
}));

router.get('/policy-recommendations', requirePermission('analytics:read'), asyncHandler(async (req, res) => {
  const workspace = await buildAnalyticsWorkspace(req);
  const [dashboard, anomalies] = workspace.operationalMode === 'sandbox'
    ? [
        getSandboxDashboardKPIs(workspace.facilitiesInScope),
        getSandboxAnomalies(workspace.facilitiesInScope)
      ]
    : await Promise.all([
        getDashboardKPIs(req.user, {
          facilityId: req.query.facilityId,
          facilityIds: workspace.facilityIds,
          days: req.query.days,
          startDate: req.query.startDate,
          endDate: req.query.endDate
        }),
        detectAnomalies(req.user, {
          facilityId: req.query.facilityId,
          facilityIds: workspace.facilityIds
        })
      ]);

  if (workspace.operationalMode === 'sandbox') {
    const payload = getSandboxPolicyRecommendations(workspace.facilitiesInScope);
    return res.json(withScope(payload, workspace));
  }

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

  return res.json(withScope({
    count: recommendations.length,
    recommendations
  }, workspace));
}));

router.get('/facilities', requirePermission('analytics:read'), asyncHandler(async (req, res) => {
  const workspace = await buildAnalyticsWorkspace(req);
  const facilities = workspace.operationalMode === 'sandbox'
    ? getSandboxFacilityComparison(workspace.facilitiesInScope)
    : await getFacilityComparison(req.user, {
        days: req.query.days,
        facilityIds: workspace.facilityIds,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      });

  await logAudit(req, {
    action: 'analytics_facility_comparison_viewed',
    resource: 'analytics:facilities',
    details: {
      count: facilities.length,
      operationalMode: workspace.operationalMode
    }
  });

  return res.json(withScope({
    count: facilities.length,
    facilities
  }, workspace));
}));

router.get('/anomalies', requirePermission('analytics:read'), asyncHandler(async (req, res) => {
  const workspace = await buildAnalyticsWorkspace(req);
  const anomalies = workspace.operationalMode === 'sandbox'
    ? getSandboxAnomalies(workspace.facilitiesInScope)
    : await detectAnomalies(req.user, {
        facilityId: req.query.facilityId,
        facilityIds: workspace.facilityIds
      });

  await logAudit(req, {
    action: 'analytics_anomalies_viewed',
    resource: 'analytics:anomalies',
    details: {
      count: anomalies.length,
      operationalMode: workspace.operationalMode
    }
  });

  return res.json(withScope({
    count: anomalies.length,
    anomalies
  }, workspace));
}));

router.get('/bed-forecast', requirePermission('analytics:read'), asyncHandler(async (req, res) => {
  const workspace = await buildAnalyticsWorkspace(req);
  const forecast = workspace.operationalMode === 'sandbox'
    ? getSandboxBedForecast(workspace.facilitiesInScope, {
        facilityId: req.query.facilityId,
        days: req.query.days
      })
    : await getBedForecast(req.user, {
        facilityId: req.query.facilityId,
        facilityIds: workspace.facilityIds,
        days: req.query.days
      });

  await logAudit(req, {
    action: 'analytics_bed_forecast_viewed',
    resource: 'analytics:bed_forecast',
    details: {
      facilityId: req.query.facilityId || null,
      horizonDays: forecast.horizonDays,
      operationalMode: workspace.operationalMode
    }
  });

  return res.json(withScope(forecast, workspace));
}));

router.get('/automation-summary', requirePermission('analytics:read'), asyncHandler(async (req, res) => {
  const workspace = await buildAnalyticsWorkspace(req);
  const summary = workspace.operationalMode === 'sandbox'
    ? getSandboxAutomationSummary(workspace.facilitiesInScope)
    : await getAutomationSummary(req.user, {
        facilityId: req.query.facilityId,
        facilityIds: workspace.facilityIds,
        days: req.query.days,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      });

  await logAudit(req, {
    action: 'analytics_automation_summary_viewed',
    resource: 'analytics:automation_summary',
    details: {
      facilityId: req.query.facilityId || null,
      days: req.query.days || 30,
      operationalMode: workspace.operationalMode
    }
  });

  return res.json(withScope(summary, workspace));
}));

router.get('/ml/training-dataset', requirePermission('analytics:read'), asyncHandler(async (req, res) => {
  ensureDatasetExportEnabled();
  ensureMlExportAccess(req.user);

  const workspace = await buildAnalyticsWorkspace(req);
  const dataset = workspace.operationalMode === 'sandbox'
    ? getSandboxTrainingDataset(workspace.facilitiesInScope, req.query)
    : await buildTrainingDataset(req.user, {
        ...req.query,
        facilityIds: workspace.facilityIds
      });
  const format = String(req.query.format || 'json').trim().toLowerCase();

  await logAudit(req, {
    action: 'analytics_ml_training_dataset_exported',
    resource: 'analytics:ml:training_dataset',
    details: {
      format,
      count: dataset.count,
      patientCount: dataset.patientCount,
      labelledOnly: dataset.options.labelledOnly,
      facilityId: dataset.options.facilityId || null,
      operationalMode: workspace.operationalMode
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

  return res.json(withScope(dataset, workspace));
}));

router.get('/ml/monitoring', requirePermission('analytics:read'), asyncHandler(async (req, res) => {
  ensureDatasetExportEnabled();
  ensureMlExportAccess(req.user);

  const workspace = await buildAnalyticsWorkspace(req);
  const monitoring = workspace.operationalMode === 'sandbox'
    ? getSandboxMonitoringSnapshot(workspace.facilitiesInScope)
    : await buildModelMonitoringSnapshot(req.user, {
        ...req.query,
        facilityIds: workspace.facilityIds
      });

  await logAudit(req, {
    action: 'analytics_ml_monitoring_viewed',
    resource: 'analytics:ml:monitoring',
    details: {
      visitCount: monitoring.visitCount,
      readmissionRate30d: monitoring.readmissionRate30d,
      fallbackRate: monitoring.fallbackRate,
      operationalReviewRequired: monitoring.operationalReviewRequired,
      operationalMode: workspace.operationalMode
    }
  });

  return res.json(withScope(monitoring, workspace));
}));

router.get('/quality', requirePermission('analytics:read'), asyncHandler(async (req, res) => {
  const workspace = await buildAnalyticsWorkspace(req);
  const quality = workspace.operationalMode === 'sandbox'
    ? getSandboxQualitySnapshot(workspace.facilitiesInScope)
    : await buildDataQualitySnapshot();

  await logAudit(req, {
    action: 'analytics_quality_viewed',
    resource: 'analytics:quality',
    details: {
      completeness: quality.criticalFieldCompleteness,
      operationalMode: workspace.operationalMode
    }
  });

  return res.json(withScope({
    quality,
    escalationRequired: quality.criticalFieldCompleteness < 0.7
  }, workspace));
}));

router.get('/fairness', requirePermission('analytics:read'), asyncHandler(async (req, res) => {
  const workspace = await buildAnalyticsWorkspace(req);
  const fairness = workspace.operationalMode === 'sandbox'
    ? getSandboxFairnessSnapshot(workspace.facilitiesInScope)
    : await buildFairnessSnapshot();

  await logAudit(req, {
    action: 'analytics_fairness_viewed',
    resource: 'analytics:fairness',
    details: {
      variance: fairness.variance,
      operationalMode: workspace.operationalMode
    }
  });

  return res.json(withScope({
    fairness,
    escalationRequired: fairness.fairnessStatus === 'alert'
  }, workspace));
}));

module.exports = router;
