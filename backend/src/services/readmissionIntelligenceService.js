const DAY_IN_MS = 24 * 60 * 60 * 1000;

const FOLLOW_UP_BLUEPRINTS = [
  {
    key: 'day3Call',
    title: '3-Day Follow-Up Call',
    daysOffset: 3,
    followUpType: 'phone_call',
    channel: 'phone'
  },
  {
    key: 'day7Call',
    title: '7-Day Follow-Up Call',
    daysOffset: 7,
    followUpType: 'phone_call',
    channel: 'phone'
  },
  {
    key: 'day14Call',
    title: '14-Day Follow-Up Call',
    daysOffset: 14,
    followUpType: 'phone_call',
    channel: 'phone'
  },
  {
    key: 'day30Call',
    title: '30-Day Follow-Up Call',
    daysOffset: 30,
    followUpType: 'phone_call',
    channel: 'phone'
  },
  {
    key: 'homeVisit',
    title: 'CHW Home Visit',
    daysOffset: 5,
    followUpType: 'home_visit',
    channel: 'community'
  }
];

function normalizeDate(value, fallback = new Date()) {
  const resolved = value instanceof Date ? value : new Date(value || fallback);
  return Number.isNaN(resolved.getTime()) ? new Date(fallback) : resolved;
}

function toIsoDate(value) {
  return normalizeDate(value).toISOString();
}

function getDueDate(days, anchorDate = new Date()) {
  const due = normalizeDate(anchorDate);
  due.setDate(due.getDate() + Number(days || 0));
  return due.toISOString();
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
  return {
    ...featureAnalysis,
    ...modelAnalysis,
    labAbnormalities: mergeUniqueStrings(
      featureAnalysis.labAbnormalities || [],
      modelAnalysis.labAbnormalities || []
    ),
    socialRiskFactors: mergeUniqueStrings(
      featureAnalysis.socialRiskFactors || [],
      modelAnalysis.socialRiskFlags || [],
      modelAnalysis.socialRiskFactors || []
    ),
    diagnoses: mergeUniqueStrings(modelAnalysis.diagnoses || []),
    missingData: mergeUniqueStrings(
      featureAnalysis.missingData || [],
      modelAnalysis.missingCriticalFields || []
    ),
    featureCompleteness:
      dataQuality && Number.isFinite(Number(dataQuality.completeness))
        ? Number(dataQuality.completeness)
        : undefined,
    recommendedReview:
      modelAnalysis.recommendedReview !== undefined
        ? Boolean(modelAnalysis.recommendedReview)
        : undefined
  };
}

function buildInterventionTasks({ patient, prediction, userId, anchorDate } = {}) {
  if (!patient?.id || !prediction?.id || prediction.tier !== 'High') {
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
      dueDate: getDueDate(1, anchorDate),
      createdBy: userId
    },
    {
      patientId: patient.id,
      predictionId: prediction.id,
      facilityId: patient.facilityId,
      title: 'Schedule 7-Day Follow-Up Call',
      category: 'followup',
      priority: 'high',
      dueDate: getDueDate(7, anchorDate),
      createdBy: userId
    },
    {
      patientId: patient.id,
      predictionId: prediction.id,
      facilityId: patient.facilityId,
      title: 'Patient Education - Warning Signs',
      category: 'education',
      priority: 'medium',
      dueDate: getDueDate(1, anchorDate),
      createdBy: userId
    }
  ];
}

function determinePostDischargeStatus(followUpPlan = {}) {
  const needsFollowUp = Boolean(
    followUpPlan.day3Call ||
      followUpPlan.day7Call ||
      followUpPlan.day14Call ||
      followUpPlan.day30Call ||
      followUpPlan.homeVisit ||
      followUpPlan.clinicVisit
  );

  return needsFollowUp ? 'followup' : 'discharged';
}

function buildFollowUpSchedules({
  patient,
  visitId = null,
  prediction = null,
  workflow = {},
  facilityId = null,
  dischargeWorkflowId = null,
  assignedToId = null,
  anchorDate = null
} = {}) {
  if (!patient?.id) {
    return [];
  }

  const followUpPlan = workflow.followupPlan || {};
  const resolvedFacilityId = facilityId || patient.facilityId || null;
  const resolvedAnchor = normalizeDate(anchorDate || workflow.dischargeDate || Date.now());
  const clinicalProfile = patient.clinicalProfile || {};
  const assignedChwId =
    assignedToId ||
    clinicalProfile.assignedChwId ||
    clinicalProfile.primaryChwId ||
    null;

  const schedules = FOLLOW_UP_BLUEPRINTS.filter((item) => Boolean(followUpPlan[item.key])).map(
    (item) => ({
      patientId: patient.id,
      visitId,
      predictionId: prediction?.id || null,
      dischargeWorkflowId,
      facilityId: resolvedFacilityId,
      assignedToId: assignedChwId,
      title: item.title,
      followUpType: item.followUpType,
      channel: item.channel,
      scheduledFor: getDueDate(item.daysOffset, resolvedAnchor),
      status: 'scheduled',
      outcome: 'pending',
      notes: null
    })
  );

  if (followUpPlan.clinicVisit) {
    schedules.push({
      patientId: patient.id,
      visitId,
      predictionId: prediction?.id || null,
      dischargeWorkflowId,
      facilityId: resolvedFacilityId,
      assignedToId: null,
      title: 'Post-Discharge Clinic Visit',
      followUpType: 'clinic_visit',
      channel: 'facility',
      scheduledFor: toIsoDate(
        followUpPlan.clinicVisitDate || getDueDate(prediction?.tier === 'High' ? 7 : 14, resolvedAnchor)
      ),
      status: 'scheduled',
      outcome: 'pending',
      notes: followUpPlan.alternateContactNumber
        ? `Alternate contact: ${followUpPlan.alternateContactNumber}`
        : null
    });
  }

  return schedules;
}

function detectReadmissionEvent({ patientId, facilityId, currentVisit, previousVisits = [] } = {}) {
  if (!patientId || !currentVisit?.id || !currentVisit?.admissionDate) {
    return null;
  }

  const admissionDate = normalizeDate(currentVisit.admissionDate, null);
  if (!admissionDate) {
    return null;
  }

  const previousDischarges = previousVisits
    .filter((visit) => visit?.id && visit.id !== currentVisit.id && visit.dischargeDate)
    .map((visit) => ({
      ...visit,
      dischargeAt: normalizeDate(visit.dischargeDate, null)
    }))
    .filter((visit) => visit.dischargeAt && visit.dischargeAt < admissionDate)
    .sort((left, right) => right.dischargeAt.getTime() - left.dischargeAt.getTime());

  const priorVisit = previousDischarges[0];
  if (!priorVisit) {
    return null;
  }

  const daysSinceLastDischarge = Math.max(
    0,
    Math.ceil((admissionDate.getTime() - priorVisit.dischargeAt.getTime()) / DAY_IN_MS)
  );

  if (daysSinceLastDischarge > 30) {
    return null;
  }

  return {
    patientId,
    facilityId: facilityId || currentVisit.facilityId || priorVisit.facilityId || null,
    currentVisitId: currentVisit.id,
    priorVisitId: priorVisit.id,
    daysSinceLastDischarge,
    within30Days: true,
    source: 'admission_check',
    notes: `Detected ${daysSinceLastDischarge}-day readmission from visit ${priorVisit.id}.`,
    detectedAt: admissionDate.toISOString()
  };
}

module.exports = {
  buildFollowUpSchedules,
  buildInterventionTasks,
  determinePostDischargeStatus,
  detectReadmissionEvent,
  getDueDate,
  mergeAnalysisSummary,
  mergeUniqueStrings
};
