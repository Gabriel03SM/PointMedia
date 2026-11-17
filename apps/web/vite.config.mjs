import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';

// JavaScript ESM permite carregamento nativo também no Node 22.16, sem transpilar a configuração.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, resolve(import.meta.dirname, '../..'), '');
  const webOrigin = new URL(env.WEB_ORIGIN || 'http://localhost:5173');
  const port = Number(webOrigin.port || (webOrigin.protocol === 'https:' ? 443 : 80));
  const proxy = { '/api': { target: `http://127.0.0.1:${env.PORT || '3000'}` } };
  return {
    plugins: [react(), tailwindcss()],
    server: {
      port,
      strictPort: true,
      proxy,
      // Alterações feitas pelo agente não geraram eventos de arquivo neste Windows.
      watch: { usePolling: true, interval: 500 },
    },
    preview: { port, strictPort: true, proxy },
    // Nenhuma variável de backend é exposta ao bundle; acesso somente pelo proxy.
  };
});
