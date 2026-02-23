/**
 * Backend Routes - Risk Predictions
 * Produces explainable risk outputs and fallback behavior.
 */

const express = require('express');
const {
  appendSyncEvent,
  createPrediction,
  createTasks,
  getPatientForUser,
  listPredictionsForPatient,
  updatePredictionOverrideForUser
} = require('../data');
const { requireAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/authorize');
const { logAudit } = require('../services/auditService');
const { predictReadmission } = require('../services/riskEngine');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

function getDueDate(days) {
  const due = new Date();
  due.setDate(due.getDate() + days);
  return due.toISOString();
}

function buildInterventionTasks({ patient, prediction, userId }) {
  const baseTasks = [];

  if (prediction.tier === 'High') {
    baseTasks.push(
      {
        patientId: patient.id,
        predictionId: prediction.id,
        facilityId: patient.facilityId,
        title: 'Complete medication reconciliation within 24 hours',
        category: 'medication',
        priority: 'high',
        dueDate: getDueDate(1),
        createdBy: userId
      },
      {
        patientId: patient.id,
        predictionId: prediction.id,
        facilityId: patient.facilityId,
        title: 'Schedule 48-hour follow-up call',
        category: 'followup',
        priority: 'high',
        dueDate: getDueDate(2),
        createdBy: userId
      },
      {
        patientId: patient.id,
        predictionId: prediction.id,
        facilityId: patient.facilityId,
        title: 'Discharge education reinforcement (Swahili)',
        category: 'education',
        priority: 'high',
        dueDate: getDueDate(1),
        createdBy: userId
      }
    );
  } else if (prediction.tier === 'Medium') {
    baseTasks.push(
      {
        patientId: patient.id,
        predictionId: prediction.id,
        facilityId: patient.facilityId,
        title: 'Schedule 7-day follow-up appointment',
        category: 'followup',
        priority: 'medium',
        dueDate: getDueDate(7),
        createdBy: userId
      },
      {
        patientId: patient.id,
        predictionId: prediction.id,
        facilityId: patient.facilityId,
        title: 'Confirm medication pick-up plan',
        category: 'medication',
        priority: 'medium',
        dueDate: getDueDate(3),
        createdBy: userId
      }
    );
  }

  return baseTasks;
}

router.use(requireAuth);

router.post('/predict', requirePermission('predictions:generate'), asyncHandler(async (req, res) => {
  const patientId = String(req.body.patientId || '').trim();

  if (!patientId) {
    return res.status(400).json({
      error: 'ValidationError',
      message: 'patientId is required.'
    });
  }

  const patient = await getPatientForUser(req.user, patientId);

  if (!patient) {
    return res.status(404).json({
      error: 'NotFound',
      message: 'Patient not found or not accessible.'
    });
  }

  const mergedFeatures = {
    ...(patient.clinicalProfile || {}),
    ...(req.body.features || {})
  };

  const result = predictReadmission(mergedFeatures, {
    forcePrimaryFailure: Boolean(req.body.forceModelFailure)
  });

  const prediction = await createPrediction({
    patientId: patient.id,
    facilityId: patient.facilityId,
    score: result.score,
    tier: result.tier,
    confidence: result.confidence,
    confidenceInterval: result.confidenceInterval,
    modelVersion: result.modelVersion,
    modelType: result.modelType,
    fallbackUsed: result.fallbackUsed,
    factors: result.factors,
    explanation: result.explanation,
    dataQuality: result.dataQuality,
    createdBy: req.user.id
  });

  const tasksToCreate = buildInterventionTasks({
    patient,
    prediction,
    userId: req.user.id
  });

  const generatedTasks = tasksToCreate.length ? await createTasks(tasksToCreate) : [];

  await logAudit(req, {
    action: 'prediction_generated',
    resource: `prediction:${prediction.id}`,
    details: {
      patientId,
      tier: prediction.tier,
      score: prediction.score,
      fallbackUsed: prediction.fallbackUsed
    }
  });

  await appendSyncEvent({
    facilityId: prediction.facilityId,
    eventType: 'mutation',
    operation: 'prediction_generated',
    entityType: 'prediction',
    entityId: prediction.id,
    payload: {
      predictionId: prediction.id,
      patientId: prediction.patientId,
      tier: prediction.tier,
      score: prediction.score
    },
    actorUserId: req.user.id,
    ipAddress: req.ip
  });

  return res.status(201).json({
    prediction,
    tasks: generatedTasks,
    escalationRequired:
      prediction.confidence < 0.5 || prediction.dataQuality.completeness < 0.7
  });
}));

router.get('/results/:patientId', requirePermission('predictions:read'), asyncHandler(async (req, res) => {
  const predictions = await listPredictionsForPatient(req.user, req.params.patientId);

  if (predictions.length === 0) {
    return res.status(404).json({
      error: 'NotFound',
      message: 'No predictions found for patient or patient not accessible.'
    });
  }

  await logAudit(req, {
    action: 'prediction_results_viewed',
    resource: `patient:${req.params.patientId}`,
    details: {
      count: predictions.length
    }
  });

  return res.json({
    patientId: req.params.patientId,
    count: predictions.length,
    predictions
  });
}));

router.post('/:predictionId/override', requirePermission('predictions:override'), asyncHandler(async (req, res) => {
  const newTier = String(req.body.newTier || '').trim();
  const reason = String(req.body.reason || '').trim();
  const allowedTiers = new Set(['Low', 'Medium', 'High']);

  if (!allowedTiers.has(newTier) || reason.length < 10) {
    return res.status(400).json({
      error: 'ValidationError',
      message: 'newTier must be Low, Medium, or High, and reason must be at least 10 characters.'
    });
  }

  const prediction = await updatePredictionOverrideForUser(req.user, req.params.predictionId, {
    newTier,
    reason
  });

  if (!prediction) {
    return res.status(404).json({
      error: 'NotFound',
      message: 'Prediction not found or not accessible.'
    });
  }

  await logAudit(req, {
    action: 'prediction_overridden',
    resource: `prediction:${prediction.id}`,
    details: {
      previousTier: prediction.override.previousTier,
      newTier,
      reason
    }
  });

  await appendSyncEvent({
    facilityId: prediction.facilityId,
    eventType: 'mutation',
    operation: 'prediction_overridden',
    entityType: 'prediction',
    entityId: prediction.id,
    payload: {
      predictionId: prediction.id,
      tier: prediction.tier
    },
    actorUserId: req.user.id,
    ipAddress: req.ip
  });

  return res.json({ prediction });
}));

module.exports = router;
