const {
  createPrediction,
  createFollowUpSchedules,
  createTasks,
  listVisitsForPatient
} = require('../data');
const { generatePrediction } = require('./mlService');
const { buildPredictionFeatures } = require('./predictionFeatureBuilder');
const { dispatchRiskAlert } = require('./notificationService');
const {
  buildFollowUpSchedules,
  buildInterventionTasks,
  mergeAnalysisSummary
} = require('./readmissionIntelligenceService');
const logger = require('../utils/logger');

const HIGH_RISK_TIERS = new Set(['High', 'VeryHigh']);

function buildDefaultFollowUpPlan(tier) {
  const isHighRisk = HIGH_RISK_TIERS.has(tier);
  return {
    day3Call: true,
    day7Call: true,
    day14Call: isHighRisk,
    day30Call: isHighRisk,
    homeVisit: tier === 'VeryHigh',
    clinicVisit: true,
    clinicVisitDate: null,
    alternateContactNumber: null
  };
}

async function onDischarge({ visit, patient, user, req = null } = {}) {
  if (!visit?.id || !patient?.id) {
    return null;
  }

  try {
    const visits = await listVisitsForPatient(user, patient.id);
    const { modelFeatures, featureSnapshot, analysisSummary } = buildPredictionFeatures({
      patient,
      visit,
      visits,
      requestFeatures: {}
    });

    const result = await generatePrediction(visit.id, modelFeatures);
    const mergedSummary = mergeAnalysisSummary(analysisSummary, result.analysisSummary, result.dataQuality);

    const prediction = await createPrediction({
      patientId: patient.id,
      visitId: visit.id,
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
      analysisSummary: mergedSummary,
      createdBy: user?.id || null
    });

    if (HIGH_RISK_TIERS.has(prediction.tier)) {
      const tasks = buildInterventionTasks({
        patient,
        prediction,
        userId: user?.id,
        anchorDate: visit.dischargeDate ? new Date(visit.dischargeDate) : new Date()
      });
      if (tasks.length) {
        await createTasks(tasks);
      }

      const followUpPlan = buildDefaultFollowUpPlan(prediction.tier);
      const schedules = buildFollowUpSchedules({
        patient,
        visitId: visit.id,
        prediction,
        workflow: { followupPlan: followUpPlan },
        facilityId: patient.facilityId,
        anchorDate: visit.dischargeDate ? new Date(visit.dischargeDate) : new Date()
      });
      if (schedules.length) {
        await createFollowUpSchedules(schedules);
      }

      if (req) {
        // Real-time WebSocket alert to clinicians at the same facility (FR-034/035)
        const wss = req.app?.get('wss');
        if (wss && typeof wss.broadcastToFacility === 'function') {
          wss.broadcastToFacility(patient.facilityId, 'READMISSION_ALERT', {
            patientId: patient.id,
            patientName: patient.name,
            tier: prediction.tier,
            score: prediction.score,
            probability: prediction.probability,
            topFactors: (prediction.factors || []).slice(0, 3).map((f) => f.factor || f.label)
          });
        }

        await dispatchRiskAlert({ req, patient, prediction }).catch(() => {});
      }
    }

    return prediction;
  } catch (error) {
    logger.warn(`Auto-discharge prediction failed for visit ${visit?.id}: ${error.message}`);
    throw error;
  }
}

module.exports = { onDischarge };
