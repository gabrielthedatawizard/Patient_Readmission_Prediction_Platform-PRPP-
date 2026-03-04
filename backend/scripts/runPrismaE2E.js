const { spawnSync } = require('node:child_process');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');

try {
  require('dotenv').config({ path: path.join(projectRoot, '.env') });
} catch (error) {
  // dotenv is optional where environment variables are injected externally.
}

if (!process.env.DATABASE_URL) {
  console.error(
    'DATABASE_URL is required for Prisma e2e tests. ' +
      'Set it in backend/.env or your shell environment.'
  );
  process.exit(1);
}

const jestBin = require.resolve('jest/bin/jest');
const env = {
  ...process.env,
  RUN_PRISMA_E2E: 'true',
  TRIP_DATA_PROVIDER: 'prisma',
  NODE_ENV: 'test',
  JWT_SECRET: process.env.JWT_SECRET || 'trip-prisma-e2e-secret'
};

const result = spawnSync(
  process.execPath,
  [jestBin, '--runInBand', 'src/e2e/prisma.routes.e2e.test.js'],
  {
    cwd: projectRoot,
    env,
    stdio: 'inherit'
  }
);

if (typeof result.status === 'number') {
  process.exit(result.status);
}

process.exit(1);
