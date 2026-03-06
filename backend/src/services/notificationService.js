const { createAuditLog } = require('../data');

const ALERT_THRESHOLD = Number(process.env.RISK_ALERT_THRESHOLD || 80);
const EMAIL_ALERTS_ENABLED = process.env.ALERT_EMAIL_ENABLED !== 'false';
const SMS_ALERTS_ENABLED = process.env.ALERT_SMS_ENABLED !== 'false';

function nowIso() {
  return new Date().toISOString();
}

function buildAlertChannels(patient) {
  const channels = [];

  if (EMAIL_ALERTS_ENABLED) {
    channels.push({
      type: 'email',
      target:
        process.env.ALERT_EMAIL_RECIPIENT ||
        `${String(patient?.facilityId || 'trip').toLowerCase()}@alerts.trip.go.tz`,
      status: 'queued'
    });
  }

  if (SMS_ALERTS_ENABLED) {
    const smsTarget = patient?.phone || null;
    channels.push({
      type: 'sms',
      target: smsTarget,
      status: smsTarget ? 'queued' : 'skipped_missing_phone'
    });
  }

  channels.push({
    type: 'in_app',
    target: patient?.facilityId || null,
    status: 'broadcast'
  });

  return channels;
}

async function dispatchRiskAlert({ req, patient, prediction }) {
  const score = Number(prediction?.score || 0);
  if (!prediction?.id || !patient?.id || score < ALERT_THRESHOLD) {
    return {
      triggered: false,
      threshold: ALERT_THRESHOLD,
      reason: 'threshold_not_met'
    };
  }

  const channels = buildAlertChannels(patient);
  const alertPayload = {
    id: `alert-${prediction.id}`,
    patientId: patient.id,
    facilityId: patient.facilityId,
    predictionId: prediction.id,
    score,
    tier: prediction.tier,
    threshold: ALERT_THRESHOLD,
    channels,
    generatedAt: nowIso()
  };

  await createAuditLog({
    userId: req.user?.id || null,
    userRole: req.user?.role || null,
    facilityId: patient.facilityId || null,
    regionCode: req.user?.regionCode || null,
    ipAddress: req.ip,
    action: 'risk_alert_dispatched',
    resource: `prediction:${prediction.id}`,
    details: {
      patientId: patient.id,
      score,
      tier: prediction.tier,
      threshold: ALERT_THRESHOLD,
      channels: channels.map((channel) => ({
        type: channel.type,
        status: channel.status
      }))
    }
  });

  const wss = req.app.get('wss');
  if (wss) {
    wss.broadcastToFacility(patient.facilityId, 'RISK_ALERT', alertPayload);
  }

  return {
    triggered: true,
    threshold: ALERT_THRESHOLD,
    channels
  };
}

module.exports = {
  ALERT_THRESHOLD,
  dispatchRiskAlert
};

