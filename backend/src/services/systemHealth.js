const {
  DATA_PROVIDER,
  DATA_PROVIDER_ERROR,
  DATA_PROVIDER_STATUS,
  REQUESTED_DATA_PROVIDER,
  STRICT_DATA_PROVIDER
} = require('../data');
const { getAuthConfigStatus } = require('../middleware/auth');
const { getEncryptionConfigStatus } = require('../lib/encryption');
const { getDatabaseSchemaCapabilities } = require('../lib/prisma');
const { getDhis2ConfigStatus } = require('../integrations/dhis2Client');
const { getSmsGatewayStatus } = require('./smsGateway');
const { getMlRuntimeConfig } = require('./mlService');

const ML_HEALTH_TIMEOUT_MS = Number(process.env.ML_HEALTH_TIMEOUT_MS || process.env.ML_TIMEOUT_MS) || 2000;

function conciseError(error) {
  return String(error?.message || error || 'Unknown error').split('\n')[0];
}

async function buildDatabaseHealth() {
  if (REQUESTED_DATA_PROVIDER === 'prisma' && DATA_PROVIDER !== 'prisma') {
    return {
      status: 'down',
      configured: Boolean(process.env.DATABASE_URL),
      provider: DATA_PROVIDER,
      message: DATA_PROVIDER_ERROR || 'Configured Prisma data provider is unavailable.'
    };
  }

  if (DATA_PROVIDER !== 'prisma') {
    return {
      status: 'demo',
      configured: Boolean(process.env.DATABASE_URL),
      provider: DATA_PROVIDER,
      message: 'In-memory demo store is active.'
    };
  }

  try {
    const { prisma } = require('../lib/prisma');
    await prisma.$queryRaw`SELECT 1`;

    return {
      status: 'up',
      configured: Boolean(process.env.DATABASE_URL),
      provider: 'prisma'
    };
  } catch (error) {
    return {
      status: 'down',
      configured: Boolean(process.env.DATABASE_URL),
      provider: 'prisma',
      message: conciseError(error)
    };
  }
}

async function buildSchemaHealth(database) {
  if (database.provider !== 'prisma' || database.status !== 'up') {
    return {
      status: 'unknown',
      compatibilityStatus: 'unknown',
      message: 'Schema compatibility checks are only available when Prisma is active and reachable.'
    };
  }

  const capabilities = await getDatabaseSchemaCapabilities();
  const compatibilityStatus = capabilities.status || 'unknown';
  const missing = Array.isArray(capabilities.missing) ? capabilities.missing : [];

  return {
    status:
      compatibilityStatus === 'compatible'
        ? 'up'
        : compatibilityStatus === 'partial'
          ? 'degraded'
          : 'unknown',
    compatibilityStatus,
    checkedAt: capabilities.checkedAt || null,
    message:
      compatibilityStatus === 'compatible'
        ? 'Database schema matches the current TRIP feature contract.'
        : compatibilityStatus === 'partial'
          ? 'Database schema is behind the current TRIP feature contract; compatibility fallbacks are active.'
          : capabilities.message || 'Schema compatibility could not be confirmed.',
    capabilities: {
      patientPiiMetadata: Boolean(capabilities.patientPiiMetadata),
      facilityDhis2Fields: Boolean(capabilities.facilityDhis2Fields),
      visitStructuredFields: Boolean(capabilities.visitStructuredFields),
      predictionMlFields: Boolean(capabilities.predictionMlFields),
      userScopeAssignments: Boolean(capabilities.userScopeAssignments),
      hasAlertTable: Boolean(capabilities.hasAlertTable)
    },
    missing
  };
}

async function buildMlHealth() {
  const runtime = getMlRuntimeConfig();

  if (process.env.ENABLE_ML_PREDICTIONS === 'false') {
    return {
      status: 'disabled',
      enabled: false,
      url: runtime.url,
      requestedMode: runtime.requestedMode,
      runtimeMode: 'disabled',
      fallbackEnabled: runtime.fallbackEnabled,
      externalServiceConfigured: runtime.externalServiceConfigured,
      message: 'ML predictions are disabled in this environment.'
    };
  }

  if (runtime.effectiveMode === 'misconfigured') {
    return {
      status: 'down',
      enabled: true,
      url: runtime.url,
      requestedMode: runtime.requestedMode,
      runtimeMode: runtime.effectiveMode,
      fallbackEnabled: runtime.fallbackEnabled,
      externalServiceConfigured: runtime.externalServiceConfigured,
      message: runtime.message
    };
  }

  if (runtime.effectiveMode === 'fallback_only') {
    return {
      status: 'fallback_only',
      enabled: true,
      url: runtime.url,
      requestedMode: runtime.requestedMode,
      runtimeMode: runtime.effectiveMode,
      externalServiceConfigured: runtime.externalServiceConfigured,
      fallbackEnabled: runtime.fallbackEnabled,
      message: runtime.message
    };
  }

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), ML_HEALTH_TIMEOUT_MS);

  try {
    const response = await fetch(`${runtime.url}/health`, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      },
      signal: controller.signal
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(`ML service health check returned ${response.status}`);
    }

    return {
      status: 'up',
      enabled: true,
      url: runtime.url,
      requestedMode: runtime.requestedMode,
      runtimeMode: runtime.effectiveMode,
      externalServiceConfigured: runtime.externalServiceConfigured,
      fallbackEnabled: runtime.fallbackEnabled,
      message: runtime.message,
      modelLoaded:
        payload.model_loaded ??
        payload.modelLoaded ??
        payload.model_ready ??
        payload.modelReady ??
        null
    };
  } catch (error) {
    return {
      status: runtime.fallbackOnError ? 'degraded' : 'down',
      enabled: true,
      url: runtime.url,
      requestedMode: runtime.requestedMode,
      runtimeMode: runtime.effectiveMode,
      externalServiceConfigured: runtime.externalServiceConfigured,
      fallbackEnabled: runtime.fallbackEnabled,
      message: runtime.fallbackOnError
        ? `External ML health check failed; runtime can still fall back to local rules. ${conciseError(error)}`
        : conciseError(error)
    };
  } finally {
    clearTimeout(timeoutHandle);
  }
}

async function buildHealthSnapshot() {
  const [database, ml] = await Promise.all([buildDatabaseHealth(), buildMlHealth()]);
  const schema = await buildSchemaHealth(database);
  const auth = getAuthConfigStatus();
  const encryption = getEncryptionConfigStatus();
  const sms = getSmsGatewayStatus();
  const dhis2 = getDhis2ConfigStatus();

  return {
    environment: process.env.NODE_ENV || 'development',
    dataProvider: {
      requested: REQUESTED_DATA_PROVIDER,
      active: DATA_PROVIDER,
      status: DATA_PROVIDER_STATUS,
      strictMode: STRICT_DATA_PROVIDER,
      error: DATA_PROVIDER_ERROR
    },
    services: {
      auth,
      encryption,
      patients: 'up',
      predictions: 'up',
      tasks: 'up',
      alerts: 'up',
      chw: 'up',
      analytics: 'up',
      audit: 'up',
      sync: 'up',
      dhis2,
      sms,
      database,
      schema,
      ml
    },
    resilience: {
      offlineFallbackEnabled: true,
      localRulesModelEnabled: process.env.ML_FALLBACK_ENABLED !== 'false'
    }
  };
}

function isPlatformReady(snapshot) {
  const authReady =
    snapshot.services.auth.status === 'up' ||
    (snapshot.dataProvider.requested === 'memory' && snapshot.services.auth.status === 'demo');
  const encryptionReady = ['up', 'not_required'].includes(snapshot.services.encryption.status);
  const databaseReady =
    snapshot.dataProvider.requested !== 'prisma' || snapshot.services.database.status === 'up';
  const providerReady =
    snapshot.dataProvider.strictMode !== true || snapshot.dataProvider.status === 'ready';
  const mlReady =
    snapshot.services.ml.enabled !== true ||
    snapshot.services.ml.status === 'up' ||
    snapshot.services.ml.fallbackEnabled;

  return authReady && encryptionReady && databaseReady && providerReady && mlReady;
}

module.exports = {
  buildHealthSnapshot,
  isPlatformReady
};
