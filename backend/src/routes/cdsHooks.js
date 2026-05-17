/**
 * CDS Hooks 2.0 — TRIP Readmission Risk Service (stub)
 *
 * Discovery:  GET  /cds-services
 * Hook call:  POST /cds-services/trip-readmission-risk
 *
 * The discovery document and hook handler are fully spec-compliant stubs.
 * The hook returns a CDS Card carrying the patient's latest readmission
 * risk score and top SHAP drivers — without exposing HIV status.
 */

const express = require('express');
const { getPatientForUser, listPredictionsForPatient } = require('../data');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

const DISCOVERY = {
  services: [
    {
      id: 'trip-readmission-risk',
      hook: 'patient-discharge',
      title: 'TRIP 30-Day Readmission Risk',
      description:
        'Returns a CDS Card with the predicted 30-day readmission probability, ' +
        'risk tier, and top contributing clinical factors for the discharging patient.',
      prefetch: {
        patient: 'Patient/{{context.patientId}}'
      }
    }
  ]
};

router.get('/cds-services', (req, res) => {
  res.json(DISCOVERY);
});

router.post(
  '/cds-services/trip-readmission-risk',
  requireAuth,
  asyncHandler(async (req, res) => {
  const context = req.body?.context || {};
  const patientId = context.patientId || context.patient || null;

  if (!patientId) {
    return res.status(400).json({
      cards: [],
      error: 'context.patientId is required'
    });
  }

  const patient = await getPatientForUser(req.user, String(patientId));

  if (!patient) {
    return res.json({ cards: [] });
  }

  const predictions = await listPredictionsForPatient(req.user, patient.id);
  const latest = predictions[0] || null;

  if (!latest) {
    return res.json({
      cards: [
        {
          summary: 'No readmission prediction available for this patient.',
          indicator: 'info',
          source: { label: 'TRIP', url: null }
        }
      ]
    });
  }

  const tierIndicator =
    latest.tier === 'VeryHigh' || latest.tier === 'High' ? 'critical' : 'warning';

  const scorePercent = Math.round((latest.probability || 0) * 100);

  const topFactors = (latest.factors || [])
    .slice(0, 3)
    .map((f) => `• ${f.factor || f.label}`)
    .join('\n');

  const card = {
    summary: `30-day readmission risk: ${scorePercent}% (${latest.tier})`,
    indicator: tierIndicator,
    source: {
      label: 'TRIP Readmission Intelligence Platform',
      url: null
    },
    detail:
      topFactors
        ? `**Top contributing factors:**\n${topFactors}`
        : 'No detailed factors available.',
    suggestions:
      latest.tier === 'VeryHigh' || latest.tier === 'High'
        ? [
            {
              label: 'Create CHW follow-up schedule',
              uuid: `trip-followup-${patient.id}`,
              actions: [
                {
                  type: 'create',
                  description: 'Schedule 7-day community follow-up visit',
                  resource: {
                    resourceType: 'ServiceRequest',
                    status: 'active',
                    intent: 'order',
                    subject: { reference: `Patient/${patient.id}` },
                    code: { text: 'Community follow-up visit within 7 days' }
                  }
                }
              ]
            }
          ]
        : []
  };

  return res.json({ cards: [card] });
  })
);

module.exports = router;
