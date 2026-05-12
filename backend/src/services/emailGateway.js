const logger = require('../utils/logger');

const SUPPORTED_PROVIDERS = new Set(['disabled', 'smtp']);

/** Lazy-load so API boot works when backend/node_modules is absent (e.g. Vercel deletes it; deps resolve from repo root). */
let nodemailerModule;
let nodemailerResolveAttempted = false;

function resolveNodemailer() {
  if (nodemailerResolveAttempted) {
    return nodemailerModule;
  }
  nodemailerResolveAttempted = true;
  try {
    // eslint-disable-next-line global-require, import/no-extraneous-dependencies
    nodemailerModule = require('nodemailer');
  } catch (error) {
    nodemailerModule = null;
    logger.warn(
      { err: String(error?.message || error) },
      'nodemailer could not be loaded; SMTP email sends are unavailable until the dependency is installed.'
    );
  }
  return nodemailerModule;
}

function getEmailAlertsEnabled() {
  return process.env.ALERT_EMAIL_ENABLED === 'true';
}

function getEmailProvider() {
  const configured = String(process.env.ALERT_EMAIL_PROVIDER || 'disabled')
    .trim()
    .toLowerCase();

  return SUPPORTED_PROVIDERS.has(configured) ? configured : 'disabled';
}

function getSmtpConfig() {
  const portRaw = process.env.SMTP_PORT;
  const port = portRaw ? Number(portRaw) : 587;
  const secureEnv = String(process.env.SMTP_SECURE || '').trim().toLowerCase();
  const secure =
    secureEnv === 'true' || (!portRaw && port === 465) || port === 465;

  return {
    host: String(process.env.SMTP_HOST || '').trim(),
    port: Number.isFinite(port) && port > 0 ? port : 587,
    secure,
    user: String(process.env.SMTP_USER || '').trim(),
    pass: String(process.env.SMTP_PASS || '').trim(),
    from: String(
      process.env.ALERT_EMAIL_FROM || process.env.SMTP_FROM || ''
    ).trim()
  };
}

function getConfiguredEmailRecipients() {
  const raw = String(
    process.env.ALERT_EMAIL_RECIPIENTS || process.env.ALERT_EMAIL_RECIPIENT || ''
  ).trim();

  if (!raw) {
    return [];
  }

  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((entry, index, items) => items.indexOf(entry) === index);
}

function getEmailTimeoutMs() {
  return Number(process.env.ALERT_EMAIL_TIMEOUT_MS || 12000) || 12000;
}

function getEmailGatewayStatus() {
  const enabled = getEmailAlertsEnabled();
  const provider = getEmailProvider();

  if (!enabled) {
    return {
      status: 'disabled',
      enabled: false,
      provider,
      configured: false,
      message: 'Email alerts are disabled. Set ALERT_EMAIL_ENABLED=true to opt in.'
    };
  }

  if (!SUPPORTED_PROVIDERS.has(provider)) {
    return {
      status: 'down',
      enabled: true,
      provider,
      configured: false,
      message: `Unsupported ALERT_EMAIL_PROVIDER: ${provider}`
    };
  }

  if (provider === 'disabled') {
    return {
      status: 'disabled',
      enabled: true,
      provider,
      configured: false,
      message: 'ALERT_EMAIL_PROVIDER is disabled.'
    };
  }

  const smtp = getSmtpConfig();
  const recipients = getConfiguredEmailRecipients();

  if (!smtp.host) {
    return {
      status: 'down',
      enabled: true,
      provider,
      configured: false,
      message: 'SMTP_HOST is required for outbound email alerts.'
    };
  }

  if (!smtp.from) {
    return {
      status: 'degraded',
      enabled: true,
      provider,
      configured: false,
      message: 'ALERT_EMAIL_FROM (or SMTP_FROM) is required.'
    };
  }

  if (!recipients.length) {
    return {
      status: 'degraded',
      enabled: true,
      provider,
      configured: true,
      hostConfigured: true,
      recipientCount: 0,
      message: 'ALERT_EMAIL_RECIPIENT or ALERT_EMAIL_RECIPIENTS is not configured.'
    };
  }

  if (!resolveNodemailer()) {
    return {
      status: 'degraded',
      enabled: true,
      provider,
      configured: true,
      hostConfigured: true,
      recipientCount: recipients.length,
      message:
        'nodemailer is not available on this runtime (install it at the app root or in backend for SMTP).'
    };
  }

  return {
    status: 'up',
    enabled: true,
    provider,
    configured: true,
    hostConfigured: true,
    recipientCount: recipients.length,
    authConfigured: Boolean(smtp.user && smtp.pass)
  };
}

function conciseError(error) {
  return String(error?.message || error || 'Unknown email gateway error').split('\n')[0];
}

function buildTransport(smtp) {
  const nm = resolveNodemailer();
  if (!nm) {
    return null;
  }

  const auth =
    smtp.user && smtp.pass ? { user: smtp.user, pass: smtp.pass } : undefined;

  return nm.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    ...(auth ? { auth } : {})
  });
}

async function sendEmailMessage(
  { to, subject, text, html } = {},
  options = {}
) {
  const provider = getEmailProvider();
  const attemptedAt = new Date().toISOString();
  const smtp = getSmtpConfig();

  if (!getEmailAlertsEnabled()) {
    return {
      status: 'disabled',
      provider,
      target: to || null,
      attemptedAt
    };
  }

  const target = String(to || '').trim();
  if (!target) {
    return {
      status: 'skipped_missing_target',
      provider,
      target: null,
      attemptedAt
    };
  }

  if (provider !== 'smtp') {
    return {
      status: 'provider_not_configured',
      provider,
      target,
      attemptedAt
    };
  }

  if (!smtp.host || !smtp.from) {
    return {
      status: 'provider_not_configured',
      provider,
      target,
      attemptedAt,
      error: 'SMTP_HOST and ALERT_EMAIL_FROM are required.'
    };
  }

  const bodyText = String(text || '').trim();
  const bodyHtml = html ? String(html).trim() : '';
  if (!bodyText && !bodyHtml) {
    return {
      status: 'skipped_empty_message',
      provider,
      target,
      attemptedAt
    };
  }

  const transport = options.transport || buildTransport(smtp);

  if (!transport) {
    return {
      status: 'provider_not_configured',
      provider,
      target,
      attemptedAt,
      error: 'nodemailer is not installed or could not be loaded on this deployment.'
    };
  }

  try {
    const info = await transport.sendMail({
      from: smtp.from,
      to: target,
      subject: String(subject || 'TRIP notification').trim() || 'TRIP notification',
      text: bodyText || undefined,
      html: bodyHtml || undefined
    });

    return {
      status: 'submitted',
      provider,
      target,
      attemptedAt,
      messageId: info?.messageId || null,
      response: info?.response || null
    };
  } catch (error) {
    const messageText = conciseError(error);
    logger.error({ err: messageText, provider, target }, 'Email delivery attempt failed.');

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
  getConfiguredEmailRecipients,
  getEmailAlertsEnabled,
  getEmailGatewayStatus,
  getEmailProvider,
  getSmtpConfig,
  sendEmailMessage
};
