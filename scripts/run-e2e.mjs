import { existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { startWebPreview } from './web-preview.mjs';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../', import.meta.url));

// Gerencie os serviços pelas APIs dos próprios servidores. Isso permite encerrá-los
// no Windows sem depender de taskkill e de enumeração da árvore de processos.
export async function runBrowserTests(env, testArgs = []) {
  if (env.NODE_ENV !== 'test' || !new URL(env.DATABASE_URL).pathname.endsWith('_test')) {
    throw new Error('E2E exige banco separado com sufixo _test e NODE_ENV=test.');
  }
  const origin = new URL(env.WEB_ORIGIN);
  if (origin.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(origin.hostname)) {
    throw new Error('O servidor E2E deve usar HTTP local.');
  }
  const { createApp } = require(resolve(root, 'apps/api/dist/app.js'));
  const { environmentSchema } = require(resolve(root, 'apps/api/dist/config.js'));
  const app = await createApp(environmentSchema.parse(env), 1000);
  let web;
  try {
    await app.listen(Number(env.PORT), '127.0.0.1');
    const ready = await fetch(`http://127.0.0.1:${env.PORT}/api/health/ready`);
    if (!ready.ok) throw new Error('API E2E não está pronta.');
    web = await startWebPreview(env.WEB_ORIGIN, Number(env.PORT));
    return await new Promise((resolveResult, reject) => {
      const child = spawn(
        process.execPath,
        [require.resolve('@playwright/test/cli'), 'test', ...testArgs],
        {
          cwd: root,
          windowsHide: true,
          env: { ...env, POINTMEDIA_E2E_MANAGED: '1' },
          stdio: 'inherit',
        },
      );
      child.once('error', reject);
      child.once('exit', (code) => resolveResult(code ?? 1));
    });
  } finally {
    if (web) {
      web.httpServer.closeAllConnections();
      await web.close();
    }
    await app.close();
  }
}

async function main() {
  const envFile = resolve(root, '.env');
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  const database = process.env.TEST_DATABASE_URL;
  if (!database || !new URL(database).pathname.endsWith('_test')) {
    throw new Error('E2E exige TEST_DATABASE_URL apontando para banco separado com sufixo _test.');
  }
  const env = {
    ...process.env,
    NODE_ENV: 'test',
    RESUME_STORAGE_DIR: '',
    TRUSTED_PROXY_IPS: '',
    DATABASE_URL: database,
    JWT_SECRET: randomBytes(48).toString('base64url'),
    PORT: process.env.E2E_API_PORT || '33001',
    WEB_ORIGIN: process.env.E2E_WEB_ORIGIN || 'http://localhost:55174',
  };
  const npmCli = process.env.npm_execpath;
  if (!npmCli) throw new Error('Execute por npm run test:e2e.');
  const migration = spawnSync(process.execPath, [npmCli, 'run', 'db:migrate'], {
    cwd: root,
    env,
    stdio: 'inherit',
  });
  if (migration.error || migration.status !== 0) {
    process.exitCode = migration.status || 1;
    return;
  }
  process.exitCode = await runBrowserTests(env, process.argv.slice(2));
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch(() => {
    console.error(
      'Não foi possível executar os testes E2E. Verifique build, ambiente e banco de teste.',
    );
    process.exitCode = 1;
  });
}
