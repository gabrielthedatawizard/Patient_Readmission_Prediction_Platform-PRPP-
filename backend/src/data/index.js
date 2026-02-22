const memoryStore = require('./store');

const providerName = (process.env.TRIP_DATA_PROVIDER || 'memory').toLowerCase();
let providerStore = memoryStore;

if (providerName === 'prisma') {
  try {
    providerStore = require('./prismaStore');
  } catch (error) {
    const conciseError = String(error.message || '').split('\n')[0];
    console.warn(
      `Failed to load Prisma store (${conciseError}). Falling back to memory store. ` +
        'Run `npm run prisma:generate` in backend when dependencies are available.'
    );
    providerStore = memoryStore;
  }
}

module.exports = {
  ...memoryStore,
  ...providerStore,
  DATA_PROVIDER: providerName
};
