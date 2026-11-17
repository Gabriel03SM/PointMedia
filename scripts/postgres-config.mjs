export class LocalDatabaseError extends Error {}

function connection(value, label) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new LocalDatabaseError(
      `Defina ${label} no .env. Execute npm run env:setup na primeira execução.`,
    );
  }
  if (url.protocol !== 'postgresql:' || !['127.0.0.1', 'localhost'].includes(url.hostname)) {
    throw new LocalDatabaseError(
      `${label} precisa apontar para PostgreSQL em 127.0.0.1 ou localhost.`,
    );
  }
  if ([...url.searchParams].some(([key, value]) => key !== 'schema' || value !== 'public')) {
    throw new LocalDatabaseError(
      `${label}: o inicializador local aceita apenas schema=public nos parâmetros.`,
    );
  }
  let user, password, database;
  try {
    user = decodeURIComponent(url.username);
    password = decodeURIComponent(url.password);
    database = decodeURIComponent(url.pathname.slice(1));
  } catch {
    throw new LocalDatabaseError(`${label} contém codificação inválida.`);
  }
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(user) || !/^[a-z][a-z0-9_]{0,62}$/.test(database)) {
    throw new LocalDatabaseError(
      `${label}: usuário e banco devem usar letras minúsculas, números e sublinhado.`,
    );
  }
  if (
    password.length < 12 ||
    /[\r\n\0]/.test(password) ||
    /local_only_change_me|password|placeholder/i.test(password)
  ) {
    throw new LocalDatabaseError(
      `${label}: defina uma senha local própria com pelo menos 12 caracteres, sem quebras de linha.`,
    );
  }
  const port = Number(url.port || 5432);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new LocalDatabaseError(`${label}: porta inválida.`);
  }
  return { host: '127.0.0.1', port, user, password, database };
}

export function localDatabaseConfig(env) {
  if (env.NODE_ENV === 'production')
    throw new LocalDatabaseError(
      'O inicializador portátil é exclusivo de desenvolvimento e testes.',
    );
  const development = connection(env.DATABASE_URL, 'DATABASE_URL');
  const test = connection(env.TEST_DATABASE_URL, 'TEST_DATABASE_URL');
  if (development.database === test.database || !test.database.endsWith('_test')) {
    throw new LocalDatabaseError(
      'O banco de teste deve ser separado e seu nome deve terminar em _test.',
    );
  }
  for (const key of ['port', 'user', 'password']) {
    if (development[key] !== test[key]) {
      throw new LocalDatabaseError(
        'No modo portátil, as duas URLs devem usar a mesma porta e as mesmas credenciais, com nomes de banco diferentes.',
      );
    }
  }
  return { development, test };
}
