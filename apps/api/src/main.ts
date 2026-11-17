import { createApp } from './app';
import { loadConfig } from './config';

async function bootstrap() {
  const config = loadConfig();
  const app = await createApp(config);
  await app.listen(config.PORT, '127.0.0.1');
}
bootstrap().catch(() => {
  console.error(
    'Não foi possível iniciar a API. Verifique a configuração e a disponibilidade do PostgreSQL.',
  );
  process.exitCode = 1;
});
