const { listAuditLogsForUser } = require('../data');
const {
  getConfiguredOperationsRecipients,
  getSmsGatewayStatus,
  getSmsProvider,
  getSmsTargetMode,
  sendSmsMessage
} = require('./smsGateway');

const NOTIFICATION_TEST_ACTIONS = new Set([
  'risk_alert_sms_delivery',
  'integration_notifications_test_delivery',
  'integration_notifications_test_triggered'
]);

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

function buildNotificationTestMessage({ liveSend = false, provider, targetMode } = {}) {
  const modeLabel = liveSend ? 'live smoke test' : 'dry-run preview';
  const providerLabel = String(provider || 'sms').toUpperCase();
  const targetLabel = targetMode === 'patient' ? 'patient-targeted routing' : 'operations routing';
  return `TRIP ${providerLabel} notification ${modeLabel}: verifying ${targetLabel} from the integrations workspace.`;
}

function buildLiveSendAllowance(gateway, recipients) {
  if (!gateway.enabled) {
    return {
      allowed: false,
      reason: gateway.message || 'SMS alerts are disabled.'
    };
  }

  if (getSmsProvider() !== 'africastalking') {
    return {
      allowed: false,
      reason: gateway.message || 'A live smoke test requires Africa\'s Talking to be configured.'
    };
  }

  if (getSmsTargetMode() !== 'operations') {
    return {
      allowed: false,
      reason: 'Live smoke tests currently support operations routing only.'
    };
  }

  if (!recipients.length) {
    return {
      allowed: false,
      reason: 'ALERT_SMS_RECIPIENTS is not configured.'
    };
  }

  if (gateway.status !== 'up') {
    return {
      allowed: false,
      reason: gateway.message || 'SMS gateway is not ready for a live smoke test.'
    };
  }

  return {
    allowed: true,
    reason: null
  };
}

function normalizeRecentActivity(log = {}) {
  return {
    id: log.id,
    action: log.action,
    resource: log.resource || null,
    status: log.details?.status || null,
    provider: log.details?.provider || null,
    targetMode: log.details?.targetMode || null,
    target: maskTarget(log.details?.target),
    attemptedAt: log.details?.attemptedAt || log.createdAt || null,
    createdAt: log.createdAt || null,
    error: log.details?.error || null
  };
}

async function buildNotificationVerificationStatus(user) {
  const gateway = getSmsGatewayStatus();
  const recipients = getConfiguredOperationsRecipients();
  const liveSend = buildLiveSendAllowance(gateway, recipients);
  const logs = await listAuditLogsForUser(user, { limit: 50, offset: 0 });
  const recentActivity = logs
    .filter((log) => NOTIFICATION_TEST_ACTIONS.has(String(log.action || '').trim()))
    .slice(0, 8)
    .map(normalizeRecentActivity);

  return {
    gateway,
    provider: getSmsProvider(),
    targetMode: getSmsTargetMode(),
    recipientCount: recipients.length,
    recipients: recipients.map(maskTarget),
    liveSendAllowed: liveSend.allowed,
    liveSendBlockedReason: liveSend.reason,
    previewMessage: buildNotificationTestMessage({
      liveSend: false,
      provider: gateway.provider,
      targetMode: getSmsTargetMode()
    }),
    recentActivity
  };
}

function createNotificationError(message, statusCode = 409) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.publicMessage = message;
  return error;
}

async function runNotificationVerificationTest({
  user,
  liveSend = false,
  sendAll = false,
  message
} = {}) {
  const gateway = getSmsGatewayStatus();
  const recipients = getConfiguredOperationsRecipients();
  const liveSendAllowance = buildLiveSendAllowance(gateway, recipients);
  const normalizedMessage =
    String(message || '').trim() ||
    buildNotificationTestMessage({
      liveSend,
      provider: gateway.provider,
      targetMode: getSmsTargetMode()
    });

  const maskedRecipients = recipients.map(maskTarget);

  if (!liveSend) {
    return {
      dryRun: true,
      provider: gateway.provider,
      gateway,
      targetMode: getSmsTargetMode(),
      recipientCount: recipients.length,
      recipients: maskedRecipients,
      liveSendAllowed: liveSendAllowance.allowed,
      liveSendBlockedReason: liveSendAllowance.reason,
      messagePreview: normalizedMessage
    };
  }

  if (!liveSendAllowance.allowed) {
    throw createNotificationError(
      liveSendAllowance.reason || 'Live SMS smoke testing is not currently available.'
    );
  }

  const targets = sendAll ? recipients : recipients.slice(0, 1);
  const results = [];

  for (const target of targets) {
    const result = await sendSmsMessage({
      to: target,
      message: normalizedMessage
    });

    results.push({
      ...result,
      target: maskTarget(result.target || target)
    });
  }

  return {
    dryRun: false,
    provider: gateway.provider,
    gateway,
    targetMode: getSmsTargetMode(),
    recipientCount: targets.length,
    recipients: targets.map(maskTarget),
    liveSendAllowed: liveSendAllowance.allowed,
    liveSendBlockedReason: liveSendAllowance.reason,
    messagePreview: normalizedMessage,
    results
  };
}

module.exports = {
  buildNotificationVerificationStatus,
  runNotificationVerificationTest
};
