const memoryStore = require('./store');

const REQUESTED_DATA_PROVIDER = String(process.env.TRIP_DATA_PROVIDER || 'memory').toLowerCase();
const STRICT_DATA_PROVIDER =
  process.env.TRIP_STRICT_DATA_PROVIDER === 'true' ||
  (process.env.NODE_ENV === 'production' && REQUESTED_DATA_PROVIDER !== 'memory');

let providerStore = memoryStore;
let activeProviderName = 'memory';
let providerStatus = REQUESTED_DATA_PROVIDER === 'memory' ? 'ready' : 'fallback';
let providerError = null;

if (REQUESTED_DATA_PROVIDER === 'prisma') {
  try {
    providerStore = require('./prismaStore');
    activeProviderName = 'prisma';
    providerStatus = 'ready';
  } catch (error) {
    const conciseError = String(error.message || '').split('\n')[0];
    providerError = conciseError;

    if (STRICT_DATA_PROVIDER) {
      throw new Error(
        `Failed to load Prisma store (${conciseError}). ` +
          'Fix Prisma generation / database configuration or switch to TRIP_DATA_PROVIDER=memory for demo mode.'
      );
    }

    console.warn(
      `Failed to load Prisma store (${conciseError}). Falling back to memory store. ` +
        'Set TRIP_STRICT_DATA_PROVIDER=true to fail fast outside demo mode.'
    );
  }
} else if (REQUESTED_DATA_PROVIDER !== 'memory') {
  providerError = `Unknown data provider: ${REQUESTED_DATA_PROVIDER}`;

  if (STRICT_DATA_PROVIDER) {
    throw new Error(providerError);
  }

  console.warn(`${providerError}. Falling back to memory store.`);
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
