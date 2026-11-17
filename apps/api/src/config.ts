import { config } from 'dotenv';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { isIP } from 'node:net';
import { z } from 'zod';

export const environmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    WEB_ORIGIN: z.string().refine((value) => {
      try {
        const url = new URL(value);
        return ['http:', 'https:'].includes(url.protocol) && url.origin === value;
      } catch {
        return false;
      }
    }, 'Use uma origem HTTP ou HTTPS, sem caminho'),
    DATABASE_URL: z.string().refine((value) => {
      try {
        const url = new URL(value);
        return (
          url.protocol === 'postgresql:' && Boolean(url.hostname) && /^\/[^/]+$/.test(url.pathname)
        );
      } catch {
        return false;
      }
    }, 'Use uma URL PostgreSQL com host e nome de banco'),
    JWT_SECRET: z
      .string()
      .min(48)
      .refine(
        (value) => !/change.?me|example|placeholder/i.test(value),
        'Gere um segredo aleatório',
      ),
    JWT_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
    TRUSTED_PROXY_IPS: z
      .string()
      .default('')
      .transform((value) => (value.trim() ? value.split(',').map((ip) => ip.trim()) : []))
      .refine(
        (ips) =>
          ips.length <= 16 && ips.every((ip) => isIP(ip) !== 0 && !['0.0.0.0', '::'].includes(ip)),
        'Informe somente endereços IP explícitos dos proxies confiáveis',
      ),
    RESUME_STORAGE_DIR: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().refine(isAbsolute, 'Use um diretório absoluto privado').optional(),
    ),
    TALENT_RETENTION_DAYS: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.coerce.number().int().min(1).max(3650).default(180),
    ),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV === 'production' && !value.WEB_ORIGIN.startsWith('https://')) {
      ctx.addIssue({ code: 'custom', path: ['WEB_ORIGIN'], message: 'Produção exige HTTPS' });
    }
    if (value.NODE_ENV === 'production' && !value.RESUME_STORAGE_DIR)
      ctx.addIssue({
        code: 'custom',
        path: ['RESUME_STORAGE_DIR'],
        message: 'Produção exige diretório persistente privado para currículos',
      });
    if (value.NODE_ENV === 'test' && value.RESUME_STORAGE_DIR)
      ctx.addIssue({
        code: 'custom',
        path: ['RESUME_STORAGE_DIR'],
        message: 'Testes usam somente o storage isolado do projeto',
      });
    if (value.RESUME_STORAGE_DIR) {
      for (const directory of ['apps/web/public', 'apps/web/dist']) {
        const path = relative(resolve(__dirname, '../../..', directory), value.RESUME_STORAGE_DIR);
        if (!path || (!isAbsolute(path) && path !== '..' && !path.startsWith(`..${sep}`)))
          ctx.addIssue({
            code: 'custom',
            path: ['RESUME_STORAGE_DIR'],
            message: 'Currículos devem ficar fora dos diretórios públicos',
          });
      }
    }
  });

export type AppConfig = z.infer<typeof environmentSchema>;
export const APP_CONFIG = Symbol('APP_CONFIG');

export function loadConfig(): AppConfig {
  if (process.env.NODE_ENV !== 'production')
    config({ path: resolve(__dirname, '../../../.env'), quiet: true });
  const parsed = environmentSchema.safeParse(process.env);
  if (!parsed.success) {
    // Somente nomes dos campos: nunca incluir valores de segredos na exceção.
    throw new Error(
      `Configuração inválida: ${parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')}`,
    );
  }
  return Object.freeze(parsed.data);
}
