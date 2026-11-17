import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { PROCESS_CONSENT_VERSION } from '@pointmedia/shared';
import { createApp } from '../src/app';
import { environmentSchema } from '../src/config';
import { PrismaService } from '../src/database/prisma.service';
import { ResumeStorage } from '../src/candidates/resume-storage';
import { ResumesService } from '../src/candidates/resumes.service';
import { registrationBody } from './registration-fixtures';
import { samplePdf } from './resume-fixtures';

describe('conta somente no envio final da inscrição', () => {
  let app: INestApplication;
  let db: PrismaService;
  const domain = `@${randomUUID()}.example.test`;
  const password = 'Senha fictícia de inscrição';
  const jobs: string[] = [];
  const headers = { 'X-Pointmedia-Request': '1', Origin: 'http://localhost:5173' };
  const body = (name: string) => registrationBody(name + domain, password);
  const api = () => request(app.getHttpServer());
  const absent = async (name: string) =>
    expect(await db.user.findUnique({ where: { email: name + domain } })).toBeNull();
  beforeAll(async () => {
    const config = environmentSchema.parse(process.env);
    if (config.NODE_ENV !== 'test' || !new URL(config.DATABASE_URL).pathname.endsWith('_test'))
      throw new Error('Banco isolado obrigatório.');
    app = await createApp(config, 1000);
    db = app.get(PrismaService);
  });
  afterAll(async () => {
    if (db) {
      const users = await db.user.findMany({
        where: { email: { endsWith: domain } },
        select: { id: true },
      });
      const ids = users.map((user) => user.id);
      for (const file of await db.resumeFile.findMany({ where: { userId: { in: ids } } }))
        await app.get(ResumesService).removeStored(file.storageKey);
      await db.auditLog.deleteMany({ where: { actorId: { in: ids } } });
      await db.user.deleteMany({ where: { id: { in: ids } } });
      await db.jobOpening.deleteMany({ where: { id: { in: jobs } } });
    }
    if (app) await app.close();
  });
  const applicationBody = async (label: string, expired = false) => {
    const job = await db.jobOpening.create({
      data: {
        title: `Vaga de inscrição ${domain}`,
        description: 'Vaga fictícia para a integração de inscrição.',
        workMode: 'REMOTE',
        seniorityNotApplicable: true,
        locationNotApplicable: true,
        salaryNotApplicable: true,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        closesAt: new Date(Date.now() + (expired ? -1000 : 86400000)),
      },
    });
    jobs.push(job.id);
    return {
      ...body(label).data,
      talentConsentVersion: undefined,
      application: {
        jobId: job.id,
        processConsent: true,
        processConsentVersion: PROCESS_CONSENT_VERSION,
        talentPoolConsent: false,
      },
    };
  };
  it('recusa cadastro avulso e falta de finalidade sem gravar conta', async () => {
    const complete = body('avulso');
    await api()
      .post('/api/auth/register')
      .set(headers)
      .send({ name: complete.data.name, email: complete.data.email, password })
      .expect(400);
    const data = { ...complete.data, talentConsentVersion: undefined };
    await api().post('/api/auth/register').set(headers).send({ data }).expect(400);
    await absent('avulso');
  });
  it('valida senha, dados profissionais e consentimento antes de criar conta', async () => {
    for (const kind of ['password', 'profile', 'consent'] as const) {
      const input = body(kind);
      if (kind === 'password') input.data.password = '123';
      if (kind === 'profile') input.data.profile.about = 'Curto';
      if (kind === 'consent') input.data.talentConsentVersion = 'antigo';
      await api().post('/api/auth/register').set(headers).send(input).expect(400);
      await absent(kind);
    }
  });
  it('arquivo inválido e JSON multipart malformado não deixam conta', async () => {
    await api()
      .post('/api/auth/register')
      .set(headers)
      .field('data', JSON.stringify(body('invalid-file')))
      .attach('file', Buffer.from('arquivo falso'), {
        filename: 'cv.pdf',
        contentType: 'application/pdf',
      })
      .expect(400);
    // O campo data contém a inscrição, sem um segundo envelope.
    await api()
      .post('/api/auth/register')
      .set(headers)
      .field('data', JSON.stringify(body('invalid-file').data))
      .attach('file', Buffer.from('arquivo falso'), {
        filename: 'cv.pdf',
        contentType: 'application/pdf',
      })
      .expect(400);
    await api().post('/api/auth/register').set(headers).field('data', '{').expect(400);
    await absent('invalid-file');
  });
  it('falha na vaga desfaz conta/perfil/auditoria e remove arquivo preparado', async () => {
    const input = body('rollback');
    const data = { ...input.data, talentConsentVersion: undefined };
    const storage = app.get(ResumeStorage);
    const put = jest.spyOn(storage, 'put');
    try {
      await api()
        .post('/api/auth/register')
        .set(headers)
        .field(
          'data',
          JSON.stringify({
            ...data,
            application: {
              jobId: randomUUID(),
              processConsent: true,
              processConsentVersion: PROCESS_CONSENT_VERSION,
              talentPoolConsent: false,
            },
          }),
        )
        .attach('file', samplePdf, { filename: 'curriculo.pdf', contentType: 'application/pdf' })
        .expect(404);
      await absent('rollback');
      expect(put).toHaveBeenCalledTimes(1);
      const key = (await put.mock.results[0]!.value) as string;
      await expect(storage.open(key)).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      put.mockRestore();
    }
  });
  it('cria conta, perfil e participação juntos; permite login e rejeita duplicidade', async () => {
    const input = body('accepted');
    const response = await api().post('/api/auth/register').set(headers).send(input).expect(201);
    expect(response.body.user.role).toBe('CANDIDATE');
    expect(response.body.user).not.toHaveProperty('passwordHash');
    expect(response.body.user).not.toHaveProperty('password');
    expect(response.headers['set-cookie']).toBeUndefined();
    expect(response.body.result.outcome).toBe('TALENT_POOL');
    const userId = response.body.user.id as string;
    expect(await db.candidateProfile.findUnique({ where: { userId } })).not.toBeNull();
    expect(await db.talentConsent.count({ where: { userId } })).toBe(1);
    expect(await db.application.count({ where: { userId } })).toBe(0);
    const before = await db.auditLog.count({ where: { actorId: userId } });
    await api().post('/api/auth/register').set(headers).send(input).expect(409);
    expect(await db.auditLog.count({ where: { actorId: userId } })).toBe(before);
    await api()
      .post('/api/auth/login')
      .set(headers)
      .send({ email: input.data.email, password })
      .expect(200);
  });
  it('prazo encerrado sem adesão ao banco impede também a criação da conta', async () => {
    const data = await applicationBody('expired', true);
    await api().post('/api/auth/register').set(headers).send({ data }).expect(409);
    await absent('expired');
  });
  it('vaga aberta cria conta/candidatura e currículo privado sem adesão implícita ao banco', async () => {
    const data = await applicationBody('application');
    const response = await api()
      .post('/api/auth/register')
      .set(headers)
      .field('data', JSON.stringify(data))
      .attach('file', samplePdf, { filename: 'curriculo.pdf', contentType: 'application/pdf' })
      .expect(201);
    const userId = response.body.user.id as string;
    expect(response.body.result.outcome).toBe('APPLICATION');
    expect(await db.application.count({ where: { userId, jobId: data.application.jobId } })).toBe(
      1,
    );
    expect(await db.talentConsent.count({ where: { userId } })).toBe(0);
    expect(await db.resumeFile.findUnique({ where: { userId } })).not.toBeNull();
    await api().get('/api/candidates/me/resume').expect(401);
    const login = await api()
      .post('/api/auth/login')
      .set(headers)
      .send({ email: data.email, password })
      .expect(200);
    const cookie = (login.headers['set-cookie'] as unknown as string[])[0]!.split(';')[0]!;
    await api().get('/api/candidates/me/resume').set('Cookie', cookie).expect(200);
  });
  it('envios concorrentes do mesmo e-mail criam somente uma conta e uma adesão', async () => {
    const input = body('concurrent');
    const results = await Promise.all(
      [0, 1].map(() => api().post('/api/auth/register').set(headers).send(input)),
    );
    expect(results.map((response) => response.status).sort()).toEqual([201, 409]);
    const user = await db.user.findUniqueOrThrow({ where: { email: input.data.email } });
    expect(await db.talentConsent.count({ where: { userId: user.id } })).toBe(1);
  });
});
