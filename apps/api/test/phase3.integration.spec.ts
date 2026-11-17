import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { PROCESS_CONSENT_VERSION, TALENT_CONSENT_VERSION } from '@pointmedia/shared';
import { createApp } from '../src/app';
import { environmentSchema } from '../src/config';
import { PrismaService } from '../src/database/prisma.service';
import { PasswordService } from '../src/auth/password.service';
import { ResumesService } from '../src/candidates/resumes.service';
import { samplePdf } from './resume-fixtures';

describe('Fase 3: candidaturas e talentos com HTTP/PostgreSQL reais', () => {
  let app: INestApplication;
  let db: PrismaService;
  const domain = `@${randomUUID()}.example.test`;
  const password = 'Senha fictícia para a fase três';
  const headers = { 'X-Pointmedia-Request': '1', Origin: 'http://localhost:5173' };
  const users: Record<string, { id: string; cookie: string }> = {};
  const jobIds: string[] = [];
  const api = () => request(app.getHttpServer());
  const profile = (label: string) => ({
    version: 0,
    name: `Pessoa ${label} ${domain}`,
    headline: 'Desenvolvimento',
    location: 'São Paulo',
    seniority: 'SENIOR',
    expectedSalary: '5000.00',
    about:
      'Perfil fictício exclusivamente para integração real do banco de talentos e candidaturas. Experiência com desenvolvimento, comunicação, equipes de produto e entrega de projetos com qualidade técnica.',
    skills: ['React', 'TypeScript'],
    experience: [
      {
        company: 'Empresa Fictícia',
        position: 'Desenvolvedor',
        startedMonth: '2020-01',
        description: 'Projetos web',
      },
    ],
    education: [
      {
        institution: 'Instituição Fictícia',
        course: 'Computação',
        startedYear: 2016,
        finishedYear: 2020,
      },
    ],
    notApplicable: ['LINKEDIN', 'PORTFOLIO'],
    shareWithRecruiters: false,
  });
  const body = (jobId: string, talentPoolConsent = false) => ({
    jobId,
    processConsent: true,
    processConsentVersion: PROCESS_CONSENT_VERSION,
    talentPoolConsent,
    ...(talentPoolConsent ? { talentConsentVersion: TALENT_CONSENT_VERSION } : {}),
  });
  const submit = (jobId: string, talent = false, label = 'candidate') =>
    api()
      .post('/api/applications')
      .set(headers)
      .set('Cookie', users[label]!.cookie)
      .send(body(jobId, talent));
  const join = (label = 'candidate') =>
    api()
      .put('/api/talent-pool/me')
      .set(headers)
      .set('Cookie', users[label]!.cookie)
      .send({ consent: true, consentVersion: TALENT_CONSENT_VERSION });
  const own = (label = 'candidate') =>
    api().get('/api/talent-pool/me').set('Cookie', users[label]!.cookie);
  const staff = (path: string) => api().get(path).set('Cookie', users.recruiter!.cookie);
  async function job(status: 'PUBLISHED' | 'CLOSED' | 'DRAFT' | 'CANCELLED' = 'PUBLISHED') {
    const row = await db.jobOpening.create({
      data: {
        title: `Vaga ${randomUUID()}`,
        description: 'Vaga fictícia exclusiva dos testes da fase 3.',
        status,
        workMode: 'REMOTE',
        salaryNotApplicable: true,
        seniorityNotApplicable: true,
        locationNotApplicable: true,
        closesAt: new Date(Date.now() + 86400000),
        publishedAt: status === 'DRAFT' ? null : new Date(),
        createdById: users.recruiter!.id,
      },
    });
    jobIds.push(row.id);
    return row;
  }
  beforeAll(async () => {
    const config = environmentSchema.parse(process.env);
    if (config.NODE_ENV !== 'test' || !new URL(config.DATABASE_URL).pathname.endsWith('_test'))
      throw new Error('Banco isolado obrigatório.');
    app = await createApp(config, 1000);
    db = app.get(PrismaService);
    const passwordHash = await new PasswordService().hash(password);
    for (const [label, role] of [
      ['candidate', 'CANDIDATE'],
      ['other', 'CANDIDATE'],
      ['empty', 'CANDIDATE'],
      ['recruiter', 'RECRUITER'],
      ['admin', 'ADMIN'],
    ] as const) {
      const row = await db.user.create({
        data: { name: `Pessoa ${label}`, email: `${label}${domain}`, role, passwordHash },
      });
      const login = await api()
        .post('/api/auth/login')
        .set(headers)
        .send({ email: row.email, password })
        .expect(200);
      users[label] = {
        id: row.id,
        cookie: (login.headers['set-cookie'] as unknown as string[])[0]!.split(';')[0]!,
      };
      if (label === 'candidate' || label === 'other')
        await api()
          .put('/api/candidates/me/profile')
          .set(headers)
          .set('Cookie', users[label]!.cookie)
          .send(profile(label))
          .expect(200);
    }
    await api()
      .post('/api/candidates/me/resume')
      .set(headers)
      .set('Cookie', users.candidate!.cookie)
      .attach('file', samplePdf, { filename: 'cv-fase3.pdf', contentType: 'application/pdf' })
      .expect(201);
  });
  beforeEach(async () => {
    await db.talentConsent.updateMany({
      where: { userId: { in: [users.candidate!.id, users.other!.id] }, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  });
  afterAll(async () => {
    if (db) {
      const ids = Object.values(users).map((user) => user.id);
      const files = await db.resumeFile.findMany({ where: { userId: { in: ids } } });
      for (const file of files) await app.get(ResumesService).removeStored(file.storageKey);
      await db.auditLog.deleteMany({ where: { actorId: { in: ids } } });
      await db.application.deleteMany({ where: { userId: { in: ids } } });
      await db.jobOpening.deleteMany({ where: { id: { in: jobIds } } });
      await db.user.deleteMany({ where: { id: { in: ids } } });
    }
    if (app) await app.close();
  });

  it('expõe apenas a política pública; exige sessão e RBAC nas operações', async () => {
    const policy = await api().get('/api/talent-pool/policy').expect(200);
    expect(policy.body.retentionDays).toBe(180);
    expect(policy.body.consentVersion).toBe(TALENT_CONSENT_VERSION);
    for (const path of [
      '/api/applications/me',
      '/api/talent-pool/me',
      '/api/talent-pool',
      '/api/management/applications',
    ])
      await api().get(path).expect(401);
    for (const path of ['/api/talent-pool', '/api/management/applications'])
      await api().get(path).set('Cookie', users.candidate!.cookie).expect(403);
    await api()
      .post('/api/applications')
      .set(headers)
      .set('Cookie', users.recruiter!.cookie)
      .send(body(randomUUID()))
      .expect(403);
  });
  it('exige perfil, autorização, versão do texto e recusa campos forjados', async () => {
    const row = await job();
    await submit(row.id, false, 'empty').expect(400);
    const send = (data: object) =>
      api()
        .post('/api/applications')
        .set(headers)
        .set('Cookie', users.candidate!.cookie)
        .send(data);
    await send({ ...body(row.id), processConsent: false }).expect(400);
    await send({ ...body(row.id), processConsentVersion: 'antigo' }).expect(400);
    await send({ ...body(row.id), userId: users.other!.id }).expect(400);
    await send({ ...body(row.id), status: 'APPROVED' }).expect(400);
    await send({ ...body(row.id), talentPoolConsent: true }).expect(400);
    await api().post('/api/applications').send(body(row.id)).expect(403);
    expect(await db.application.count({ where: { jobId: row.id } })).toBe(0);
  });
  it('recebe a candidatura sem exigir banco de talentos ou compartilhamento geral', async () => {
    const row = await job();
    const response = await submit(row.id).expect(200);
    expect(response.body.outcome).toBe('APPLICATION');
    expect(response.body.application.status).toBe('RECEIVED');
    expect(response.body.application).not.toHaveProperty('candidate');
    expect((await own()).body.active).toBe(false);
    const stored = await db.application.findUniqueOrThrow({
      where: { id: response.body.application.id as string },
    });
    expect(stored.profileVersion).toBe(1);
    expect(stored.authorizationVersion).toBe(PROCESS_CONSENT_VERSION);
    expect(stored.submittedAt.getTime()).toBeLessThan(row.closesAt.getTime());
    expect(
      await db.auditLog.count({ where: { entityId: stored.id, action: 'APPLICATION_RECEIVED' } }),
    ).toBe(1);
    await staff(`/api/candidates/${users.candidate!.id}/profile`).expect(404);
    await staff(`/api/management/applications/${stored.id}/profile`).expect(200);
    await staff(`/api/management/applications/${stored.id}/resume`).expect(200);
    await staff(`/api/talent-pool/${users.candidate!.id}/profile`).expect(404);
  });
  it('oito envios concorrentes produzem um registro e um evento de auditoria', async () => {
    const row = await job();
    const responses = await Promise.all(Array.from({ length: 8 }, () => submit(row.id)));
    expect(responses.map((response) => response.status)).toEqual(Array(8).fill(200));
    expect(new Set(responses.map((response) => response.body.application.id)).size).toBe(1);
    expect(await db.application.count({ where: { jobId: row.id } })).toBe(1);
    expect(
      await db.auditLog.count({
        where: {
          action: 'APPLICATION_RECEIVED',
          entityId: responses[0]!.body.application.id as string,
        },
      }),
    ).toBe(1);
  });
  it('retentativa após encerramento recupera o comprovante original', async () => {
    const row = await job();
    const first = await submit(row.id).expect(200);
    await db.jobOpening.update({ where: { id: row.id }, data: { status: 'CLOSED' } });
    const repeated = await submit(row.id).expect(200);
    expect(repeated.body.application.id).toBe(first.body.application.id);
    expect(repeated.body.application.submittedAt).toBe(first.body.application.submittedAt);
  });
  it.each(['DRAFT', 'CANCELLED'] as const)(
    'não admite candidatura ou adesão indireta por vaga %s',
    async (status) => {
      const row = await job(status);
      await submit(row.id, true).expect(404);
      expect((await own()).body.active).toBe(false);
    },
  );
  it('vaga expirada sem consentimento opcional não cria candidatura nem adesão', async () => {
    const row = await job();
    await db.jobOpening.update({
      where: { id: row.id },
      data: { closesAt: new Date(Date.now() - 1000) },
    });
    await submit(row.id).expect(409);
    expect(await db.application.count({ where: { jobId: row.id } })).toBe(0);
    expect((await own()).body.active).toBe(false);
  });
  it('vaga encerrada com consentimento explícito entra somente no banco', async () => {
    const row = await job('CLOSED');
    const response = await submit(row.id, true).expect(200);
    expect(response.body.outcome).toBe('TALENT_POOL');
    expect(response.body.application).toBeNull();
    expect(response.body.talentConsent.consentVersion).toBe(TALENT_CONSENT_VERSION);
    expect(await db.application.count({ where: { jobId: row.id } })).toBe(0);
    expect((await own()).body.active).toBe(true);
  });
  it('espera pelo lock e recusa o prazo vencido durante a espera', async () => {
    const row = await job();
    const blocker = new Client({ connectionString: process.env.DATABASE_URL });
    await blocker.connect();
    let result: Promise<request.Response> | undefined;
    try {
      await blocker.query('BEGIN');
      const lock = await blocker.query<{ pid: number }>('SELECT pg_backend_pid() AS pid');
      await blocker.query(
        'UPDATE "JobOpening" SET "closesAt" = clock_timestamp() + interval \'700 milliseconds\' WHERE id = $1::uuid',
        [row.id],
      );
      result = submit(row.id).then((response) => response);
      let waiting = false;
      for (let attempt = 0; attempt < 40 && !waiting; attempt++) {
        const rows = await db.$queryRaw<
          { waiting: boolean }[]
        >`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE ${lock.rows[0]!.pid} = ANY(pg_blocking_pids(pid))) AS waiting`;
        waiting = rows[0]!.waiting;
        if (!waiting) await new Promise((resolve) => setTimeout(resolve, 20));
      }
      expect(waiting).toBe(true);
      await blocker.query('SELECT pg_sleep(0.8)');
      await blocker.query('COMMIT');
      expect((await result).status).toBe(409);
      expect(await db.application.count({ where: { jobId: row.id } })).toBe(0);
    } finally {
      await blocker.query('ROLLBACK');
      await blocker.end();
      if (result) await result;
    }
  });
  it('vaga encerrada manualmente recusa inscrição sem escolha pelo banco', async () => {
    const row = await job('CLOSED');
    await submit(row.id).expect(409);
    expect(await db.application.count({ where: { jobId: row.id } })).toBe(0);
  });
  it('lista somente candidaturas próprias e filtra a consulta interna por vaga', async () => {
    const row = await job();
    const response = await submit(row.id).expect(200);
    const id = response.body.application.id as string;
    const mine = await api()
      .get(`/api/applications/me?jobId=${row.id}`)
      .set('Cookie', users.candidate!.cookie)
      .expect(200);
    expect(mine.body.total).toBe(1);
    const other = await api()
      .get(`/api/applications/me?jobId=${row.id}`)
      .set('Cookie', users.other!.cookie)
      .expect(200);
    expect(other.body.total).toBe(0);
    await api().get(`/api/applications/me/${id}`).set('Cookie', users.other!.cookie).expect(404);
    await api()
      .get(`/api/management/applications/${id}/profile`)
      .set('Cookie', users.other!.cookie)
      .expect(403);
    const internal = await staff(`/api/management/applications?jobId=${row.id}&pageSize=1`).expect(
      200,
    );
    expect(internal.body.items[0].candidate.userId).toBe(users.candidate!.id);
    expect(internal.body).not.toHaveProperty('email');
    await staff('/api/management/applications?jobId=invalido').expect(400);
  });
  it('adesão independente é idempotente, auditada e possui prazo de 180 dias', async () => {
    const first = await join().expect(200);
    const repeated = await join().expect(200);
    expect(repeated.body.consent.id).toBe(first.body.consent.id);
    expect(
      Date.parse(first.body.consent.expiresAt) - Date.parse(first.body.consent.grantedAt),
    ).toBe(180 * 86400000);
    expect(
      await db.auditLog.count({
        where: { action: 'TALENT_CONSENT_GRANTED', entityId: first.body.consent.id as string },
      }),
    ).toBe(1);
    const profileResponse = await staff(`/api/talent-pool/${users.candidate!.id}/profile`).expect(
      200,
    );
    expect(profileResponse.body.shareWithRecruiters).toBe(false);
    expect(JSON.stringify(profileResponse.body)).not.toMatch(/storageKey|passwordHash|sha256/);
    await staff(`/api/talent-pool/${users.candidate!.id}/resume`).expect(200);
  });
  it('compartilhamento geral não equivale a adesão no banco de talentos', async () => {
    await db.candidateProfile.update({
      where: { userId: users.other!.id },
      data: { recruitmentConsentAt: new Date() },
    });
    await staff(`/api/candidates/${users.other!.id}/profile`).expect(200);
    await staff(`/api/talent-pool/${users.other!.id}/profile`).expect(404);
    const listed = await staff(`/api/talent-pool?q=${encodeURIComponent(domain)}`).expect(200);
    expect(listed.body.total).toBe(0);
  });
  it('revogação bloqueia banco/perfil/arquivo e preserva candidatura independente', async () => {
    const row = await job();
    const received = await submit(row.id, true).expect(200);
    for (let i = 0; i < 2; i++)
      await api()
        .delete('/api/talent-pool/me')
        .set(headers)
        .set('Cookie', users.candidate!.cookie)
        .expect(204);
    expect((await own()).body.active).toBe(false);
    await staff(`/api/talent-pool/${users.candidate!.id}/profile`).expect(404);
    await staff(`/api/talent-pool/${users.candidate!.id}/resume`).expect(404);
    await staff(`/api/management/applications/${received.body.application.id}/profile`).expect(200);
    const renewal = await join().expect(200);
    expect(renewal.body.consent.id).not.toBe(received.body.talentConsent.id);
  });
  it('expiração bloqueia acesso sem scheduler; renovação preserva histórico', async () => {
    const granted = await join().expect(200);
    await db.talentConsent.update({
      where: { id: granted.body.consent.id as string },
      data: { grantedAt: new Date(Date.now() - 20000), expiresAt: new Date(Date.now() - 10000) },
    });
    expect((await own()).body.active).toBe(false);
    await staff(`/api/talent-pool/${users.candidate!.id}/profile`).expect(404);
    await staff(`/api/talent-pool/${users.candidate!.id}/resume`).expect(404);
    const renewed = await join().expect(200);
    expect(renewed.body.active).toBe(true);
    expect(renewed.body.consent.id).not.toBe(granted.body.consent.id);
    expect(
      (
        await db.talentConsent.findUniqueOrThrow({
          where: { id: granted.body.consent.id as string },
        })
      ).revokedAt,
    ).not.toBeNull();
  });
  it('pesquisa, combina filtros, ordena e pagina somente perfis com autorização ativa', async () => {
    await join().expect(200);
    const found = await staff(
      `/api/talent-pool?${new URLSearchParams({ q: domain, skill: 'react', seniority: 'SENIOR', location: 'paulo', education: 'computação', experience: 'desenvolvedor', salaryMin: '4000', salaryMax: '5000', pageSize: '1', sort: 'name' })}`,
    ).expect(200);
    expect(found.body.total).toBe(1);
    expect(found.body.items[0].userId).toBe(users.candidate!.id);
    for (const [filter, value] of [
      ['skill', 'inexistente'],
      ['education', 'Medicina'],
      ['experience', 'Jornalismo'],
      ['salaryMax', '4000'],
      ['seniority', 'JUNIOR'],
    ]) {
      const response = await staff(
        `/api/talent-pool?${new URLSearchParams({ q: domain, [filter!]: value! })}`,
      ).expect(200);
      expect(response.body.total).toBe(0);
    }
    const page = await staff(
      `/api/talent-pool?q=${encodeURIComponent(domain)}&page=2&pageSize=1`,
    ).expect(200);
    expect(page.body.total).toBe(1);
    expect(page.body.items).toEqual([]);
    await staff('/api/talent-pool?salaryMin=9000&salaryMax=1000').expect(400);
    await staff('/api/talent-pool?page=0').expect(400);
  });
  it('exige consentimento válido para adesão e rejeita extras', async () => {
    const send = (data: object) =>
      api()
        .put('/api/talent-pool/me')
        .set(headers)
        .set('Cookie', users.candidate!.cookie)
        .send(data);
    await send({ consent: false, consentVersion: TALENT_CONSENT_VERSION }).expect(400);
    await send({ consent: true, consentVersion: 'antigo' }).expect(400);
    await send({
      consent: true,
      consentVersion: TALENT_CONSENT_VERSION,
      expiresAt: '2099-01-01',
    }).expect(400);
    await join('empty').expect(400);
  });
  it('remover perfil revoga adesão e acesso, preservando conta e comprovante mínimo', async () => {
    const row = await job();
    const received = await submit(row.id, true).expect(200);
    await api()
      .delete('/api/candidates/me/profile')
      .set(headers)
      .set('Cookie', users.candidate!.cookie)
      .send({ version: 1 })
      .expect(204);
    expect((await own()).body.active).toBe(false);
    await staff(`/api/management/applications/${received.body.application.id}/profile`).expect(404);
    await staff(`/api/management/applications/${received.body.application.id}/resume`).expect(404);
    await api()
      .get(`/api/applications/me/${received.body.application.id}`)
      .set('Cookie', users.candidate!.cookie)
      .expect(200);
    await api().get('/api/users/me').set('Cookie', users.candidate!.cookie).expect(200);
  });
});
