import { resolve } from 'node:path';
import { config as dotenvConfig } from 'dotenv';
import { environmentSchema, loadConfig } from './config';

jest.mock('dotenv', () => ({ config: jest.fn() }));

const valid = {
  WEB_ORIGIN: 'http://localhost:5173',
  DATABASE_URL: 'postgresql://test:password@localhost:5433/pointmedia_test',
  JWT_SECRET: 'a'.repeat(64),
};

describe('configuração', () => {
  it('usa 180 dias para talentos e valida o prazo configurável', () => {
    expect(environmentSchema.parse(valid).TALENT_RETENTION_DAYS).toBe(180);
    expect(
      environmentSchema.parse({ ...valid, TALENT_RETENTION_DAYS: '' }).TALENT_RETENTION_DAYS,
    ).toBe(180);
    expect(
      environmentSchema.parse({ ...valid, TALENT_RETENTION_DAYS: '90' }).TALENT_RETENTION_DAYS,
    ).toBe(90);
    for (const days of [0, -1, 1.5, 3651])
      expect(environmentSchema.safeParse({ ...valid, TALENT_RETENTION_DAYS: days }).success).toBe(
        false,
      );
  });
  it('recusa segredo ausente ou curto', () => {
    expect(environmentSchema.safeParse({ ...valid, JWT_SECRET: '' }).success).toBe(false);
  });
  it('recusa origem com caminho e TTL excessivo', () => {
    expect(
      environmentSchema.safeParse({ ...valid, WEB_ORIGIN: 'http://localhost:5173/perfil' }).success,
    ).toBe(false);
    expect(environmentSchema.safeParse({ ...valid, JWT_TTL_SECONDS: 86400 }).success).toBe(false);
  });
  it('exige HTTPS em produção', () => {
    expect(environmentSchema.safeParse({ ...valid, NODE_ENV: 'production' }).success).toBe(false);
    expect(
      environmentSchema.safeParse({
        ...valid,
        NODE_ENV: 'production',
        WEB_ORIGIN: 'https://talentos.example.test',
        RESUME_STORAGE_DIR: resolve('.local/production-resumes'),
      }).success,
    ).toBe(true);
  });
  it('exige storage persistente em produção e impede usar esse diretório nos testes', () => {
    expect(
      environmentSchema.safeParse({
        ...valid,
        NODE_ENV: 'production',
        WEB_ORIGIN: 'https://talentos.example.test',
      }).success,
    ).toBe(false);
    expect(environmentSchema.safeParse({ ...valid, RESUME_STORAGE_DIR: '../public' }).success).toBe(
      false,
    );
    expect(
      environmentSchema.safeParse({
        ...valid,
        NODE_ENV: 'test',
        RESUME_STORAGE_DIR: resolve('.local/resumes'),
      }).success,
    ).toBe(false);
  });
  it('confia somente em uma lista limitada de endereços IP explícitos', () => {
    expect(environmentSchema.parse(valid).TRUSTED_PROXY_IPS).toEqual([]);
    expect(
      environmentSchema.parse({ ...valid, TRUSTED_PROXY_IPS: '127.0.0.1, ::1' }).TRUSTED_PROXY_IPS,
    ).toEqual(['127.0.0.1', '::1']);
    for (const value of [
      'true',
      '*',
      '1',
      'proxy.example.test',
      '0.0.0.0/0',
      '::/0',
      '0.0.0.0',
      '::',
      '127.0.0.1,,::1',
      Array(17).fill('127.0.0.1').join(','),
    ])
      expect(environmentSchema.safeParse({ ...valid, TRUSTED_PROXY_IPS: value }).success).toBe(
        false,
      );
  });
  it('recusa currículos dentro do frontend público ou do bundle', () => {
    for (const directory of [
      'apps/web/public',
      'apps/web/public/curriculos',
      'apps/web/dist',
      'apps/web/dist/assets',
    ])
      expect(
        environmentSchema.safeParse({
          ...valid,
          RESUME_STORAGE_DIR: resolve(__dirname, '../../..', directory),
        }).success,
      ).toBe(false);
  });
  it('não carrega .env local implicitamente em produção nem expõe valores em erros', () => {
    const original = process.env;
    jest.mocked(dotenvConfig).mockClear();
    try {
      process.env = {
        ...valid,
        NODE_ENV: 'production',
        WEB_ORIGIN: 'https://talentos.example.test',
        RESUME_STORAGE_DIR: resolve('.local/production-resumes'),
      };
      expect(loadConfig().NODE_ENV).toBe('production');
      expect(dotenvConfig).not.toHaveBeenCalled();
      process.env.JWT_SECRET = 'canary-sensitive-value';
      expect(() => loadConfig()).toThrow('JWT_SECRET');
      try {
        loadConfig();
      } catch (error) {
        expect((error as Error).message).not.toContain('canary-sensitive-value');
        expect((error as Error).message).not.toContain(valid.DATABASE_URL);
      }
    } finally {
      process.env = original;
    }
  });
  it.each(['postgresql://', 'postgresql://localhost', 'postgresql://localhost/', 'invalid'])(
    'recusa URL de banco incompleta: %s',
    (DATABASE_URL) => {
      expect(environmentSchema.safeParse({ ...valid, DATABASE_URL }).success).toBe(false);
    },
  );
  it.each(['ftp://localhost:5173', 'invalid'])(
    'recusa origem sem HTTP ou HTTPS: %s',
    (WEB_ORIGIN) => {
      expect(environmentSchema.safeParse({ ...valid, WEB_ORIGIN }).success).toBe(false);
    },
  );
});
