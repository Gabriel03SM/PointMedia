import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
export function getLocalAppConfig() {
  const env = resolve(root, '.env');
  if (existsSync(env)) process.loadEnvFile(env);
  if (process.env.NODE_ENV === 'production')
    throw new Error('Inicializador exclusivo para uso local.');
  const origin = new URL(process.env.WEB_ORIGIN || 'http://localhost:5173');
  const apiPort = Number(process.env.PORT || 3000);
  const webPort = Number(origin.port || 80);
  if (
    origin.protocol !== 'http:' ||
    !['localhost', '127.0.0.1'].includes(origin.hostname) ||
    origin.pathname !== '/' ||
    !Number.isInteger(apiPort) ||
    apiPort < 1 ||
    apiPort > 65535 ||
    apiPort === webPort
  ) {
    throw new Error('Use portas distintas e válidas e WEB_ORIGIN HTTP local.');
  }
  return {
    root,
    apiPort,
    webPort,
    webOrigin: origin.origin,
    apiEntry: resolve(root, 'apps/api/dist/main.js'),
    webDirectory: resolve(root, 'apps/web'),
    webEntry: resolve(root, 'scripts/serve-local-web.mjs'),
  };
}
async function checkHealth(origin) {
  const url = new URL(origin);
  if (url.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(url.hostname)) return false;
  const address = `http://127.0.0.1:${url.port || 80}`;
  try {
    const [web, api] = await Promise.all([
      fetch(address, { signal: AbortSignal.timeout(1500) }),
      fetch(`${address}/api/health/ready`, { signal: AbortSignal.timeout(1500) }),
    ]);
    return (
      web.ok &&
      Boolean(web.headers.get('Content-Type')?.includes('text/html')) &&
      api.ok &&
      (await api.json()).status === 'up'
    );
  } catch {
    return false;
  }
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  if (process.argv[2] === '--check') {
    process.exitCode = (await checkHealth(process.argv[3])) ? 0 : 1;
  } else console.log(JSON.stringify(getLocalAppConfig()));
}
