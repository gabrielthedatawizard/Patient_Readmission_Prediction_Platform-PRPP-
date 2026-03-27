const { createAuditLog, createRiskAlert, updateAlertChannels } = require('../data');
const logger = require('../utils/logger');
const {
  getSmsGatewayStatus,
  getSmsTargetMode,
  resolveSmsTargets,
  sendSmsMessage
} = require('./smsGateway');

const ALERT_THRESHOLD = Number(process.env.RISK_ALERT_THRESHOLD || 80);
const EMAIL_ALERTS_ENABLED = process.env.ALERT_EMAIL_ENABLED !== 'false';

function nowIso() {
  return new Date().toISOString();
}

function buildAlertMessage(patient, prediction, threshold) {
  const tier = String(prediction?.tier || 'High');
  return `TRIP alert: patient ${patient.id} is ${tier.toLowerCase()} risk with score ${prediction.score}/100 (threshold ${threshold}). Review discharge and follow-up plan.`;
}

function maskTarget(target) {
  const value = String(target || '').trim();
  if (!value) {
    return null;
  }

  if (value.includes('@')) {
    const [name, domain] = value.split('@');
    return `${name.slice(0, 2)}***@${domain || ''}`;
  }

  const normalized = value.replace(/\s+/g, '');
  if (normalized.length <= 6) {
    return normalized;
  }

  return `${normalized.slice(0, 4)}***${normalized.slice(-3)}`;
}

function buildEmailChannel(patient) {
  if (!EMAIL_ALERTS_ENABLED) {
    return [];
  }

  return [
    {
      type: 'email',
      target:
        process.env.ALERT_EMAIL_RECIPIENT ||
        `${String(patient?.facilityId || 'trip').toLowerCase()}@alerts.trip.go.tz`,
      status: 'not_implemented'
    }
  ];
}

function buildSmsChannels(patient) {
  const gateway = getSmsGatewayStatus();
  if (!gateway.enabled) {
    return [];
  }

  const targetMode = getSmsTargetMode();
  const targets = resolveSmsTargets(patient);

  if (!targets.length) {
    return [
      {
        type: 'sms',
        target: null,
        provider: gateway.provider,
        targetMode,
        status:
          targetMode === 'patient'
            ? 'skipped_missing_phone'
            : 'skipped_missing_operations_contact'
      }
    ];
  }

  const initialStatus =
    gateway.status === 'up'
      ? 'queued'
      : gateway.status === 'disabled'
        ? 'provider_disabled'
        : 'provider_not_configured';

  return targets.map((target) => ({
    type: 'sms',
    target,
    provider: gateway.provider,
    targetMode,
    status: initialStatus
  }));
}

function buildAlertChannels(patient) {
  const channels = [];
  channels.push(...buildEmailChannel(patient));
  channels.push(...buildSmsChannels(patient));

  channels.push({
    type: 'in_app',
    target: patient?.facilityId || null,
    status: 'broadcast'
  });

  return channels;
}

async function auditSmsChannel({ req, alertId, patient, prediction, channel }) {
  return createAuditLog({
    userId: req.user?.id || null,
    userRole: req.user?.role || null,
    facilityId: patient.facilityId || null,
    regionCode: req.user?.regionCode || null,
    ipAddress: req.ip,
    action: 'risk_alert_sms_delivery',
    resource: `alert:${alertId}`,
    details: {
      alertId,
      patientId: patient.id,
      predictionId: prediction.id,
      provider: channel.provider || null,
      targetMode: channel.targetMode || null,
      target: maskTarget(channel.target),
      status: channel.status,
      providerStatus: channel.providerStatus || null,
      providerStatusCode: channel.providerStatusCode ?? null,
      messageId: channel.messageId || null,
      cost: channel.cost || null,
      attemptedAt: channel.attemptedAt || nowIso(),
      error: channel.error || null
    }
  });
}

async function finalizeSmsChannels({ req, alert, patient, prediction, message, channels }) {
  const updatedChannels = [];

  for (const channel of channels) {
    if (channel.type !== 'sms') {
      updatedChannels.push(channel);
      continue;
    }

    if (channel.status !== 'queued') {
      const skippedChannel = {
        ...channel,
        attemptedAt: channel.attemptedAt || nowIso()
      };
      updatedChannels.push(skippedChannel);
      await auditSmsChannel({
        req,
        alertId: alert.id,
        patient,
        prediction,
        channel: skippedChannel
      });
      continue;
    }

    const result = await sendSmsMessage({
      to: channel.target,
      message
    });

    const deliveredChannel = {
      ...channel,
      ...result
    };

    updatedChannels.push(deliveredChannel);
    await auditSmsChannel({
      req,
      alertId: alert.id,
      patient,
      prediction,
      channel: deliveredChannel
    });
  }

  return updatedChannels;
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
  const severity = score >= 90 ? 'critical' : 'high';
  const message = buildAlertMessage(patient, prediction, ALERT_THRESHOLD);

  let persistedAlert = await createRiskAlert({
    patientId: patient.id,
    facilityId: patient.facilityId,
    predictionId: prediction.id,
    score,
    tier: prediction.tier || 'High',
    threshold: ALERT_THRESHOLD,
    severity,
    message,
    channels
  });

  let finalChannels = channels;
  try {
    finalChannels = await finalizeSmsChannels({
      req,
      alert: persistedAlert,
      patient,
      prediction,
      message,
      channels
    });

    const updatedAlert = await updateAlertChannels(persistedAlert.id, finalChannels);
    if (updatedAlert) {
      persistedAlert = updatedAlert;
    } else {
      persistedAlert = {
        ...persistedAlert,
        channels: finalChannels
      };
    }
  } catch (error) {
    logger.warn(
      {
        err: String(error?.message || error),
        alertId: persistedAlert.id,
        patientId: patient.id
      },
      'SMS alert finalization failed; keeping persisted alert with current channel state.'
    );
  }

  const alertPayload = {
    ...persistedAlert,
    channels: persistedAlert.channels || finalChannels,
    generatedAt: persistedAlert.createdAt || nowIso()
  };

  await createAuditLog({
    userId: req.user?.id || null,
    userRole: req.user?.role || null,
    facilityId: patient.facilityId || null,
    regionCode: req.user?.regionCode || null,
    ipAddress: req.ip,
    action: 'risk_alert_dispatched',
    resource: `alert:${persistedAlert.id}`,
    details: {
      alertId: persistedAlert.id,
      patientId: patient.id,
      predictionId: prediction.id,
      score,
      tier: prediction.tier,
      threshold: ALERT_THRESHOLD,
      severity,
      channels: alertPayload.channels.map((channel) => ({
        type: channel.type,
        status: channel.status,
        provider: channel.provider || null,
        targetMode: channel.targetMode || null
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
    channels: alertPayload.channels,
    alert: persistedAlert
  };
}

module.exports = {
  ALERT_THRESHOLD,
  dispatchRiskAlert
};
