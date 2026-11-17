import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { createApp } from '../src/app';
import { environmentSchema } from '../src/config';
import { PrismaService } from '../src/database/prisma.service';
import { PasswordService } from '../src/auth/password.service';
import { registrationBody } from './registration-fixtures';

describe('contrato de autenticação com PostgreSQL real', () => {
  let app: INestApplication;
  let db: PrismaService;
  const domain = `@${randomUUID()}.example.test`;
  const password = 'senha de integração válida';
  const email = (label: string) => `${label}${domain}`;
  const headers = { 'X-Pointmedia-Request': '1', Origin: 'http://localhost:5173' };
  const cookieOf = (response: request.Response) => {
    const cookies = response.headers['set-cookie'] as unknown as string[];
    const cookie = cookies?.[0]?.split(';')[0];
    if (!cookie) throw new Error('Cookie de sessão ausente.');
    return cookie;
  };
  const login = (label: string, secret = password) =>
    request(app.getHttpServer())
      .post('/api/auth/login')
      .set(headers)
      .send({ email: email(label), password: secret });
  beforeAll(async () => {
    const config = environmentSchema.parse(process.env);
    if (config.NODE_ENV !== 'test' || !new URL(config.DATABASE_URL).pathname.endsWith('_test'))
      throw new Error('Banco de teste isolado é obrigatório.');
    app = await createApp(config, 1000);
    db = app.get(PrismaService);
    const passwordHash = await new PasswordService().hash(password);
    await db.user.createMany({
      data: [
        { name: 'Admin Teste', email: email('admin'), role: 'ADMIN', passwordHash },
        { name: 'RH Teste', email: email('rh'), role: 'RECRUITER', passwordHash },
        { name: 'Candidato Teste', email: email('candidate'), role: 'CANDIDATE', passwordHash },
      ],
    });
  });
  afterAll(async () => {
    if (db) {
      const users = await db.user.findMany({
        where: { email: { endsWith: domain } },
        select: { id: true },
      });
      const ids = users.map((user) => user.id);
      await db.auditLog.deleteMany({
        where: { OR: [{ actorId: { in: ids } }, { entityId: { in: ids } }] },
      });
      await db.user.deleteMany({ where: { id: { in: ids } } });
    }
    if (app) await app.close();
  });
  it('expõe saúde e contrato sem autenticação', async () => {
    await request(app.getHttpServer()).get('/api/health/ready').expect(200, { status: 'up' });
    const response = await request(app.getHttpServer()).get('/api/openapi.json').expect(200);
    expect(response.body.openapi).toBe('3.0.3');
  });
  it('rejeita leitura privada sem sessão', async () => {
    await request(app.getHttpServer()).get('/api/users/me').expect(401);
  });
  it('rejeita JSON malformado e corpo excessivo sem expor detalhes internos', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .set(headers)
      .set('Content-Type', 'application/json')
      .send('{')
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .set(headers)
      .send({ email: 'a'.repeat(17000) })
      .expect(413);
  });
  it('rejeita origem estrangeira e ausência do header de mutação', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .set({ ...headers, Origin: 'https://estrangeiro.example.test' })
      .send({ email: email('admin'), password })
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: email('admin'), password })
      .expect(403);
  });
  it('cadastro é persistido, normaliza e-mail e não retorna segredo', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .set(headers)
      .send(registrationBody(`  ${email('new').toUpperCase()}  `, password, 'Novo Candidato'))
      .expect(201);
    expect(response.body.user.role).toBe('CANDIDATE');
    expect(response.body.user.email).toBe(email('new'));
    expect(response.body.user).not.toHaveProperty('passwordHash');
    expect(response.body.user).not.toHaveProperty('token');
    expect(response.body.result.outcome).toBe('TALENT_POOL');
    expect(await db.user.findUnique({ where: { email: email('new') } })).not.toBeNull();
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .set(headers)
      .send(registrationBody(email('new'), password, 'Duplicado'))
      .expect(409);
  });
  it('rejeita tentativa pública de escolher ADMIN e senha fraca', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .set(headers)
      .send({ data: { ...registrationBody(email('intruder'), password).data, role: 'ADMIN' } })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .set(headers)
      .send(registrationBody(email('weak'), '123', 'Senha Fraca'))
      .expect(400);
  });
  it('login retorna apenas dados da própria conta e cookie HttpOnly/Lax', async () => {
    const response = await login('candidate').expect(200);
    const cookies = response.headers['set-cookie'] as unknown as string[];
    expect(cookies[0]).toContain('HttpOnly');
    expect(cookies[0]).toContain('SameSite=Lax');
    expect(response.body.email).toBe(email('candidate'));
    expect(response.body).not.toHaveProperty('passwordHash');
    expect(response.body).not.toHaveProperty('token');
    const me = await request(app.getHttpServer())
      .get('/api/users/me')
      .set('Cookie', cookieOf(response))
      .expect(200);
    expect(me.body.id).toBe(response.body.id);
  });
  it('não distingue senha incorreta de conta inexistente', async () => {
    const wrong = await login('candidate', 'senha incorreta').expect(401);
    const absent = await login('absent').expect(401);
    expect(wrong.body.message).toEqual(absent.body.message);
    expect(wrong.body).not.toHaveProperty('stack');
  });
  it.each(['candidate', 'rh'])('impede %s de criar recrutador', async (label) => {
    const cookie = cookieOf(await login(label).expect(200));
    await request(app.getHttpServer())
      .post('/api/users/recruiters')
      .set(headers)
      .set('Cookie', cookie)
      .send({ name: 'RH Proibido', email: email(`denied-${label}`), password, jobTitle: 'RH' })
      .expect(403);
  });
  it('permite ADMIN criar recrutador com auditoria persistida', async () => {
    const admin = await login('admin').expect(200);
    const response = await request(app.getHttpServer())
      .post('/api/users/recruiters')
      .set(headers)
      .set('Cookie', cookieOf(admin))
      .send({
        name: 'Novo Recrutador',
        email: email('created-rh'),
        password,
        jobTitle: 'Recrutamento',
      })
      .expect(201);
    expect(response.body.role).toBe('RECRUITER');
    expect(
      await db.auditLog.count({
        where: { action: 'RECRUITER_CREATED', entityId: response.body.id, actorId: admin.body.id },
      }),
    ).toBe(1);
  });
  it('edita somente campos próprios e rejeita role/cargo/id', async () => {
    const response = await login('candidate').expect(200);
    const cookie = cookieOf(response);
    await request(app.getHttpServer())
      .patch('/api/users/me')
      .set(headers)
      .set('Cookie', cookie)
      .send({ name: 'Nome Atualizado', email: email('candidate'), phone: '(11) 99999-0000' })
      .expect(200);
    const persisted = await db.user.findUniqueOrThrow({ where: { id: response.body.id } });
    expect(persisted.name).toBe('Nome Atualizado');
    expect(persisted.role).toBe('CANDIDATE');
    await request(app.getHttpServer())
      .patch('/api/users/me')
      .set(headers)
      .set('Cookie', cookie)
      .send({ name: 'Escalada', email: email('candidate'), role: 'ADMIN' })
      .expect(400);
    await request(app.getHttpServer())
      .get(`/api/users/${response.body.id}`)
      .set('Cookie', cookie)
      .expect(404);
  });
  it('consulta role atual no banco, sem confiar em privilégio antigo do JWT', async () => {
    const response = await login('admin').expect(200);
    await db.user.update({ where: { id: response.body.id }, data: { role: 'RECRUITER' } });
    try {
      await request(app.getHttpServer())
        .post('/api/users/recruiters')
        .set(headers)
        .set('Cookie', cookieOf(response))
        .send({ name: 'Não Autorizado', email: email('downgraded'), password, jobTitle: 'RH' })
        .expect(403);
    } finally {
      await db.user.update({ where: { id: response.body.id }, data: { role: 'ADMIN' } });
    }
  });
  it('logout invalida inclusive cópia anterior do cookie', async () => {
    const cookie = cookieOf(await login('candidate').expect(200));
    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set(headers)
      .set('Cookie', cookie)
      .send({})
      .expect(204);
    await request(app.getHttpServer()).get('/api/users/me').set('Cookie', cookie).expect(401);
  });
  it('sessão expirada e conta inativa perdem acesso', async () => {
    const response = await login('rh').expect(200);
    const cookie = cookieOf(response);
    await db.authSession.updateMany({
      where: { userId: response.body.id },
      data: { expiresAt: new Date(0) },
    });
    await request(app.getHttpServer()).get('/api/users/me').set('Cookie', cookie).expect(401);
    const activeSession = cookieOf(await login('rh').expect(200));
    await db.user.update({ where: { id: response.body.id }, data: { active: false } });
    await request(app.getHttpServer())
      .get('/api/users/me')
      .set('Cookie', activeSession)
      .expect(401);
    await login('rh').expect(401);
    await db.user.update({ where: { id: response.body.id }, data: { active: true } });
  });
  it('troca de senha exige a atual e revoga todas as sessões', async () => {
    const first = cookieOf(await login('candidate').expect(200));
    const second = cookieOf(await login('candidate').expect(200));
    const newPassword = 'nova frase de acesso segura';
    await request(app.getHttpServer())
      .post('/api/auth/change-password')
      .set(headers)
      .set('Cookie', first)
      .send({ currentPassword: 'incorreta', newPassword })
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/auth/change-password')
      .set(headers)
      .set('Cookie', first)
      .send({ currentPassword: password, newPassword })
      .expect(204);
    for (const cookie of [first, second])
      await request(app.getHttpServer()).get('/api/users/me').set('Cookie', cookie).expect(401);
    await login('candidate').expect(401);
    await login('candidate', newPassword).expect(200);
  });
});
