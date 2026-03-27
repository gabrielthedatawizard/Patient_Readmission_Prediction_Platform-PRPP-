const { rmSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const backendNodeModules = path.join(repoRoot, 'backend', 'node_modules');

rmSync(backendNodeModules, { recursive: true, force: true });

const prismaCli = path.join(repoRoot, 'node_modules', 'prisma', 'build', 'index.js');
const schemaPath = path.join(repoRoot, 'backend', 'prisma', 'schema.prisma');

const result = spawnSync(process.execPath, [prismaCli, 'generate', `--schema=${schemaPath}`], {
  cwd: repoRoot,
  stdio: 'inherit',
  env: process.env
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 0);
