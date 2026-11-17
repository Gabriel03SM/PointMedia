import { spawnSync } from 'node:child_process';
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { dirname, join, normalize, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { LocalDatabaseError, localDatabaseConfig } from './postgres-config.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const localRoot = join(projectRoot, '.local', 'postgres17');
const dataDir = join(localRoot, 'data');
const logFile = join(localRoot, 'postgres.log');
const marker = join(dataDir, 'PG_VERSION');

function run(binary, args, accepted = [0]) {
  const result = spawnSync(binary, args, {
    windowsHide: true,
    shell: false,
    encoding: 'utf8',
    timeout: 45000,
  });
  if (result.error || !accepted.includes(result.status)) {
    let diagnostic = `${new Date().toISOString()} ${binary.split(/[\\/]/).pop()}: status=${result.status}, code=${result.error?.code || 'none'}\n${result.stdout || ''}${result.stderr || ''}\n`;
    const secrets = [
      process.env.JWT_SECRET,
      process.env.SEED_PASSWORD,
      process.env.POSTGRES_PASSWORD,
    ];
    for (const value of [process.env.DATABASE_URL, process.env.TEST_DATABASE_URL]) {
      if (!value) continue;
      secrets.push(value);
      try {
        secrets.push(decodeURIComponent(new URL(value).password));
      } catch {
        /* URL validation happens before start. */
      }
    }
    for (const secret of secrets) {
      if (secret && secret.length >= 8) diagnostic = diagnostic.replaceAll(secret, '[REDACTED]');
    }
    mkdirSync(localRoot, { recursive: true });
    appendFileSync(logFile, diagnostic, { mode: 0o600 });
    throw new LocalDatabaseError(
      `Falha no utilitário PostgreSQL. Verifique os binários e ${logFile}. Nenhum dado foi apagado.`,
    );
  }
  return result;
}

async function binaries() {
  const extension = process.platform === 'win32' ? '.exe' : '';
  let bin;
  if (process.env.LOCAL_POSTGRES_BIN) {
    bin = resolve(projectRoot, process.env.LOCAL_POSTGRES_BIN);
  } else {
    if (process.platform !== 'win32' || process.arch !== 'x64') {
      throw new LocalDatabaseError(
        'Defina LOCAL_POSTGRES_BIN com a pasta bin de um PostgreSQL 17 local.',
      );
    }
    try {
      bin = dirname((await import('@embedded-postgres/windows-x64')).pg_ctl);
    } catch {
      throw new LocalDatabaseError(
        'Binários portáteis ausentes. Execute npm install com dependências opcionais e scripts habilitados, ou defina LOCAL_POSTGRES_BIN.',
      );
    }
  }
  const result = {
    initdb: join(bin, `initdb${extension}`),
    pgCtl: join(bin, `pg_ctl${extension}`),
  };
  if (!Object.values(result).every((file) => existsSync(file))) {
    throw new LocalDatabaseError(
      'LOCAL_POSTGRES_BIN deve conter initdb e pg_ctl do PostgreSQL 17.',
    );
  }
  if (!/\b17\./.test(run(result.pgCtl, ['--version']).stdout)) {
    throw new LocalDatabaseError(
      'O banco portátil deste projeto utiliza PostgreSQL 17. Escolha os binários dessa versão.',
    );
  }
  return result;
}

function checkClusterVersion() {
  if (existsSync(marker) && readFileSync(marker, 'utf8').trim() !== '17') {
    throw new LocalDatabaseError(
      'Diretório de dados pertence a outra versão. Não será reinicializado.',
    );
  }
}

function isRunning(bin) {
  return run(bin.pgCtl, ['status', '-D', dataDir], [0, 3, 4]).status === 0;
}

async function ensureFreePort(port) {
  const server = createServer();
  await new Promise((resolvePromise, reject) => {
    server.once('error', (error) =>
      reject(
        new LocalDatabaseError(
          error.code === 'EADDRINUSE'
            ? `A porta local ${port} está ocupada. Nenhum processo será encerrado. Ajuste as duas URLs no .env ou utilize seu PostgreSQL existente.`
            : `Não foi possível verificar a porta local ${port} (${error.code}). Verifique as permissões de rede. Nenhum processo será encerrado.`,
        ),
      ),
    );
    server.listen(port, '127.0.0.1', () => server.close(resolvePromise));
  });
}

export async function ensureDatabases(config, allowUnavailable = false) {
  // pg pertence ao workspace API; resolver por ele evita depender do hoisting do npm.
  const requireApi = createRequire(new URL('../apps/api/package.json', import.meta.url));
  let Client;
  try {
    ({ Client } = requireApi('pg'));
  } catch {
    throw new LocalDatabaseError('Instale as dependências da API antes de iniciar o banco local.');
  }
  const client = new Client({
    ...config.development,
    database: 'postgres',
    connectionTimeoutMillis: 5000,
  });
  client.on('error', () => {});
  try {
    await client.connect();
    const location = await client.query("SELECT current_setting('data_directory') AS directory");
    const actual = normalize(resolve(location.rows[0].directory));
    const expected = normalize(dataDir);
    const equal =
      process.platform === 'win32'
        ? actual.toLowerCase() === expected.toLowerCase()
        : actual === expected;
    if (!equal)
      throw new LocalDatabaseError(
        'A conexão pertence a outro diretório de dados. Nenhum banco será criado nessa instância.',
      );
    for (const { database } of [config.development, config.test]) {
      const existing = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [
        database,
      ]);
      if (existing.rowCount === 0) {
        // Os identificadores são validados por allowlist no parser; não aceitar SQL arbitrário.
        await client.query(`CREATE DATABASE "${database}"`);
      }
    }
    return true;
  } catch (error) {
    if (allowUnavailable && error?.code === 'ECONNREFUSED') return false;
    if (error instanceof LocalDatabaseError) throw error;
    throw new LocalDatabaseError(
      'Não foi possível preparar os bancos locais. Verifique credenciais no .env e o log PostgreSQL. Alterar a senha do .env não altera uma senha já persistida no cluster.',
    );
  } finally {
    await client.end().catch(() => {});
  }
}

async function main() {
  const envFile = join(projectRoot, '.env');
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  const action = process.argv[2] || 'start';
  if (!['start', 'stop', 'status'].includes(action))
    throw new LocalDatabaseError('Use start, stop ou status.');
  if (process.env.NODE_ENV === 'production')
    throw new LocalDatabaseError('Comando exclusivo para desenvolvimento e testes.');
  const config = action === 'start' ? localDatabaseConfig(process.env) : null;
  // Outra sessão Windows pode ter iniciado o mesmo cluster. Verifique a identidade
  // pelo próprio PostgreSQL antes de consultar/controlar o processo do sistema.
  if (action === 'start' && (await ensureDatabases(config, true))) {
    console.log(
      `PostgreSQL local já disponível em 127.0.0.1:${config.development.port}. Bancos de desenvolvimento e teste preparados; nenhum processo foi reiniciado.`,
    );
    return;
  }
  const bin = await binaries();
  checkClusterVersion();
  if (action === 'status') {
    console.log(
      existsSync(marker) && isRunning(bin)
        ? 'PostgreSQL local em execução.'
        : 'PostgreSQL local parado ou ainda não inicializado.',
    );
    return;
  }
  if (action === 'stop') {
    if (existsSync(marker) && isRunning(bin))
      run(bin.pgCtl, ['stop', '-D', dataDir, '-m', 'fast', '-w', '-t', '30']);
    console.log('PostgreSQL local parado. Os dados foram preservados.');
    return;
  }
  const alreadyRunning = existsSync(marker) && isRunning(bin);
  if (!alreadyRunning) {
    await ensureFreePort(config.development.port);
    mkdirSync(localRoot, { recursive: true });
    if (!existsSync(marker)) {
      const passwordFile = join(localRoot, `init-password-${randomUUID()}.tmp`);
      writeFileSync(passwordFile, `${config.development.password}\n`, { flag: 'wx', mode: 0o600 });
      try {
        run(bin.initdb, [
          '-D',
          dataDir,
          '--username',
          config.development.user,
          '--auth=scram-sha-256',
          '--encoding=UTF8',
          '--locale=C',
          '--pwfile',
          passwordFile,
        ]);
      } finally {
        unlinkSync(passwordFile);
      }
    }
    run(bin.pgCtl, [
      'start',
      '-D',
      dataDir,
      '-l',
      logFile,
      '-w',
      '-t',
      '30',
      '-o',
      `-h 127.0.0.1 -p ${config.development.port} -c timezone=UTC`,
    ]);
  }
  await ensureDatabases(config);
  console.log(
    `PostgreSQL local pronto em 127.0.0.1:${config.development.port}. Bancos de desenvolvimento e teste disponíveis; dados preservados em .local/postgres17/data.`,
  );
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(
      error instanceof LocalDatabaseError
        ? error.message
        : `Falha ao preparar o PostgreSQL local (${error?.code || error?.name || 'erro desconhecido'}). Nenhum reset automático será executado.`,
    );
    process.exitCode = 1;
  });
}
