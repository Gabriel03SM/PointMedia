import assert from 'node:assert/strict';
import test from 'node:test';
import { localDatabaseConfig } from '../scripts/postgres-config.mjs';

const secret = 'senha-local-aleatoria-123';
const valid = {
  NODE_ENV: 'development',
  DATABASE_URL: `postgresql://pointmedia:${secret}@127.0.0.1:5432/pointmedia?schema=public`,
  TEST_DATABASE_URL: `postgresql://pointmedia:${secret}@127.0.0.1:5432/pointmedia_test?schema=public`,
};

test('aceita dois bancos distintos na mesma instância local', () => {
  const config = localDatabaseConfig(valid);
  assert.equal(config.development.database, 'pointmedia');
  assert.equal(config.test.database, 'pointmedia_test');
  assert.equal(config.development.port, 5432);
});
test('recusa execução em produção', () =>
  assert.throws(() => localDatabaseConfig({ ...valid, NODE_ENV: 'production' }), /exclusivo/));
test('recusa banco remoto e parâmetros que redirecionam o host', () => {
  assert.throws(
    () =>
      localDatabaseConfig({
        ...valid,
        DATABASE_URL: valid.DATABASE_URL.replace('127.0.0.1', 'db.example.test'),
      }),
    /127.0.0.1/,
  );
  assert.throws(
    () =>
      localDatabaseConfig({ ...valid, DATABASE_URL: `${valid.DATABASE_URL}&host=db.example.test` }),
    /schema=public/,
  );
});
test('recusa usar o mesmo banco para desenvolvimento e testes', () =>
  assert.throws(
    () => localDatabaseConfig({ ...valid, TEST_DATABASE_URL: valid.DATABASE_URL }),
    /separado/,
  ));
test('exige sufixo _test no banco de testes', () =>
  assert.throws(
    () =>
      localDatabaseConfig({
        ...valid,
        TEST_DATABASE_URL: valid.TEST_DATABASE_URL.replace('pointmedia_test', 'outro_banco'),
      }),
    /_test/,
  ));
test('recusa portas e credenciais divergentes', () => {
  assert.throws(
    () =>
      localDatabaseConfig({
        ...valid,
        TEST_DATABASE_URL: valid.TEST_DATABASE_URL.replace(':5432', ':5433'),
      }),
    /mesma porta/,
  );
  assert.throws(
    () =>
      localDatabaseConfig({
        ...valid,
        TEST_DATABASE_URL: valid.TEST_DATABASE_URL.replace(secret, 'outra-senha-local-123'),
      }),
    /credenciais/,
  );
});
test('recusa nomes de banco e usuário que possam injetar SQL', () => {
  assert.throws(
    () =>
      localDatabaseConfig({
        ...valid,
        DATABASE_URL: valid.DATABASE_URL.replace('/pointmedia?', '/pointmedia%22%3Bdrop?'),
      }),
    /usuário e banco/,
  );
  assert.throws(
    () =>
      localDatabaseConfig({
        ...valid,
        DATABASE_URL: valid.DATABASE_URL.replace('pointmedia:', 'point%22media:'),
      }),
    /usuário e banco/,
  );
});
test('recusa placeholder e senha com quebra de linha sem reproduzir segredo no erro', () => {
  for (const replacement of ['local_only_change_me', 'segredo-nao-exibir%0A123']) {
    assert.throws(
      () =>
        localDatabaseConfig({
          ...valid,
          DATABASE_URL: valid.DATABASE_URL.replace(secret, replacement),
        }),
      (error) => {
        assert.ok(!error.message.includes(replacement));
        assert.match(error.message, /senha local própria/);
        return true;
      },
    );
  }
});
test('configuração inválida não expõe a URL no erro', () => {
  assert.throws(
    () => localDatabaseConfig({ ...valid, DATABASE_URL: 'valor-invalido-com-segredo' }),
    (error) => {
      assert.ok(!error.message.includes('valor-invalido-com-segredo'));
      return true;
    },
  );
});
