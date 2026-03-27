const {
  DATA_PROVIDER,
  DATA_PROVIDER_ERROR,
  DATA_PROVIDER_STATUS,
  REQUESTED_DATA_PROVIDER,
  STRICT_DATA_PROVIDER
} = require('../data');
const { getAuthConfigStatus } = require('../middleware/auth');
const { getEncryptionConfigStatus } = require('../lib/encryption');

const ML_API_URL = (process.env.ML_API_URL || 'http://localhost:5001').replace(/\/$/, '');
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

async function buildMlHealth() {
  if (process.env.ENABLE_ML_PREDICTIONS === 'false') {
    return {
      status: 'disabled',
      enabled: false,
      fallbackEnabled: process.env.ML_FALLBACK_ENABLED !== 'false'
    };
  }

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), ML_HEALTH_TIMEOUT_MS);

  try {
    const response = await fetch(`${ML_API_URL}/health`, {
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
      url: ML_API_URL,
      fallbackEnabled: process.env.ML_FALLBACK_ENABLED !== 'false',
      modelLoaded:
        payload.model_loaded ??
        payload.modelLoaded ??
        payload.model_ready ??
        payload.modelReady ??
        null
    };
  } catch (error) {
    return {
      status: 'down',
      enabled: true,
      url: ML_API_URL,
      fallbackEnabled: process.env.ML_FALLBACK_ENABLED !== 'false',
      message: conciseError(error)
    };
  } finally {
    clearTimeout(timeoutHandle);
  }
}

async function buildHealthSnapshot() {
  const [database, ml] = await Promise.all([buildDatabaseHealth(), buildMlHealth()]);
  const auth = getAuthConfigStatus();
  const encryption = getEncryptionConfigStatus();

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
      database,
      ml
    },
    resilience: {
      offlineFallbackEnabled: true,
      localRulesModelEnabled: process.env.ML_FALLBACK_ENABLED !== 'false'
    }
  };
}

function isPlatformReady(snapshot) {
  const authReady = snapshot.services.auth.status === 'up';
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
