const axios = require('axios');
const logger = require('../utils/logger');

const SUPPORTED_TARGET_MODES = new Set(['operations', 'patient']);
const SUPPORTED_PROVIDERS = new Set(['disabled', 'africastalking']);

function getSmsAlertsEnabled() {
  return process.env.ALERT_SMS_ENABLED === 'true';
}

function getSmsProvider() {
  const configured = String(process.env.ALERT_SMS_PROVIDER || 'disabled')
    .trim()
    .toLowerCase();

  return SUPPORTED_PROVIDERS.has(configured) ? configured : configured || 'disabled';
}

function getSmsTargetMode() {
  const configured = String(process.env.ALERT_SMS_TARGET_MODE || 'operations')
    .trim()
    .toLowerCase();

  return SUPPORTED_TARGET_MODES.has(configured) ? configured : 'operations';
}

function getAfricasTalkingEnvironment() {
  return String(process.env.AFRICAS_TALKING_ENV || 'live').trim().toLowerCase() === 'sandbox'
    ? 'sandbox'
    : 'live';
}

function getAfricasTalkingBaseUrl() {
  const configured = String(process.env.AFRICAS_TALKING_BASE_URL || '').trim();
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  return getAfricasTalkingEnvironment() === 'sandbox'
    ? 'https://api.sandbox.africastalking.com'
    : 'https://api.africastalking.com';
}

function getAfricasTalkingCredentials() {
  return {
    username: String(process.env.AFRICAS_TALKING_USERNAME || '').trim(),
    apiKey: String(process.env.AFRICAS_TALKING_API_KEY || '').trim(),
    senderId: String(process.env.AFRICAS_TALKING_SENDER_ID || '').trim()
  };
}

function getSmsTimeoutMs() {
  return Number(process.env.ALERT_SMS_TIMEOUT_MS || 8000) || 8000;
}

function getConfiguredOperationsRecipients() {
  const raw = String(
    process.env.ALERT_SMS_RECIPIENTS || process.env.ALERT_SMS_RECIPIENT || ''
  ).trim();

  if (!raw) {
    return [];
  }

  return raw
    .split(',')
    .map((entry) => normalizePhoneNumber(entry))
    .filter(Boolean)
    .filter((entry, index, items) => items.indexOf(entry) === index);
}

function normalizePhoneNumber(rawValue) {
  const trimmed = String(rawValue || '').trim();
  if (!trimmed) {
    return null;
  }

  const compact = trimmed.replace(/[\s()-]/g, '');
  if (compact.startsWith('+') && /^\+\d{9,15}$/.test(compact)) {
    return compact;
  }

  const digits = compact.replace(/\D/g, '');
  if (!digits) {
    return null;
  }

  if (digits.startsWith('255') && digits.length === 12) {
    return `+${digits}`;
  }

  if (digits.startsWith('0') && digits.length === 10) {
    return `+255${digits.slice(1)}`;
  }

  if (digits.length >= 9 && digits.length <= 15) {
    return `+${digits}`;
  }

  return null;
}

function resolveSmsTargets(patient = {}) {
  const targetMode = getSmsTargetMode();

  if (targetMode === 'patient') {
    const patientPhone = normalizePhoneNumber(patient.phone);
    return patientPhone ? [patientPhone] : [];
  }

  return getConfiguredOperationsRecipients();
}

function getSmsGatewayStatus() {
  const enabled = getSmsAlertsEnabled();
  const provider = getSmsProvider();
  const targetMode = getSmsTargetMode();

  if (!enabled) {
    return {
      status: 'disabled',
      enabled: false,
      provider,
      targetMode,
      configured: false,
      message: 'SMS alerts are disabled.'
    };
  }

  if (!SUPPORTED_PROVIDERS.has(provider)) {
    return {
      status: 'down',
      enabled: true,
      provider,
      targetMode,
      configured: false,
      message: `Unsupported SMS provider: ${provider}`
    };
  }

  if (provider === 'disabled') {
    return {
      status: 'disabled',
      enabled: true,
      provider,
      targetMode,
      configured: false,
      message: 'ALERT_SMS_PROVIDER is disabled.'
    };
  }

  if (provider === 'africastalking') {
    const credentials = getAfricasTalkingCredentials();
    const hasCredentials = Boolean(credentials.username && credentials.apiKey);

    if (!hasCredentials) {
      return {
        status: 'down',
        enabled: true,
        provider,
        targetMode,
        configured: false,
        environment: getAfricasTalkingEnvironment(),
        message: 'AFRICAS_TALKING_USERNAME and AFRICAS_TALKING_API_KEY are required.'
      };
    }

    if (targetMode === 'operations') {
      const recipients = getConfiguredOperationsRecipients();
      if (!recipients.length) {
        return {
          status: 'degraded',
          enabled: true,
          provider,
          targetMode,
          configured: true,
          environment: getAfricasTalkingEnvironment(),
          senderIdConfigured: Boolean(credentials.senderId),
          recipientCount: 0,
          message: 'ALERT_SMS_RECIPIENTS is not configured.'
        };
      }

      return {
        status: 'up',
        enabled: true,
        provider,
        targetMode,
        configured: true,
        environment: getAfricasTalkingEnvironment(),
        senderIdConfigured: Boolean(credentials.senderId),
        recipientCount: recipients.length
      };
    }

    return {
      status: 'up',
      enabled: true,
      provider,
      targetMode,
      configured: true,
      environment: getAfricasTalkingEnvironment(),
      senderIdConfigured: Boolean(credentials.senderId),
      message: 'Recipient availability depends on patient phone numbers.'
    };
  }

  return {
    status: 'down',
    enabled: true,
    provider,
    targetMode,
    configured: false,
    message: 'Unsupported SMS provider configuration.'
  };
}

function mapAfricasTalkingDeliveryStatus(providerStatus, statusCode) {
  const normalized = String(providerStatus || '').trim().toLowerCase();

  if (['success', 'sent', 'submitted'].includes(normalized)) {
    return 'submitted';
  }

  if (normalized === 'buffered') {
    return 'buffered';
  }

  if (['failed', 'rejected'].includes(normalized)) {
    return 'failed';
  }

  if (Number(statusCode) >= 400) {
    return 'failed';
  }

  return 'submitted';
}

function conciseError(error) {
  if (error?.response?.data) {
    return JSON.stringify(error.response.data);
  }

  return String(error?.message || error || 'Unknown SMS gateway error').split('\n')[0];
}

async function sendSmsMessage({ to, message, enqueue = true } = {}, options = {}) {
  const provider = getSmsProvider();
  const target = normalizePhoneNumber(to);
  const attemptedAt = new Date().toISOString();

  if (!getSmsAlertsEnabled()) {
    return {
      status: 'disabled',
      provider,
      target: target || null,
      attemptedAt
    };
  }

  if (!target) {
    return {
      status: 'skipped_missing_target',
      provider,
      target: null,
      attemptedAt
    };
  }

  if (!String(message || '').trim()) {
    return {
      status: 'skipped_empty_message',
      provider,
      target,
      attemptedAt
    };
  }

  if (provider !== 'africastalking') {
    return {
      status: provider === 'disabled' ? 'provider_disabled' : 'provider_not_configured',
      provider,
      target,
      attemptedAt
    };
  }

  const credentials = getAfricasTalkingCredentials();
  if (!credentials.username || !credentials.apiKey) {
    return {
      status: 'provider_not_configured',
      provider,
      target,
      attemptedAt,
      error: 'AFRICAS_TALKING_USERNAME and AFRICAS_TALKING_API_KEY are required.'
    };
  }

  const requestBody = new URLSearchParams();
  requestBody.set('username', credentials.username);
  requestBody.set('to', target);
  requestBody.set('message', String(message).trim());

  if (credentials.senderId) {
    requestBody.set('from', credentials.senderId);
  }

  if (enqueue) {
    requestBody.set('enqueue', '1');
  }

  const httpClient = options.httpClient || axios;

  try {
    const response = await httpClient.post(
      `${getAfricasTalkingBaseUrl()}/version1/messaging`,
      requestBody.toString(),
      {
        timeout: getSmsTimeoutMs(),
        headers: {
          Accept: 'application/json',
          apiKey: credentials.apiKey,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const responseBody = response.data || {};
    const recipient = responseBody?.SMSMessageData?.Recipients?.[0] || null;
    const providerStatus = recipient?.status || responseBody?.SMSMessageData?.Message || 'Unknown';

    return {
      status: mapAfricasTalkingDeliveryStatus(providerStatus, recipient?.statusCode),
      provider,
      providerStatus,
      providerStatusCode: recipient?.statusCode ?? null,
      target: recipient?.number || target,
      messageId: recipient?.messageId || null,
      cost: recipient?.cost || null,
      responseMessage: responseBody?.SMSMessageData?.Message || null,
      attemptedAt
    };
  } catch (error) {
    const messageText = conciseError(error);
    logger.error(
      {
        err: messageText,
        provider,
        target
      },
      'SMS delivery attempt failed.'
    );

    return {
      status: 'failed',
      provider,
      target,
      attemptedAt,
      error: messageText
    };
  }
}

module.exports = {
  getConfiguredOperationsRecipients,
  getSmsGatewayStatus,
  getSmsProvider,
  getSmsTargetMode,
  normalizePhoneNumber,
  resolveSmsTargets,
  sendSmsMessage
};
