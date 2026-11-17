import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
export async function startWebPreview(webOrigin, apiPort) {
  const origin = new URL(webOrigin);
  if (origin.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(origin.hostname))
    throw new Error('Preview exclusivo para HTTP local.');
  const requireWeb = createRequire(new URL('../apps/web/package.json', import.meta.url));
  const { preview } = await import(pathToFileURL(requireWeb.resolve('vite')).href);
  return preview({
    root: resolve(root, 'apps/web'),
    configFile: false,
    preview: {
      host: '127.0.0.1',
      port: Number(origin.port || 80),
      strictPort: true,
      proxy: { '/api': { target: `http://127.0.0.1:${apiPort}` } },
    },
  });
}
