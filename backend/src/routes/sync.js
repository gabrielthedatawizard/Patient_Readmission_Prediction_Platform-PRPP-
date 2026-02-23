/**
 * Backend Routes - Offline Sync Contracts
 * Provides pull/push APIs with idempotent write semantics and conflict reporting.
 */

const express = require('express');
const {
  appendSyncEvent,
  createPatientForUser,
  createTasks,
  getPatientForUser,
  getTaskForUser,
  listSyncEventsForUser,
  updatePatientForUser,
  updatePredictionOverrideForUser,
  updateTaskForUser
} = require('../data');
const { hasPermission } = require('../config/roles');
const { requireAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/authorize');
const { logAudit } = require('../services/auditService');
const { getReplay, makeScope, setReplay } = require('../services/idempotencyService');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

const MAX_BATCH_OPERATIONS = 100;

function isStale(clientUpdatedAt, serverUpdatedAt) {
  if (!clientUpdatedAt || !serverUpdatedAt) {
    return false;
  }

  const clientTs = new Date(clientUpdatedAt).getTime();
  const serverTs = new Date(serverUpdatedAt).getTime();

  if (!Number.isFinite(clientTs) || !Number.isFinite(serverTs)) {
    return false;
  }

  return clientTs < serverTs;
}

function getClientOperationId(operation, index) {
  return operation.operationId || operation.id || `op-${index + 1}`;
}

async function handlePatientUpsert(req, operation) {
  const data = operation.data || {};

  if (!hasPermission(req.user.role, 'patients:write')) {
    return {
      status: 'rejected',
      reason: 'Permission denied for patient upsert.'
    };
  }

  if (!data.id || !data.name || data.age === undefined || !data.gender) {
    return {
      status: 'rejected',
      reason: 'Patient upsert requires id, name, age, and gender.'
    };
  }

  const existing = await getPatientForUser(req.user, data.id);

  if (existing) {
    if (isStale(data.clientUpdatedAt, existing.updatedAt)) {
      return {
        status: 'conflict',
        reason: 'Client patient record is older than server state.',
        serverUpdatedAt: existing.updatedAt
      };
    }

    const updated = await updatePatientForUser(req.user, data.id, {
      name: data.name,
      age: Number(data.age),
      gender: data.gender,
      phone: data.phone,
      address: data.address,
      insurance: data.insurance,
      status: data.status,
      facilityId: data.facilityId,
      clinicalProfile: data.clinicalProfile
    });

    if (!updated) {
      return {
        status: 'rejected',
        reason: 'Patient update not permitted in current scope.'
      };
    }

    await appendSyncEvent({
      facilityId: updated.facilityId,
      eventType: 'mutation',
      operation: 'patient_updated',
      entityType: 'patient',
      entityId: updated.id,
      payload: {
        patientId: updated.id,
        status: updated.status
      },
      actorUserId: req.user.id,
      ipAddress: req.ip
    });

    return {
      status: 'applied',
      result: {
        patientId: updated.id,
        mode: 'updated',
        updatedAt: updated.updatedAt
      }
    };
  }

  const created = await createPatientForUser(req.user, {
    id: data.id,
    name: data.name,
    age: Number(data.age),
    gender: data.gender,
    phone: data.phone,
    address: data.address,
    insurance: data.insurance,
    status: data.status,
    facilityId: data.facilityId,
    clinicalProfile: data.clinicalProfile
  });

  await appendSyncEvent({
    facilityId: created.facilityId,
    eventType: 'mutation',
    operation: 'patient_created',
    entityType: 'patient',
    entityId: created.id,
    payload: {
      patientId: created.id,
      status: created.status
    },
    actorUserId: req.user.id,
    ipAddress: req.ip
  });

  return {
    status: 'applied',
    result: {
      patientId: created.id,
      mode: 'created',
      updatedAt: created.updatedAt
    }
  };
}

async function handleTaskStatusUpdate(req, operation) {
  const data = operation.data || {};

  if (!hasPermission(req.user.role, 'tasks:write')) {
    return {
      status: 'rejected',
      reason: 'Permission denied for task updates.'
    };
  }

  if (!data.taskId || !data.status) {
    return {
      status: 'rejected',
      reason: 'Task status update requires taskId and status.'
    };
  }

  const current = await getTaskForUser(req.user, data.taskId);

  if (!current) {
    return {
      status: 'rejected',
      reason: 'Task not found or inaccessible.'
    };
  }

  if (isStale(data.clientUpdatedAt, current.updatedAt)) {
    return {
      status: 'conflict',
      reason: 'Client task record is older than server state.',
      serverUpdatedAt: current.updatedAt
    };
  }

  const updated = await updateTaskForUser(req.user, data.taskId, {
    status: data.status,
    assignee: data.assignee,
    dueDate: data.dueDate
  });

  if (!updated) {
    return {
      status: 'rejected',
      reason: 'Task update failed.'
    };
  }

  await appendSyncEvent({
    facilityId: updated.facilityId,
    eventType: 'mutation',
    operation: 'task_updated',
    entityType: 'task',
    entityId: updated.id,
    payload: {
      taskId: updated.id,
      status: updated.status
    },
    actorUserId: req.user.id,
    ipAddress: req.ip
  });

  return {
    status: 'applied',
    result: {
      taskId: updated.id,
      status: updated.status,
      updatedAt: updated.updatedAt
    }
  };
}

async function handleTaskCreate(req, operation) {
  const data = operation.data || {};

  if (!hasPermission(req.user.role, 'tasks:write')) {
    return {
      status: 'rejected',
      reason: 'Permission denied for task creation.'
    };
  }

  if (!data.patientId || !data.title || !data.category || !data.priority) {
    return {
      status: 'rejected',
      reason: 'Task create requires patientId, title, category, and priority.'
    };
  }

  const patient = await getPatientForUser(req.user, data.patientId);

  if (!patient) {
    return {
      status: 'rejected',
      reason: 'Target patient not found or inaccessible.'
    };
  }

  const dueDate = data.dueDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

  const [created] = await createTasks([
    {
      patientId: data.patientId,
      predictionId: data.predictionId || null,
      facilityId: patient.facilityId,
      title: data.title,
      category: data.category,
      priority: data.priority,
      dueDate,
      assignee: data.assignee,
      createdBy: req.user.id
    }
  ]);

  await appendSyncEvent({
    facilityId: created.facilityId,
    eventType: 'mutation',
    operation: 'task_created',
    entityType: 'task',
    entityId: created.id,
    payload: {
      taskId: created.id,
      status: created.status
    },
    actorUserId: req.user.id,
    ipAddress: req.ip
  });

  return {
    status: 'applied',
    result: {
      taskId: created.id,
      status: created.status,
      updatedAt: created.updatedAt
    }
  };
}

async function handlePredictionOverride(req, operation) {
  const data = operation.data || {};

  if (!hasPermission(req.user.role, 'predictions:override')) {
    return {
      status: 'rejected',
      reason: 'Permission denied for prediction override.'
    };
  }

  if (!data.predictionId || !data.newTier || !data.reason) {
    return {
      status: 'rejected',
      reason: 'Prediction override requires predictionId, newTier, and reason.'
    };
  }

  const updated = await updatePredictionOverrideForUser(req.user, data.predictionId, {
    newTier: data.newTier,
    reason: data.reason
  });

  if (!updated) {
    return {
      status: 'rejected',
      reason: 'Prediction not found or inaccessible.'
    };
  }

  await appendSyncEvent({
    facilityId: updated.facilityId,
    eventType: 'mutation',
    operation: 'prediction_overridden',
    entityType: 'prediction',
    entityId: updated.id,
    payload: {
      predictionId: updated.id,
      tier: updated.tier
    },
    actorUserId: req.user.id,
    ipAddress: req.ip
  });

  return {
    status: 'applied',
    result: {
      predictionId: updated.id,
      tier: updated.tier,
      updatedAt: updated.override?.overriddenAt || new Date().toISOString()
    }
  };
}

const operationHandlers = {
  patient_upsert: handlePatientUpsert,
  task_status_update: handleTaskStatusUpdate,
  task_create: handleTaskCreate,
  prediction_override: handlePredictionOverride
};

router.use(requireAuth);

router.get('/pull', requirePermission('sync:pull'), asyncHandler(async (req, res) => {
  const events = await listSyncEventsForUser(req.user, {
    since: req.query.since,
    limit: req.query.limit,
    facilityId: req.query.facilityId
  });

  const nextCursor = events.length > 0 ? events[events.length - 1].cursor : req.query.since || null;

  await logAudit(req, {
    action: 'sync_pull',
    resource: 'sync:pull',
    details: {
      count: events.length,
      since: req.query.since || null,
      nextCursor
    }
  });

  return res.json({
    count: events.length,
    events,
    nextCursor,
    serverTime: new Date().toISOString()
  });
}));

router.post('/push', requirePermission('sync:push'), asyncHandler(async (req, res) => {
  const idempotencyKey = String(req.get('Idempotency-Key') || req.body.idempotencyKey || '').trim();

  if (!idempotencyKey) {
    return res.status(400).json({
      error: 'ValidationError',
      message: 'Idempotency-Key header is required for sync push.'
    });
  }

  const scope = makeScope({
    userId: req.user.id,
    route: 'sync-push',
    key: idempotencyKey
  });

  const replay = getReplay(scope);
  if (replay) {
    return res.status(replay.statusCode).json({
      ...replay.body,
      replayed: true
    });
  }

  const operations = Array.isArray(req.body.operations) ? req.body.operations : [];

  if (operations.length === 0) {
    return res.status(400).json({
      error: 'ValidationError',
      message: 'operations array is required.'
    });
  }

  if (operations.length > MAX_BATCH_OPERATIONS) {
    return res.status(400).json({
      error: 'ValidationError',
      message: `operations array must not exceed ${MAX_BATCH_OPERATIONS}.`
    });
  }

  const results = [];
  let applied = 0;
  let conflicts = 0;
  let rejected = 0;

  for (const [index, operation] of operations.entries()) {
    const clientOperationId = getClientOperationId(operation, index);
    const operationType = operation.type;
    const handler = operationHandlers[operationType];

    if (!handler) {
      rejected += 1;
      results.push({
        operationId: clientOperationId,
        type: operationType || null,
        status: 'rejected',
        reason: 'Unsupported operation type.'
      });
      continue;
    }

    const outcome = await handler(req, operation);

    if (outcome.status === 'applied') {
      applied += 1;
    } else if (outcome.status === 'conflict') {
      conflicts += 1;
    } else {
      rejected += 1;
    }

    results.push({
      operationId: clientOperationId,
      type: operationType,
      ...outcome
    });
  }

  const responseBody = {
    summary: {
      total: operations.length,
      applied,
      conflicts,
      rejected
    },
    results,
    serverTime: new Date().toISOString(),
    replayed: false
  };

  setReplay(scope, {
    statusCode: 200,
    body: responseBody
  });

  await logAudit(req, {
    action: 'sync_push',
    resource: 'sync:push',
    details: {
      idempotencyKey,
      total: operations.length,
      applied,
      conflicts,
      rejected
    }
  });

  return res.json(responseBody);
}));

module.exports = router;
