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

function parseCsv(value) {
  if (!value) {
    return [];
  }
  return String(value)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

router.get('/', requirePermission('tasks:read'), asyncHandler(async (req, res) => {
  const statusFilters = parseCsv(req.query.status);
  const tasks = await listTasksForUser(req.user, {
    patientId: req.query.patientId,
    status: statusFilters.length === 1 ? statusFilters[0] : undefined,
    priority: req.query.priority
  });

  const assigneeFilter = String(req.query.assignedTo || '').trim();
  const includePatient = parseCsv(req.query.include).includes('patient');

  const scoped = tasks.filter((task) => {
    if (statusFilters.length > 1 && !statusFilters.includes(task.status)) {
      return false;
    }

    if (assigneeFilter) {
      if (assigneeFilter === 'self') {
        return String(task.assignee || '').trim() === String(req.user.id || '').trim();
      }
      return String(task.assignee || '').trim() === assigneeFilter;
    }

    return true;
  });

  const withPatient = includePatient
    ? await Promise.all(
        scoped.map(async (task) => ({
          ...task,
          patient: await getPatientForUser(req.user, task.patientId)
        }))
      )
    : scoped;

  await logAudit(req, {
    action: 'tasks_list_viewed',
    resource: 'tasks:list',
    details: {
      count: withPatient.length
    }
  });

  return res.json({
    count: withPatient.length,
    tasks: withPatient
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

  const wss = req.app.get('wss');
  if (wss) {
    wss.broadcastToFacility(task.facilityId, 'TASK_ASSIGNED', {
      id: task.id,
      taskId: task.id,
      patientId: task.patientId,
      title: task.title,
      status: task.status
    });
  }

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

  const wss = req.app.get('wss');
  if (wss) {
    wss.broadcastToFacility(task.facilityId, 'TASK_UPDATED', {
      id: task.id,
      taskId: task.id,
      patientId: task.patientId,
      status: task.status
    });
  }

  return res.json({ task });
}));

module.exports = router;
