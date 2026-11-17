import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';

config({ path: resolve(__dirname, '../../../.env'), quiet: true });
const url = process.env.TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_test'))
  throw new Error('TEST_DATABASE_URL deve apontar para banco separado com sufixo _test.');
const env = {
  ...process.env,
  DATABASE_URL: url,
  NODE_ENV: 'test',
  RESUME_STORAGE_DIR: '',
  TRUSTED_PROXY_IPS: '',
  JWT_SECRET: randomBytes(48).toString('base64url'),
  WEB_ORIGIN: 'http://localhost:5173',
};
const prismaBin = resolve(dirname(require.resolve('prisma/package.json')), 'build/index.js');
for (const args of [
  [prismaBin, 'migrate', 'deploy'],
  [require.resolve('jest/bin/jest'), '--config', 'jest.integration.config.cjs', '--runInBand'],
]) {
  const result = spawnSync(process.execPath, args, {
    cwd: resolve(__dirname, '..'),
    env,
    stdio: 'inherit',
  });
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}
