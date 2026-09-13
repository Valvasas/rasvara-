const { spawnSync } = require('child_process');

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/annie_catering?schema=public';

const result = spawnSync('npx', ['prisma', 'generate'], {
  stdio: 'inherit',
  shell: true,
  env: process.env
});

process.exit(result.status ?? 1);
