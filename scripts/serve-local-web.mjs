import { getLocalAppConfig } from './local-app-config.mjs';
import { startWebPreview } from './web-preview.mjs';

try {
  const config = getLocalAppConfig();
  const server = await startWebPreview(config.webOrigin, config.apiPort);
  console.log(`Frontend local: ${config.webOrigin}`);
  const close = async () => {
    server.httpServer.closeAllConnections();
    await server.close();
  };
  process.once('SIGINT', () => void close());
  process.once('SIGTERM', () => void close());
} catch {
  console.error('Falha no frontend local. Verifique build e portas.');
  process.exitCode = 1;
}
