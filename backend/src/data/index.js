const memoryStore = require('./store');

const REQUESTED_DATA_PROVIDER = String(process.env.TRIP_DATA_PROVIDER || 'memory').toLowerCase();
const STRICT_DATA_PROVIDER =
  process.env.TRIP_STRICT_DATA_PROVIDER === 'true' ||
  (process.env.NODE_ENV === 'production' && REQUESTED_DATA_PROVIDER !== 'memory');

let providerStore = memoryStore;
let activeProviderName = 'memory';
let providerStatus = REQUESTED_DATA_PROVIDER === 'memory' ? 'ready' : 'fallback';
let providerError = null;

function createProviderUnavailableError() {
  const error = new Error(
    providerError
      ? `Configured ${REQUESTED_DATA_PROVIDER} data provider is unavailable: ${providerError}`
      : `Configured ${REQUESTED_DATA_PROVIDER} data provider is unavailable.`
  );
  error.code = 'DATA_PROVIDER_UNAVAILABLE';
  error.statusCode = 503;
  error.publicMessage = 'The configured data service is not available.';
  return error;
}

function createUnavailableStore() {
  return Object.fromEntries(
    Object.entries(memoryStore).map(([key, value]) => {
      if (typeof value === 'function') {
        return [
          key,
          () => {
            throw createProviderUnavailableError();
          }
        ];
      }

      return [key, null];
    })
  );
}

if (REQUESTED_DATA_PROVIDER === 'prisma') {
  try {
    providerStore = require('./prismaStore');
    activeProviderName = 'prisma';
    providerStatus = 'ready';
  } catch (error) {
    const conciseError = String(error.message || '').split('\n')[0];
    providerError = conciseError;

    if (STRICT_DATA_PROVIDER) {
      providerStore = createUnavailableStore();
      activeProviderName = 'unavailable';
      providerStatus = 'error';
    } else {
      console.warn(
        `Failed to load Prisma store (${conciseError}). Falling back to memory store. ` +
          'Set TRIP_STRICT_DATA_PROVIDER=true to fail fast outside demo mode.'
      );
    }
  }
} else if (REQUESTED_DATA_PROVIDER !== 'memory') {
  providerError = `Unknown data provider: ${REQUESTED_DATA_PROVIDER}`;

  if (STRICT_DATA_PROVIDER) {
    providerStore = createUnavailableStore();
    activeProviderName = 'unavailable';
    providerStatus = 'error';
  } else {
    console.warn(`${providerError}. Falling back to memory store.`);
  }
}

module.exports = {
  ...memoryStore,
  ...providerStore,
  DATA_PROVIDER: activeProviderName,
  REQUESTED_DATA_PROVIDER,
  DATA_PROVIDER_STATUS: providerStatus,
  DATA_PROVIDER_ERROR: providerError,
  STRICT_DATA_PROVIDER
};
