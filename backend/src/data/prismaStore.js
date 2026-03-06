const bcrypt = require('bcrypt');
const { prisma } = require('../lib/prisma');

const DEMO_PASSWORD = 'Trip@2026';

function toDateIso(value) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}

function mapStatusFromDb(status) {
  if (status === 'in_progress') {
    return 'in-progress';
  }

  return status;
}

function mapStatusToDb(status) {
  if (!status) {
    return undefined;
  }

  if (status === 'in-progress') {
    return 'in_progress';
  }

  return status;
}

function toPublicUser(user) {
  if (!user) {
    return null;
  }

  const role = typeof user.role === 'string' ? user.role : user.role?.slug;
  const regionCode = user.regionCode || user.region?.code || null;

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role,
    facilityId: user.facilityId || null,
    regionCode,
    mfaEnabled: Boolean(user.mfaEnabled)
  };
}

function mapFacility(facility) {
  if (!facility) {
    return null;
  }

  return {
    id: facility.id,
    name: facility.name,
    regionCode: facility.regionCode || facility.region?.code || null,
    district: facility.district,
    level: facility.level
  };
}

function mapPrediction(prediction) {
  if (!prediction) {
    return null;
  }

  return {
    id: prediction.id,
    patientId: prediction.patientId,
    visitId: prediction.visitId || null,
    facilityId: prediction.facilityId,
    score: prediction.score,
    tier: prediction.tier,
    confidence: prediction.confidence,
    confidenceInterval: {
      low: prediction.confidenceLow,
      high: prediction.confidenceHigh
    },
    modelVersion: prediction.modelVersion,
    modelType: prediction.modelType,
    fallbackUsed: prediction.fallbackUsed,
    factors: prediction.factors || [],
    explanation: prediction.explanation,
    dataQuality: prediction.dataQuality || null,
    createdBy: prediction.generatedById || null,
    generatedAt: toDateIso(prediction.generatedAt),
    override:
      prediction.overrideTier && prediction.overrideReason
        ? {
            overriddenBy: prediction.generatedById || null,
            previousTier: prediction.tier,
            newTier: prediction.overrideTier,
            reason: prediction.overrideReason,
            overriddenAt: toDateIso(prediction.overriddenAt)
          }
        : null
  };
}

function mapVisit(visit) {
  if (!visit) {
    return null;
  }

  return {
    id: visit.id,
    patientId: visit.patientId,
    facilityId: visit.facilityId,
    admissionDate: toDateIso(visit.admissionDate),
    dischargeDate: toDateIso(visit.dischargeDate),
    diagnosis: visit.diagnosis,
    ward: visit.ward,
    lengthOfStay: visit.lengthOfStay,
    createdAt: toDateIso(visit.createdAt),
    updatedAt: toDateIso(visit.updatedAt)
  };
}

function mapTask(task) {
  if (!task) {
    return null;
  }

  return {
    id: task.id,
    patientId: task.patientId,
    predictionId: task.predictionId,
    facilityId: task.facilityId,
    title: task.title,
    category: task.category,
    priority: task.priority,
    status: mapStatusFromDb(task.status),
    dueDate: toDateIso(task.dueDate),
    assignee: task.assignee,
    createdBy: task.updatedById,
    completedAt: toDateIso(task.completedAt),
    createdAt: toDateIso(task.createdAt),
    updatedAt: toDateIso(task.updatedAt)
  };
}

function mapAlert(alert) {
  if (!alert) {
    return null;
  }

  return {
    id: alert.id,
    patientId: alert.patientId,
    predictionId: alert.predictionId || null,
    facilityId: alert.facilityId,
    score: alert.score,
    tier: alert.tier,
    threshold: alert.threshold,
    severity: alert.severity,
    message: alert.message || null,
    channels: alert.channels || [],
    status: alert.status,
    acknowledgedAt: toDateIso(alert.acknowledgedAt),
    acknowledgedById: alert.acknowledgedById || null,
    resolvedAt: toDateIso(alert.resolvedAt),
    resolvedById: alert.resolvedById || null,
    resolutionNote: alert.resolutionNote || null,
    createdAt: toDateIso(alert.createdAt),
    updatedAt: toDateIso(alert.updatedAt)
  };
}

function mapPatient(patient) {
  if (!patient) {
    return null;
  }

  return {
    id: patient.id,
    name: patient.name,
    age: patient.age,
    gender: patient.gender,
    phone: patient.phone,
    address: patient.address,
    insurance: patient.insurance,
    facilityId: patient.facilityId,
    status: patient.status,
    clinicalProfile: patient.clinicalProfile || { age: patient.age },
    createdAt: toDateIso(patient.createdAt),
    updatedAt: toDateIso(patient.updatedAt)
  };
}

async function resolveAccessibleFacilityIds(user) {
  if (!user) {
    return [];
  }

  if (user.role === 'moh' || user.role === 'ml_engineer') {
    const facilities = await prisma.facility.findMany({
      select: { id: true }
    });

    return facilities.map((facility) => facility.id);
  }

  if (user.role === 'rhmt' || user.role === 'chmt') {
    const facilities = await prisma.facility.findMany({
      where: {
        region: {
          code: user.regionCode
        }
      },
      select: { id: true }
    });

    return facilities.map((facility) => facility.id);
  }

  return user.facilityId ? [user.facilityId] : [];
}

async function getFacilityById(facilityId) {
  const facility = await prisma.facility.findUnique({
    where: { id: facilityId },
    include: {
      region: {
        select: {
          code: true
        }
      }
    }
  });

  return mapFacility(facility);
}

async function getUserByEmail(email) {
  if (!email) {
    return null;
  }

  return prisma.user.findUnique({
    where: {
      email: String(email).toLowerCase()
    },
    include: {
      role: {
        select: {
          slug: true
        }
      },
      region: {
        select: {
          code: true
        }
      }
    }
  });
}

async function getUserById(id) {
  if (!id) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id },
    include: {
      role: {
        select: {
          slug: true
        }
      },
      region: {
        select: {
          code: true
        }
      }
    }
  });
}

async function canAccessFacility(user, facilityId) {
  const accessibleFacilityIds = await resolveAccessibleFacilityIds(user);
  return accessibleFacilityIds.includes(facilityId);
}

async function canAccessPatient(user, patient) {
  if (!patient) {
    return false;
  }

  return canAccessFacility(user, patient.facilityId);
}

async function listPatientsForUser(user, filters = {}) {
  const accessibleFacilityIds = await resolveAccessibleFacilityIds(user);

  if (accessibleFacilityIds.length === 0) {
    return [];
  }

  const where = {
    facilityId: {
      in: accessibleFacilityIds
    }
  };

  if (filters.facilityId) {
    where.facilityId = filters.facilityId;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.search) {
    const query = String(filters.search).trim();
    where.OR = [
      {
        id: {
          contains: query,
          mode: 'insensitive'
        }
      },
      {
        name: {
          contains: query,
          mode: 'insensitive'
        }
      }
    ];
  }

  const patients = await prisma.patient.findMany({
    where,
    orderBy: {
      updatedAt: 'desc'
    }
  });

  return patients.map(mapPatient);
}

async function getPatientById(patientId) {
  if (!patientId) {
    return null;
  }

  const patient = await prisma.patient.findUnique({
    where: {
      id: patientId
    }
  });

  return mapPatient(patient);
}

async function getPatientForUser(user, patientId) {
  const patient = await getPatientById(patientId);

  if (!patient) {
    return null;
  }

  const canAccess = await canAccessPatient(user, patient);
  if (!canAccess) {
    return null;
  }

  return patient;
}

async function getVisitById(visitId) {
  if (!visitId) {
    return null;
  }

  const visit = await prisma.visit.findUnique({
    where: {
      id: visitId
    }
  });

  return mapVisit(visit);
}

async function getVisitForUser(user, visitId) {
  const visit = await getVisitById(visitId);

  if (!visit) {
    return null;
  }

  if (!(await canAccessFacility(user, visit.facilityId))) {
    return null;
  }

  return visit;
}

async function createPatientForUser(user, payload) {
  const facilityId = payload.facilityId || user.facilityId;

  if (!facilityId || !(await canAccessFacility(user, facilityId))) {
    throw new Error('You do not have access to create a patient in this facility.');
  }

  const patient = await prisma.patient.create({
    data: {
      id: payload.id,
      name: payload.name,
      age: Number(payload.age),
      gender: String(payload.gender || '').toLowerCase(),
      phone: payload.phone || null,
      address: payload.address || null,
      insurance: payload.insurance || null,
      status: payload.status || 'admitted',
      clinicalProfile: payload.clinicalProfile || { age: Number(payload.age) },
      facilityId
    }
  });

  return mapPatient(patient);
}

async function updatePatientForUser(user, patientId, payload) {
  const current = await getPatientForUser(user, patientId);

  if (!current) {
    return null;
  }

  if (
    payload.facilityId &&
    payload.facilityId !== current.facilityId &&
    !(await canAccessFacility(user, payload.facilityId))
  ) {
    throw new Error('You do not have access to move this patient to the requested facility.');
  }

  const updated = await prisma.patient.update({
    where: {
      id: patientId
    },
    data: {
      name: payload.name,
      age: payload.age,
      gender: payload.gender ? String(payload.gender).toLowerCase() : undefined,
      phone: payload.phone,
      address: payload.address,
      insurance: payload.insurance,
      status: payload.status,
      clinicalProfile:
        payload.clinicalProfile && typeof payload.clinicalProfile === 'object'
          ? {
              ...(current.clinicalProfile || {}),
              ...payload.clinicalProfile
            }
          : undefined,
      facilityId: payload.facilityId
    }
  });

  return mapPatient(updated);
}

async function createPrediction(entry) {
  const prediction = await prisma.prediction.create({
    data: {
      patientId: entry.patientId,
      visitId: entry.visitId || null,
      facilityId: entry.facilityId,
      score: entry.score,
      tier: entry.tier,
      factors: entry.factors || [],
      explanation: entry.explanation || null,
      confidence: entry.confidence,
      confidenceLow: entry.confidenceInterval?.low ?? 0,
      confidenceHigh: entry.confidenceInterval?.high ?? 100,
      modelVersion: entry.modelVersion,
      modelType: entry.modelType,
      fallbackUsed: Boolean(entry.fallbackUsed),
      dataQuality: entry.dataQuality || null,
      generatedById: entry.createdBy || null
    }
  });

  return mapPrediction(prediction);
}

async function getPredictionForUser(user, predictionId) {
  const prediction = await prisma.prediction.findUnique({
    where: {
      id: predictionId
    }
  });

  if (!prediction) {
    return null;
  }

  if (!(await canAccessFacility(user, prediction.facilityId))) {
    return null;
  }

  return mapPrediction(prediction);
}

async function listPredictionsForPatient(user, patientId) {
  const patient = await getPatientForUser(user, patientId);

  if (!patient) {
    return [];
  }

  const predictions = await prisma.prediction.findMany({
    where: {
      patientId
    },
    orderBy: {
      generatedAt: 'desc'
    }
  });

  return predictions.map(mapPrediction);
}

async function updatePredictionOverrideForUser(user, predictionId, overridePayload) {
  const current = await prisma.prediction.findUnique({
    where: {
      id: predictionId
    }
  });

  if (!current) {
    return null;
  }

  if (!(await canAccessFacility(user, current.facilityId))) {
    return null;
  }

  const updated = await prisma.prediction.update({
    where: {
      id: predictionId
    },
    data: {
      overrideTier: overridePayload.newTier,
      overrideReason: overridePayload.reason,
      overriddenAt: new Date(),
      tier: overridePayload.newTier
    }
  });

  const mapped = mapPrediction(updated);
  mapped.override = {
    overriddenBy: user.id,
    previousTier: current.tier,
    newTier: overridePayload.newTier,
    reason: overridePayload.reason,
    overriddenAt: toDateIso(updated.overriddenAt)
  };

  return mapped;
}

async function createTasks(taskEntries) {
  const tasks = [];

  for (const entry of taskEntries) {
    const task = await prisma.task.create({
      data: {
        patientId: entry.patientId,
        predictionId: entry.predictionId || null,
        facilityId: entry.facilityId,
        title: entry.title,
        category: entry.category,
        priority: entry.priority,
        status: mapStatusToDb(entry.status || 'pending') || 'pending',
        assignee: entry.assignee || null,
        dueDate: new Date(entry.dueDate),
        updatedById: entry.createdBy || null
      }
    });

    tasks.push(mapTask(task));
  }

  return tasks;
}

async function listTasksForUser(user, filters = {}) {
  const accessibleFacilityIds = await resolveAccessibleFacilityIds(user);

  if (accessibleFacilityIds.length === 0) {
    return [];
  }

  const where = {
    facilityId: {
      in: accessibleFacilityIds
    }
  };

  if (filters.patientId) {
    where.patientId = filters.patientId;
  }

  if (filters.priority) {
    where.priority = filters.priority;
  }

  if (filters.status) {
    where.status = mapStatusToDb(filters.status);
  }

  if (filters.assignee) {
    where.assignee = filters.assignee;
  }

  const tasks = await prisma.task.findMany({
    where,
    orderBy: {
      dueDate: 'asc'
    }
  });

  return tasks.map(mapTask);
}

async function getTaskForUser(user, taskId) {
  if (!taskId) {
    return null;
  }

  const task = await prisma.task.findUnique({
    where: {
      id: taskId
    }
  });

  if (!task) {
    return null;
  }

  if (!(await canAccessFacility(user, task.facilityId))) {
    return null;
  }

  return mapTask(task);
}

async function updateTaskForUser(user, taskId, patch) {
  const current = await prisma.task.findUnique({
    where: {
      id: taskId
    }
  });

  if (!current) {
    return null;
  }

  if (!(await canAccessFacility(user, current.facilityId))) {
    return null;
  }

  const data = {};

  if (patch.status !== undefined) {
    data.status = mapStatusToDb(patch.status);

    if (patch.status === 'done') {
      data.completedAt = new Date();
    }
  }

  if (patch.assignee !== undefined) {
    data.assignee = patch.assignee;
  }

  if (patch.dueDate !== undefined) {
    data.dueDate = new Date(patch.dueDate);
  }

  if (user.id) {
    data.updatedById = user.id;
  }

  const task = await prisma.task.update({
    where: {
      id: taskId
    },
    data
  });

  return mapTask(task);
}

async function createRiskAlert(entry) {
  if (entry.predictionId) {
    const existing = await prisma.alert.findUnique({
      where: {
        predictionId: entry.predictionId
      }
    });

    if (existing) {
      return mapAlert(existing);
    }
  }

  const created = await prisma.alert.create({
    data: {
      patientId: entry.patientId,
      predictionId: entry.predictionId || null,
      facilityId: entry.facilityId,
      score: Number(entry.score || 0),
      tier: entry.tier || 'High',
      threshold: Number(entry.threshold || 80),
      severity: entry.severity || 'high',
      message: entry.message || null,
      channels: Array.isArray(entry.channels) ? entry.channels : [],
      status: entry.status || 'open'
    }
  });

  return mapAlert(created);
}

async function listAlertsForUser(user, filters = {}) {
  const accessibleFacilityIds = await resolveAccessibleFacilityIds(user);
  if (!accessibleFacilityIds.length) {
    return [];
  }

  const where = {
    facilityId: {
      in: accessibleFacilityIds
    }
  };

  if (filters.patientId) {
    where.patientId = String(filters.patientId);
  }

  if (filters.status) {
    where.status = String(filters.status);
  }

  if (filters.facilityId) {
    const requestedFacilityId = String(filters.facilityId);
    if (!accessibleFacilityIds.includes(requestedFacilityId)) {
      return [];
    }
    where.facilityId = requestedFacilityId;
  }

  const take = Math.min(Math.max(Number(filters.limit) || 100, 1), 500);
  const skip = Math.max(Number(filters.offset) || 0, 0);

  const alerts = await prisma.alert.findMany({
    where,
    orderBy: {
      createdAt: 'desc'
    },
    skip,
    take
  });

  return alerts.map(mapAlert);
}

async function getAlertForUser(user, alertId) {
  if (!alertId) {
    return null;
  }

  const alert = await prisma.alert.findUnique({
    where: {
      id: alertId
    }
  });

  if (!alert) {
    return null;
  }

  if (!(await canAccessFacility(user, alert.facilityId))) {
    return null;
  }

  return mapAlert(alert);
}

async function updateAlertForUser(user, alertId, patch = {}) {
  const current = await prisma.alert.findUnique({
    where: {
      id: alertId
    }
  });

  if (!current) {
    return null;
  }

  if (!(await canAccessFacility(user, current.facilityId))) {
    return null;
  }

  const data = {};

  if (patch.status !== undefined) {
    data.status = patch.status;
  }

  if (patch.acknowledgedAt !== undefined) {
    data.acknowledgedAt = patch.acknowledgedAt ? new Date(patch.acknowledgedAt) : null;
  }

  if (patch.acknowledgedById !== undefined) {
    data.acknowledgedById = patch.acknowledgedById || null;
  }

  if (patch.resolvedAt !== undefined) {
    data.resolvedAt = patch.resolvedAt ? new Date(patch.resolvedAt) : null;
  }

  if (patch.resolvedById !== undefined) {
    data.resolvedById = patch.resolvedById || null;
  }

  if (patch.resolutionNote !== undefined) {
    data.resolutionNote = patch.resolutionNote || null;
  }

  const updated = await prisma.alert.update({
    where: {
      id: alertId
    },
    data
  });

  return mapAlert(updated);
}

async function createAuditLog(entry) {
  const created = await prisma.auditLog.create({
    data: {
      userId: entry.userId || null,
      facilityId: entry.facilityId || null,
      action: entry.action,
      resource: entry.resource || null,
      details: {
        ...(entry.details || {}),
        userRole: entry.userRole || null,
        regionCode: entry.regionCode || null
      },
      ipAddress: entry.ipAddress || null
    }
  });

  return {
    id: created.id,
    userId: created.userId,
    userRole: created.details?.userRole || null,
    action: created.action,
    resource: created.resource,
    details: created.details,
    ipAddress: created.ipAddress,
    facilityId: created.facilityId,
    regionCode: created.details?.regionCode || null,
    createdAt: toDateIso(created.createdAt)
  };
}

async function listAuditLogsForUser(user, options = {}) {
  const limit = Math.min(Number(options.limit) || 100, 500);
  const offset = Math.max(Number(options.offset) || 0, 0);

  const where = {};

  if (user.role === 'rhmt' || user.role === 'chmt') {
    const facilityIds = await resolveAccessibleFacilityIds(user);
    where.facilityId = {
      in: facilityIds
    };
  } else if (user.role !== 'moh' && user.role !== 'ml_engineer') {
    where.facilityId = user.facilityId || '__none__';
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: {
      createdAt: 'desc'
    },
    skip: offset,
    take: limit
  });

  return logs.map((log) => ({
    id: log.id,
    userId: log.userId,
    userRole: log.details?.userRole || null,
    action: log.action,
    resource: log.resource,
    details: log.details,
    ipAddress: log.ipAddress,
    facilityId: log.facilityId,
    regionCode: log.details?.regionCode || null,
    createdAt: toDateIso(log.createdAt)
  }));
}

async function buildDataQualitySnapshot() {
  const patients = await prisma.patient.findMany({
    select: {
      phone: true,
      insurance: true,
      status: true
    }
  });

  const fields = ['phone', 'insurance', 'status'];
  let present = 0;
  let total = 0;

  patients.forEach((patient) => {
    fields.forEach((field) => {
      total += 1;

      if (patient[field] !== null && patient[field] !== undefined && patient[field] !== '') {
        present += 1;
      }
    });
  });

  const completeness = total === 0 ? 1 : present / total;

  return {
    generatedAt: new Date().toISOString(),
    patientCount: patients.length,
    criticalFieldCompleteness: Number(completeness.toFixed(3)),
    qualityStatus: completeness < 0.7 ? 'alert' : 'ok'
  };
}

async function buildFairnessSnapshot() {
  const predictions = await prisma.prediction.findMany({
    include: {
      patient: {
        select: {
          gender: true
        }
      }
    }
  });

  const totals = new Map();

  predictions.forEach((prediction) => {
    const groupKey = prediction.patient?.gender || 'unknown';

    if (!totals.has(groupKey)) {
      totals.set(groupKey, { count: 0, scoreSum: 0 });
    }

    const group = totals.get(groupKey);
    group.count += 1;
    group.scoreSum += prediction.score;
  });

  const groups = Array.from(totals.entries()).map(([group, stats]) => ({
    group,
    predictionCount: stats.count,
    meanScore: Number((stats.scoreSum / stats.count).toFixed(2))
  }));

  const means = groups.map((item) => item.meanScore);
  const variance = means.length >= 2 ? Math.max(...means) - Math.min(...means) : 0;

  return {
    generatedAt: new Date().toISOString(),
    dimension: 'gender',
    groups,
    variance,
    fairnessStatus: variance > 12 ? 'alert' : 'ok'
  };
}

async function appendSyncEvent(entry) {
  const created = await prisma.auditLog.create({
    data: {
      userId: entry.actorUserId || null,
      facilityId: entry.facilityId || null,
      action: 'sync_event',
      resource: `${entry.entityType}:${entry.entityId}`,
      details: {
        eventType: entry.eventType || 'mutation',
        operation: entry.operation,
        entityType: entry.entityType,
        entityId: entry.entityId,
        payload: entry.payload || {},
        actorUserId: entry.actorUserId || null
      },
      ipAddress: entry.ipAddress || null
    }
  });

  return {
    id: created.id,
    cursor: `${toDateIso(created.createdAt)}|${created.id}`,
    facilityId: created.facilityId,
    eventType: created.details?.eventType || 'mutation',
    operation: created.details?.operation || null,
    entityType: created.details?.entityType || null,
    entityId: created.details?.entityId || null,
    payload: created.details?.payload || {},
    actorUserId: created.details?.actorUserId || null,
    createdAt: toDateIso(created.createdAt)
  };
}

async function listSyncEventsForUser(user, options = {}) {
  const limit = Math.min(Math.max(Number(options.limit) || 50, 1), 500);
  const where = {
    action: 'sync_event'
  };

  if (options.since) {
    const sinceRaw = String(options.since).split('|')[0];
    const since = new Date(sinceRaw);
    if (!Number.isNaN(since.getTime())) {
      where.createdAt = {
        gt: since
      };
    }
  }

  if (options.facilityId) {
    where.facilityId = options.facilityId;
  } else if (user.role === 'rhmt' || user.role === 'chmt') {
    const accessible = await resolveAccessibleFacilityIds(user);
    where.facilityId = {
      in: accessible
    };
  } else if (user.role !== 'moh' && user.role !== 'ml_engineer') {
    where.facilityId = user.facilityId || '__none__';
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: {
      createdAt: 'asc'
    },
    take: limit
  });

  return logs.map((log) => ({
    id: log.id,
    cursor: `${toDateIso(log.createdAt)}|${log.id}`,
    facilityId: log.facilityId,
    eventType: log.details?.eventType || 'mutation',
    operation: log.details?.operation || null,
    entityType: log.details?.entityType || null,
    entityId: log.details?.entityId || null,
    payload: log.details?.payload || {},
    actorUserId: log.details?.actorUserId || null,
    createdAt: toDateIso(log.createdAt)
  }));
}

module.exports = {
  DEMO_PASSWORD,
  getFacilityById,
  getUserByEmail,
  getUserById,
  toPublicUser,
  canAccessFacility,
  canAccessPatient,
  listPatientsForUser,
  getPatientById,
  getPatientForUser,
  getVisitById,
  getVisitForUser,
  createPatientForUser,
  updatePatientForUser,
  createPrediction,
  getPredictionForUser,
  listPredictionsForPatient,
  updatePredictionOverrideForUser,
  createTasks,
  listTasksForUser,
  getTaskForUser,
  updateTaskForUser,
  createRiskAlert,
  listAlertsForUser,
  getAlertForUser,
  updateAlertForUser,
  createAuditLog,
  listAuditLogsForUser,
  appendSyncEvent,
  listSyncEventsForUser,
  buildDataQualitySnapshot,
  buildFairnessSnapshot
};
