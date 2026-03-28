const {
  getFacilityById,
  getPatientForUser,
  getPredictionForUser,
  listAlertsForUser,
  listAuditLogsForUser,
  listTasksForUser
} = require('../data');
const { buildTaskPatientSummary } = require('../config/roleAccess');
const { ALERT_THRESHOLD } = require('./notificationService');

const WORKFLOW_AUDIT_ACTIONS = new Set([
  'prediction_generated',
  'prediction_overridden',
  'risk_alert_dispatched',
  'risk_alert_sms_delivery',
  'task_created',
  'task_updated',
  'alert_acknowledged',
  'alert_resolved'
]);

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function getLogPredictionId(log) {
  return log?.details?.predictionId ? String(log.details.predictionId) : null;
}

function getLogPatientId(log) {
  return log?.details?.patientId ? String(log.details.patientId) : null;
}

function getLogAlertId(log) {
  if (log?.details?.alertId) {
    return String(log.details.alertId);
  }

  const resource = String(log?.resource || '');
  if (resource.startsWith('alert:')) {
    return resource.slice('alert:'.length);
  }

  return null;
}

function getLogTaskId(log) {
  const resource = String(log?.resource || '');
  if (resource.startsWith('task:')) {
    return resource.slice('task:'.length);
  }

  return null;
}

function buildPatientWorkflowSummary(user, patient, prediction) {
  const roleAwareSummary = buildTaskPatientSummary(user, patient, {
    latestPrediction: prediction
  });

  if (roleAwareSummary) {
    return roleAwareSummary;
  }

  return {
    caseId: patient.id,
    facilityId: patient.facilityId,
    age: patient.age,
    gender: patient.gender,
    status: patient.status,
    riskTier: prediction?.tier || null,
    anonymized: true
  };
}

function buildFacilitySummary(facility) {
  if (!facility) {
    return null;
  }

  return {
    id: facility.id,
    name: facility.name,
    region: facility.region || null,
    regionCode: facility.regionCode || null,
    district: facility.district || null,
    level: facility.level || null
  };
}

function mapAuditEvent(log) {
  return {
    id: log.id,
    action: log.action,
    resource: log.resource,
    createdAt: log.createdAt,
    facilityId: log.facilityId || null,
    details: log.details || {}
  };
}

function buildChecklist({ prediction, tasks, alert, auditTrail }) {
  const taskCount = tasks.length;
  const alertExpected = toNumber(prediction?.score) >= ALERT_THRESHOLD;
  const hasPredictionAudit = auditTrail.some((log) => log.action === 'prediction_generated');
  const hasTaskAudit = auditTrail.some((log) => log.action === 'task_created');
  const hasAlertAudit = auditTrail.some((log) => log.action === 'risk_alert_dispatched');

  return [
    {
      key: 'prediction-generated',
      label: 'Prediction generated and stored',
      status: prediction ? 'complete' : 'missing',
      evidenceCount: hasPredictionAudit ? 1 : 0
    },
    {
      key: 'intervention-tasks',
      label: 'Intervention tasks created for high-risk case',
      status: prediction?.tier === 'High' ? (taskCount > 0 ? 'complete' : 'missing') : 'not_required',
      evidenceCount: hasTaskAudit ? taskCount : 0
    },
    {
      key: 'alert-dispatched',
      label: 'Operational alert dispatched when escalation threshold was met',
      status: alertExpected ? (alert ? 'complete' : 'missing') : 'not_required',
      evidenceCount: hasAlertAudit || alert ? 1 : 0
    },
    {
      key: 'audit-visible',
      label: 'Workflow is visible in audit history',
      status: auditTrail.length > 0 ? 'complete' : 'missing',
      evidenceCount: auditTrail.length
    }
  ];
}

function deriveWorkflowState({ prediction, tasks, alert }) {
  const completedTasks = tasks.filter((task) => task.status === 'done').length;
  const inProgressTasks = tasks.filter((task) => task.status === 'in-progress').length;
  const outstandingTasks = tasks.filter((task) => task.status !== 'done').length;

  if (alert?.status === 'resolved' && outstandingTasks === 0) {
    return 'resolved';
  }

  if (alert?.status === 'acknowledged' || inProgressTasks > 0 || completedTasks > 0) {
    return 'interventions_in_progress';
  }

  if (prediction?.tier === 'High' && (tasks.length > 0 || alert)) {
    return 'high_risk_active';
  }

  if (prediction?.tier === 'High') {
    return 'automation_missing';
  }

  return 'prediction_recorded';
}

async function buildPredictionWorkflowSummary(user, predictionId) {
  const prediction = await getPredictionForUser(user, predictionId);

  if (!prediction) {
    return null;
  }

  const [patient, facility, tasks, alerts, auditLogs] = await Promise.all([
    getPatientForUser(user, prediction.patientId),
    getFacilityById(prediction.facilityId),
    listTasksForUser(user, {
      patientId: prediction.patientId,
      predictionId: prediction.id
    }),
    listAlertsForUser(user, {
      patientId: prediction.patientId,
      predictionId: prediction.id,
      limit: 50
    }),
    listAuditLogsForUser(user, { limit: 250 })
  ]);

  if (!patient) {
    return null;
  }

  const taskIds = new Set(tasks.map((task) => String(task.id)));
  const alert = alerts.find((entry) => String(entry.predictionId || '') === String(prediction.id)) || null;
  const alertId = alert ? String(alert.id) : null;

  const auditTrail = auditLogs
    .filter((log) => {
      if (!WORKFLOW_AUDIT_ACTIONS.has(log.action)) {
        return false;
      }

      if (getLogPredictionId(log) === String(prediction.id)) {
        return true;
      }

      if (getLogPatientId(log) === String(prediction.patientId)) {
        return true;
      }

      if (alertId && getLogAlertId(log) === alertId) {
        return true;
      }

      const taskId = getLogTaskId(log);
      return Boolean(taskId && taskIds.has(taskId));
    })
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
    .map(mapAuditEvent);

  const completedTasks = tasks.filter((task) => task.status === 'done').length;
  const outstandingTasks = tasks.filter((task) => task.status !== 'done').length;

  return {
    prediction: {
      ...prediction,
      probability:
        prediction.probability !== undefined && prediction.probability !== null
          ? prediction.probability
          : Number((toNumber(prediction.score) / 100).toFixed(3)),
      method: prediction.method || (prediction.fallbackUsed ? 'rules' : 'ml')
    },
    patient: buildPatientWorkflowSummary(user, patient, prediction),
    facility: buildFacilitySummary(facility),
    tasks,
    alert,
    auditTrail,
    verification: {
      workflowState: deriveWorkflowState({ prediction, tasks, alert }),
      checklist: buildChecklist({ prediction, tasks, alert, auditTrail }),
      alertThreshold: ALERT_THRESHOLD,
      alertExpected: toNumber(prediction.score) >= ALERT_THRESHOLD,
      taskCount: tasks.length,
      completedTaskCount: completedTasks,
      outstandingTaskCount: outstandingTasks,
      alertStatus: alert?.status || null,
      auditEventCount: auditTrail.length
    }
  };
}

module.exports = {
  buildPredictionWorkflowSummary
};
