import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

const envFile = new URL('../.env', import.meta.url);
if (existsSync(envFile)) {
  console.log('.env existente preservado. Nenhuma credencial foi alterada.');
} else {
  const password = randomBytes(24).toString('hex');
  const substitutions = {
    DATABASE_URL: `postgresql://pointmedia:${password}@127.0.0.1:5432/pointmedia?schema=public`,
    TEST_DATABASE_URL: `postgresql://pointmedia:${password}@127.0.0.1:5432/pointmedia_test?schema=public`,
    POSTGRES_PASSWORD: password,
    JWT_SECRET: randomBytes(48).toString('base64url'),
    SEED_PASSWORD: randomBytes(18).toString('base64url'),
  };
  const template = readFileSync(new URL('../.env.example', import.meta.url), 'utf8');
  const content = template.replace(/^(\w+)=(.*)$/gm, (line, name) => {
    return Object.hasOwn(substitutions, name) ? `${name}=${substitutions[name]}` : line;
  });
  // wx evita sobrescrever arquivo criado concorrentemente; nenhuma senha é exibida.
  writeFileSync(envFile, content, { flag: 'wx', mode: 0o600 });
  console.log(
    '.env local criado com credenciais aleatórias. Consulte SEED_PASSWORD no arquivo para acessar as contas fictícias.',
  );
}
