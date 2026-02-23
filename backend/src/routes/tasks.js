/**
 * Backend Routes - Tasks
 * Supports intervention task tracking with RBAC and audit logging.
 */

const express = require('express');
const {
  appendSyncEvent,
  createTasks,
  getPatientForUser,
  listTasksForUser,
  updateTaskForUser
} = require('../data');
const { requireAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/authorize');
const { logAudit } = require('../services/auditService');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

const ALLOWED_STATUS = new Set(['pending', 'in-progress', 'done']);
const ALLOWED_PRIORITY = new Set(['low', 'medium', 'high']);

router.use(requireAuth);

router.get('/', requirePermission('tasks:read'), asyncHandler(async (req, res) => {
  const tasks = await listTasksForUser(req.user, {
    patientId: req.query.patientId,
    status: req.query.status,
    priority: req.query.priority
  });

  await logAudit(req, {
    action: 'tasks_list_viewed',
    resource: 'tasks:list',
    details: {
      count: tasks.length
    }
  });

  return res.json({
    count: tasks.length,
    tasks
  });
}));

router.post('/', requirePermission('tasks:write'), asyncHandler(async (req, res) => {
  const patientId = String(req.body.patientId || '').trim();
  const title = String(req.body.title || '').trim();
  const category = String(req.body.category || '').trim();
  const priority = String(req.body.priority || '').trim();

  if (!patientId || !title || !category || !ALLOWED_PRIORITY.has(priority)) {
    return res.status(400).json({
      error: 'ValidationError',
      message: 'patientId, title, category, and valid priority are required.'
    });
  }

  const patient = await getPatientForUser(req.user, patientId);

  if (!patient) {
    return res.status(404).json({
      error: 'NotFound',
      message: 'Patient not found or not accessible.'
    });
  }

  const dueDate = req.body.dueDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

  const [task] = await createTasks([
    {
      patientId,
      facilityId: patient.facilityId,
      predictionId: req.body.predictionId || null,
      title,
      category,
      priority,
      dueDate,
      createdBy: req.user.id
    }
  ]);

  await logAudit(req, {
    action: 'task_created',
    resource: `task:${task.id}`,
    details: {
      patientId,
      priority
    }
  });

  await appendSyncEvent({
    facilityId: task.facilityId,
    eventType: 'mutation',
    operation: 'task_created',
    entityType: 'task',
    entityId: task.id,
    payload: {
      taskId: task.id,
      status: task.status
    },
    actorUserId: req.user.id,
    ipAddress: req.ip
  });

  return res.status(201).json({ task });
}));

router.patch('/:id', requirePermission('tasks:write'), asyncHandler(async (req, res) => {
  const patch = {};

  if (req.body.status !== undefined) {
    const normalizedStatus = String(req.body.status).trim();
    if (!ALLOWED_STATUS.has(normalizedStatus)) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'status must be pending, in-progress, or done.'
      });
    }
    patch.status = normalizedStatus;
  }

  if (req.body.assignee !== undefined) {
    patch.assignee = req.body.assignee;
  }

  if (req.body.dueDate !== undefined) {
    patch.dueDate = req.body.dueDate;
  }

  const task = await updateTaskForUser(req.user, req.params.id, patch);

  if (!task) {
    return res.status(404).json({
      error: 'NotFound',
      message: 'Task not found or not accessible.'
    });
  }

  await logAudit(req, {
    action: 'task_updated',
    resource: `task:${task.id}`,
    details: {
      status: task.status,
      assignee: task.assignee
    }
  });

  await appendSyncEvent({
    facilityId: task.facilityId,
    eventType: 'mutation',
    operation: 'task_updated',
    entityType: 'task',
    entityId: task.id,
    payload: {
      taskId: task.id,
      status: task.status
    },
    actorUserId: req.user.id,
    ipAddress: req.ip
  });

  return res.json({ task });
}));

module.exports = router;
