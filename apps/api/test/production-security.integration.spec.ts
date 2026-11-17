import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, rmdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createApp } from '../src/app';
import { environmentSchema } from '../src/config';
import { PrismaService } from '../src/database/prisma.service';
import { PasswordService } from '../src/auth/password.service';

describe('proxy e proteção HTTP para produção', () => {
  const apps: INestApplication[] = [];
  let directory: string | undefined;
  let production: INestApplication;
  let userId: string;
  const email = `production-${randomUUID()}@example.test`;
  const password = 'Senha fictícia para verificar cookie';
  beforeAll(async () => {
    if (!new URL(process.env.DATABASE_URL!).pathname.endsWith('_test'))
      throw new Error('Banco de teste obrigatório.');
    await mkdir(resolve(__dirname, '../../../.tmp'), { recursive: true });
    directory = await mkdtemp(join(resolve(__dirname, '../../../.tmp'), 'phase8-production-'));
    production = await createApp(
      environmentSchema.parse({
        ...process.env,
        NODE_ENV: 'production',
        WEB_ORIGIN: 'https://talentos.example.test',
        RESUME_STORAGE_DIR: directory,
        TRUSTED_PROXY_IPS: '127.0.0.1,::1',
      }),
      1000,
    );
    apps.push(production);
    const user = await production.get(PrismaService).user.create({
      data: {
        name: 'Pessoa Fictícia de Segurança',
        email,
        role: 'CANDIDATE',
        passwordHash: await new PasswordService().hash(password),
      },
    });
    userId = user.id;
  });
  afterAll(async () => {
    if (production && userId) {
      const db = production.get(PrismaService);
      await db.auditLog.deleteMany({ where: { actorId: userId } });
      await db.user.delete({ where: { id: userId } });
    }
    for (const app of apps.reverse()) await app.close();
    if (directory) await rmdir(directory);
  });
  it('cookie de produção é Secure/HttpOnly/Lax e respostas privadas não permitem cache', async () => {
    const response = await request(production.getHttpServer())
      .post('/api/auth/login')
      .set({
        'X-Pointmedia-Request': '1',
        Origin: 'https://talentos.example.test',
        'X-Forwarded-Proto': 'https',
      })
      .send({ email, password })
      .expect(200);
    const cookies = response.headers['set-cookie'] as unknown as string[];
    expect(cookies[0]).toContain('Secure');
    expect(cookies[0]).toContain('HttpOnly');
    expect(cookies[0]).toContain('SameSite=Lax');
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.body).not.toHaveProperty('passwordHash');
    expect(response.body).not.toHaveProperty('token');
  });
  it('X-Forwarded-For não altera o limite quando o proxy não foi autorizado', async () => {
    const app = await createApp(
      environmentSchema.parse({ ...process.env, TRUSTED_PROXY_IPS: '' }),
      2,
    );
    apps.push(app);
    for (const ip of ['198.51.100.1', '198.51.100.2'])
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Pointmedia-Request', '1')
        .set('X-Forwarded-For', ip)
        .send({})
        .expect(400);
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('X-Pointmedia-Request', '1')
      .set('X-Forwarded-For', '198.51.100.3')
      .send({})
      .expect(429);
  });
  it('proxy local autorizado separa clientes e não confia no endereço forjado à esquerda da cadeia', async () => {
    const app = await createApp(
      environmentSchema.parse({ ...process.env, TRUSTED_PROXY_IPS: '127.0.0.1,::1' }),
      2,
    );
    apps.push(app);
    const attempt = (ip: string) =>
      request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Pointmedia-Request', '1')
        .set('X-Forwarded-For', ip)
        .send({});
    await attempt('198.51.100.10').expect(400);
    await attempt('198.51.100.10').expect(400);
    await attempt('198.51.100.11').expect(400);
    const blocked = await attempt('198.51.100.11, 198.51.100.10').expect(429);
    expect(blocked.headers['retry-after']).toBeDefined();
  });
});
