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
  listPatientsForUser,
  listVisitsForPatient,
  getVisitForUser,
  listPredictionsForPatient,
  updatePredictionOverrideForUser
} = require('../data');
const { requireAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/authorize');
const { requireRoleFeature } = require('../middleware/roleAccess');
const { predictionRateLimit } = require('../middleware/rateLimit');
const { logAudit } = require('../services/auditService');
const { generatePrediction } = require('../services/mlService');
const { dispatchRiskAlert } = require('../services/notificationService');
const { extractDischargeSummary } = require('../services/nlpService');
const { buildPredictionFeatures } = require('../services/predictionFeatureBuilder');
const { buildPredictionWorkflowSummary } = require('../services/workflowVerificationService');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

function getDueDate(days) {
  const due = new Date();
  due.setDate(due.getDate() + days);
  return due.toISOString();
}

function buildInterventionTasks({ patient, prediction, userId }) {
  if (prediction.tier !== 'High') {
    return [];
  }

  return [
    {
      patientId: patient.id,
      predictionId: prediction.id,
      facilityId: patient.facilityId,
      title: 'Complete Medication Reconciliation',
      category: 'medication',
      priority: 'high',
      dueDate: getDueDate(1),
      createdBy: userId
    },
    {
      patientId: patient.id,
      predictionId: prediction.id,
      facilityId: patient.facilityId,
      title: 'Schedule 7-Day Follow-Up Call',
      category: 'followup',
      priority: 'high',
      dueDate: getDueDate(7),
      createdBy: userId
    },
    {
      patientId: patient.id,
      predictionId: prediction.id,
      facilityId: patient.facilityId,
      title: 'Patient Education - Warning Signs',
      category: 'education',
      priority: 'medium',
      dueDate: getDueDate(1),
      createdBy: userId
    }
  ];
}

function mergeUniqueStrings(...collections) {
  return Array.from(
    new Set(
      collections
        .flat()
        .filter((entry) => entry !== undefined && entry !== null && String(entry).trim() !== '')
        .map((entry) => String(entry).trim())
    )
  );
}

function mergeAnalysisSummary(featureAnalysis = {}, modelAnalysis = {}, dataQuality = null) {
  const fAnalysis = featureAnalysis || {};
  const mAnalysis = modelAnalysis || {};
  return {
    ...fAnalysis,
    ...mAnalysis,
    labAbnormalities: mergeUniqueStrings(
      fAnalysis.labAbnormalities || [],
      mAnalysis.labAbnormalities || []
    ),
    socialRiskFactors: mergeUniqueStrings(
      fAnalysis.socialRiskFactors || [],
      mAnalysis.socialRiskFlags || [],
      mAnalysis.socialRiskFactors || []
    ),
    diagnoses: mergeUniqueStrings(mAnalysis.diagnoses || []),
    missingData: mergeUniqueStrings(
      fAnalysis.missingData || [],
      mAnalysis.missingCriticalFields || []
    ),
    featureCompleteness:
      dataQuality && Number.isFinite(Number(dataQuality.completeness))
        ? Number(dataQuality.completeness)
        : undefined,
    recommendedReview:
      mAnalysis.recommendedReview !== undefined
        ? Boolean(mAnalysis.recommendedReview)
        : undefined
  };
}

router.use(requireAuth);

router.post(
  '/predict',
  predictionRateLimit,
  requirePermission('predictions:generate'),
  requireRoleFeature('predictionWorkflow', 'This role cannot generate discharge risk predictions.'),
  asyncHandler(async (req, res) => {
  const patientIdInput = String(req.body.patientId || '').trim();
  const visitIdInput = String(req.body.visitId || '').trim();

  if (!patientIdInput && !visitIdInput) {
    return res.status(400).json({
      error: 'ValidationError',
      message: 'patientId or visitId is required.'
    });
  }

  const visit = visitIdInput ? await getVisitForUser(req.user, visitIdInput) : null;
  let patient = patientIdInput ? await getPatientForUser(req.user, patientIdInput) : null;

  if (!patient && visit) {
    patient = await getPatientForUser(req.user, visit.patientId);
  }

  if (!patient) {
    return res.status(404).json({
      error: 'NotFound',
      message: visitIdInput
        ? 'Patient or visit not found, or not accessible.'
        : 'Patient not found or not accessible.'
    });
  }

  if (visit && patientIdInput && visit.patientId !== patient.id) {
    return res.status(400).json({
      error: 'ValidationError',
      message: 'visitId does not belong to the specified patientId.'
    });
  }

  const visits = await listVisitsForPatient(req.user, patient.id);
  const { modelFeatures, featureSnapshot, analysisSummary } = buildPredictionFeatures({
    patient,
    visit,
    visits,
    requestFeatures: req.body.features || {}
  });

  const result = await generatePrediction(visit?.id || patient.id, modelFeatures);
  const mergedAnalysisSummary = mergeAnalysisSummary(
    analysisSummary,
    result.analysisSummary,
    result.dataQuality
  );

  const prediction = await createPrediction({
    patientId: patient.id,
    visitId: visit?.id || null,
    facilityId: patient.facilityId,
    score: result.score,
    probability: result.probability,
    tier: result.tier,
    confidence: result.confidence,
    confidenceInterval: result.confidenceInterval,
    modelVersion: result.modelVersion,
    modelType: result.modelType,
    method: result.method || (result.fallbackUsed ? 'rules' : 'ml'),
    fallbackUsed: result.fallbackUsed,
    factors: result.factors,
    explanation: result.explanation,
    dataQuality: result.dataQuality,
    featureSnapshot,
    analysisSummary: mergedAnalysisSummary,
    createdBy: req.user.id
  });
  const responsePrediction = {
    ...prediction,
    method: prediction.method || result.method || (prediction.fallbackUsed ? 'rules' : 'ml'),
    probability:
      prediction.probability !== undefined && prediction.probability !== null
        ? prediction.probability
        : Number((Number(prediction.score || 0) / 100).toFixed(3)),
    featureSnapshot,
    analysisSummary: mergedAnalysisSummary
  };

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
      patientId: patient.id,
      visitId: visit?.id || null,
      tier: prediction.tier,
      score: prediction.score,
      fallbackUsed: prediction.fallbackUsed,
      method: responsePrediction.method,
      probability: responsePrediction.probability,
      analysisSummary: mergedAnalysisSummary
    }
  });

  const automation = await dispatchRiskAlert({
    req,
    patient,
    prediction: responsePrediction
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

  if (automation?.triggered && automation?.alert?.id) {
    await appendSyncEvent({
      facilityId: prediction.facilityId,
      eventType: 'mutation',
      operation: 'alert_created',
      entityType: 'alert',
      entityId: automation.alert.id,
      payload: {
        alertId: automation.alert.id,
        patientId: prediction.patientId,
        predictionId: prediction.id,
        score: prediction.score,
        status: automation.alert.status || 'open'
      },
      actorUserId: req.user.id,
      ipAddress: req.ip
    });
  }

  const wss = req.app.get('wss');
  if (wss) {
    wss.broadcastToFacility(prediction.facilityId, 'PREDICTION_GENERATED', {
      predictionId: prediction.id,
      patientId: prediction.patientId,
      score: prediction.score,
      tier: prediction.tier,
      method: responsePrediction.method
    });
  }

  return res.status(201).json({
    prediction: responsePrediction,
    tasks: generatedTasks,
    automation,
    escalationRequired:
      prediction.confidence < 0.5 || Number(prediction.dataQuality?.completeness || 1) < 0.7
  });
  })
);

router.get(
  '/results/:patientId',
  requirePermission('predictions:read'),
  requireRoleFeature('predictionReview', 'This role cannot review patient-level prediction results.'),
  asyncHandler(async (req, res) => {
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
    predictions: predictions.map((prediction) => ({
      ...prediction,
      method: prediction.method || (prediction.fallbackUsed ? 'rules' : 'ml'),
      probability:
        prediction.probability !== undefined && prediction.probability !== null
          ? prediction.probability
          : Number((Number(prediction.score || 0) / 100).toFixed(3))
    }))
  });
  })
);

router.get(
  '/history/:patientId',
  requirePermission('predictions:read'),
  requireRoleFeature('predictionReview', 'This role cannot review patient-level prediction history.'),
  asyncHandler(async (req, res) => {
  const predictions = await listPredictionsForPatient(req.user, req.params.patientId);

  return res.json({
    patientId: req.params.patientId,
    count: predictions.length,
    predictions: predictions.map((prediction) => ({
      ...prediction,
      method: prediction.method || (prediction.fallbackUsed ? 'rules' : 'ml'),
      probability:
        prediction.probability !== undefined && prediction.probability !== null
          ? prediction.probability
          : Number((Number(prediction.score || 0) / 100).toFixed(3))
    }))
  });
  })
);

router.get(
  '/recent',
  requirePermission('predictions:read'),
  requireRoleFeature('predictionReview', 'This role cannot review recent patient-level predictions.'),
  asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
  const assignedTo = String(req.query.clinicianId || '').trim();

  let patients = await listPatientsForUser(req.user, {});

  if (assignedTo) {
    const assignedKey = assignedTo === 'self' ? req.user.id : assignedTo;
    patients = patients.filter((patient) => {
      const assignedClinicianId = String(patient.clinicalProfile?.assignedClinicianId || '').trim();
      return !assignedClinicianId || assignedClinicianId === assignedKey;
    });
  }

  const predictionRows = await Promise.all(
    patients.map(async (patient) => {
      const predictions = await listPredictionsForPatient(req.user, patient.id);
      return predictions;
    })
  );

  const predictions = predictionRows
    .flat()
    .sort((left, right) => new Date(right.generatedAt).getTime() - new Date(left.generatedAt).getTime())
    .slice(0, limit)
    .map((prediction) => ({
      ...prediction,
      method: prediction.method || (prediction.fallbackUsed ? 'rules' : 'ml'),
      probability:
        prediction.probability !== undefined && prediction.probability !== null
          ? prediction.probability
          : Number((Number(prediction.score || 0) / 100).toFixed(3))
    }));

  return res.json({
    count: predictions.length,
    predictions
  });
  })
);

router.get(
  '/:predictionId/workflow',
  requirePermission('predictions:read'),
  requireRoleFeature('workflowVerification', 'This role cannot inspect end-to-end patient workflows.'),
  asyncHandler(async (req, res) => {
  const workflow = await buildPredictionWorkflowSummary(req.user, req.params.predictionId);

  if (!workflow) {
    return res.status(404).json({
      error: 'NotFound',
      message: 'Prediction workflow not found or not accessible.'
    });
  }

  await logAudit(req, {
    action: 'prediction_workflow_viewed',
    resource: `prediction:${workflow.prediction.id}`,
    details: {
      patientId: workflow.prediction.patientId,
      taskCount: workflow.verification.taskCount,
      alertStatus: workflow.verification.alertStatus,
      workflowState: workflow.verification.workflowState
    }
  });

  return res.json({ workflow });
  })
);

router.post(
  '/discharge-summary/extract',
  predictionRateLimit,
  requirePermission('predictions:generate'),
  requireRoleFeature('predictionWorkflow', 'This role cannot use discharge summary extraction.'),
  asyncHandler(async (req, res) => {
  const patientId = String(req.body.patientId || '').trim();
  const notes = String(req.body.notes || '').trim();

  if (!patientId) {
    return res.status(400).json({
      error: 'ValidationError',
      message: 'patientId is required.'
    });
  }

  if (!notes) {
    return res.status(400).json({
      error: 'ValidationError',
      message: 'notes are required for extraction.'
    });
  }

  const patient = await getPatientForUser(req.user, patientId);
  if (!patient) {
    return res.status(404).json({
      error: 'NotFound',
      message: 'Patient not found or not accessible.'
    });
  }

  const extraction = extractDischargeSummary({
    notes,
    workflow: req.body.workflow || {},
    patient,
    prediction: req.body.prediction || null
  });

  await logAudit(req, {
    action: 'discharge_summary_extracted',
    resource: `patient:${patientId}`,
    details: {
      entities: {
        diagnoses: extraction.entities.diagnoses.length,
        medications: extraction.entities.medications.length,
        redFlags: extraction.entities.redFlags.length,
        socialRisks: extraction.entities.socialRisks.length
      }
    }
  });

  return res.json({
    patientId,
    extraction
  });
  })
);

router.post(
  '/:predictionId/override',
  requirePermission('predictions:override'),
  requireRoleFeature('predictionOverride', 'This role cannot override predictions.'),
  asyncHandler(async (req, res) => {
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
  })
);

router.post(
  '/batch',
  predictionRateLimit,
  requirePermission('predictions:read'),
  requireRoleFeature('predictionReview', 'This role cannot review patient-level predictions.'),
  asyncHandler(async (req, res) => {
  const patientIds = req.body.patientIds || [];
  if (!Array.isArray(patientIds)) {
    return res.status(400).json({
      error: 'ValidationError',
      message: 'patientIds must be an array.'
    });
  }

  const results = {};
  await Promise.all(
    patientIds.map(async (id) => {
      try {
        const predictions = await listPredictionsForPatient(req.user, id);
        results[id] = predictions[0] || null;
      } catch (err) {
        results[id] = null;
      }
    })
  );

  return res.json({ predictions: results });
  })
);

module.exports = router;
