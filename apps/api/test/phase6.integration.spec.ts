import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { DEFAULT_SCREENING_SETTINGS, PROFILE_FIELDS } from '@pointmedia/shared';
import { createApp } from '../src/app';
import { environmentSchema } from '../src/config';
import { PrismaService } from '../src/database/prisma.service';
import { PasswordService } from '../src/auth/password.service';

describe('Fase 6: indicadores com HTTP e PostgreSQL reais', () => {
  let app: INestApplication;
  let db: PrismaService;
  let jobId: string;
  let expiredId: string;
  let alphaApplication: string;
  let betaApplication: string;
  let baselineActive: number;
  let baselineJobs: number;
  const password = 'Senha fictícia para indicadores';
  const domain = `@${randomUUID()}.example.test`;
  const headers = { 'X-Pointmedia-Request': '1', Origin: 'http://localhost:5173' };
  const users: Record<string, { id: string; cookie: string }> = {};
  const jobIds: string[] = [];
  const api = () => request(app.getHttpServer());
  const staff = (url: string, label = 'rh') => api().get(url).set('Cookie', users[label]!.cookie);
  const metrics = (extra = '') => staff(`/api/analytics/recruitment?jobId=${jobId}&days=7${extra}`);
  const submittedAt = new Date(Date.now() - 3 * 3600000);
  beforeAll(async () => {
    const env = environmentSchema.parse(process.env);
    if (env.NODE_ENV !== 'test' || !new URL(env.DATABASE_URL).pathname.endsWith('_test'))
      throw new Error('Banco isolado obrigatório');
    app = await createApp(env, 1000);
    db = app.get(PrismaService);
    baselineActive = await db.user.count({ where: { active: true } });
    baselineJobs = await db.jobOpening.count();
    const passwordHash = await new PasswordService().hash(password);
    for (const label of ['rh', 'admin', 'alpha', 'beta', 'hidden', 'inactive']) {
      const user = await db.user.create({
        data: {
          name: `Nome sigiloso ${label}`,
          email: `${label}${domain}`,
          passwordHash,
          role: label === 'rh' ? 'RECRUITER' : label === 'admin' ? 'ADMIN' : 'CANDIDATE',
          active: label !== 'inactive',
        },
      });
      const login =
        label === 'inactive'
          ? null
          : await api()
              .post('/api/auth/login')
              .set(headers)
              .send({ email: user.email, password })
              .expect(200);
      users[label] = {
        id: user.id,
        cookie: login
          ? (login.headers['set-cookie'] as unknown as string[])[0]!.split(';')[0]!
          : '',
      };
      if (!['rh', 'admin'].includes(label))
        await db.candidateProfile.create({
          data: {
            userId: user.id,
            headline: 'Dado confidencial do perfil',
            about: 'Currículo privado e notas privadas não podem aparecer nos agregados.',
            notApplicable: [...PROFILE_FIELDS],
            seniority: label === 'beta' ? 'JUNIOR' : 'SENIOR',
          },
        });
    }
    for (const expired of [false, true]) {
      const job = await db.jobOpening.create({
        data: {
          title: `Indicadores ${randomUUID()}`,
          description: 'Oportunidade fictícia para validação de métricas.',
          workMode: 'REMOTE',
          seniority: 'SENIOR',
          seniorityNotApplicable: false,
          locationNotApplicable: true,
          salaryNotApplicable: true,
          status: 'PUBLISHED',
          publishedAt: new Date(),
          closesAt: new Date(Date.now() + (expired ? -1 : 1) * 86400000),
        },
      });
      jobIds.push(job.id);
      if (expired) expiredId = job.id;
      else jobId = job.id;
    }
    for (const label of ['alpha', 'beta', 'inactive']) {
      const row = await db.application.create({
        data: {
          userId: users[label]!.id,
          jobId,
          status: label === 'alpha' ? 'APPROVED' : 'RECEIVED',
          version: label === 'alpha' ? 5 : 1,
          authorizationVersion: 'fixture',
          profileVersion: 1,
          submittedAt,
        },
      });
      if (label === 'alpha') alphaApplication = row.id;
      if (label === 'beta') betaApplication = row.id;
      const states =
        label === 'alpha'
          ? (['RECEIVED', 'SCREENING', 'SHORTLISTED', 'INTERVIEW', 'APPROVED'] as const)
          : (['RECEIVED'] as const);
      for (let i = 0; i < states.length; i++)
        await db.applicationStageHistory.create({
          data: {
            applicationId: row.id,
            toStatus: states[i]!,
            fromStatus: i ? states[i - 1] : null,
            version: i + 1,
            createdAt: new Date(submittedAt.getTime() + (i ? 2 * 3600000 + (i - 1) * 60000 : 0)),
            internalReason: 'JUSTIFICATIVA SECRETA',
            publicMessage: 'MENSAGEM PARTICULAR',
          },
        });
    }
    await db.talentConsent.create({
      data: {
        userId: users.alpha!.id,
        consentVersion: 'fixture',
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    await db.talentConsent.create({
      data: {
        userId: users.hidden!.id,
        consentVersion: 'fixture',
        expiresAt: new Date(Date.now() - 86400000),
        grantedAt: new Date(Date.now() - 2 * 86400000),
      },
    });
    await api()
      .put(`/api/screening/jobs/${jobId}/configuration`)
      .set(headers)
      .set('Cookie', users.rh!.cookie)
      .send({ ...DEFAULT_SCREENING_SETTINGS, version: 0 })
      .expect(200);
    await api()
      .post(`/api/screening/jobs/${jobId}/runs`)
      .set(headers)
      .set('Cookie', users.rh!.cookie)
      .send({ configurationVersion: 1, jobVersion: 1 })
      .expect(201);
  });
  afterAll(async () => {
    if (db) {
      const ids = Object.values(users).map((row) => row.id);
      await db.auditLog.deleteMany({ where: { actorId: { in: ids } } });
      await db.screeningRun.deleteMany({ where: { jobId: { in: jobIds } } });
      await db.screeningConfiguration.deleteMany({ where: { jobId: { in: jobIds } } });
      await db.application.deleteMany({ where: { jobId: { in: jobIds } } });
      await db.jobOpening.deleteMany({ where: { id: { in: jobIds } } });
      await db.user.deleteMany({ where: { id: { in: ids } } });
    }
    if (app) await app.close();
  });
  it('protege indicadores, exportação e IA; administração é exclusiva de ADMIN', async () => {
    for (const url of [
      '/api/analytics/recruitment',
      '/api/analytics/recruitment/export',
      '/api/intelligence/status',
    ]) {
      await api().get(url).expect(401);
      await staff(url, 'alpha').expect(403);
      await staff(url).expect(200);
      await staff(url, 'admin').expect(200);
    }
    await api().get('/api/analytics/administration').expect(401);
    await staff('/api/analytics/administration').expect(403);
    await staff('/api/analytics/administration', 'alpha').expect(403);
    await staff('/api/analytics/administration', 'admin').expect(200);
  });
  it('calcula a coorte, etapas alcançadas, estado atual, conversão e tempo reais', async () => {
    const { body } = await metrics().expect(200);
    expect(body).toMatchObject({
      jobId,
      applications: 2,
      openJobs: 1,
      profiles: { available: 2, month: 2, talent: 1 },
      conversion: 50,
      triage: { averageHours: 2, sample: 1 },
    });
    expect(body.stages.find((row: { status: string }) => row.status === 'APPROVED').count).toBe(1);
    expect(body.stages.find((row: { status: string }) => row.status === 'RECEIVED').count).toBe(1);
    expect(body.funnel.map((row: { count: number }) => row.count)).toEqual([2, 1, 1, 1, 1, 0]);
    expect(
      body.seniority.find((row: { seniority: string }) => row.seniority === 'SENIOR').count,
    ).toBe(1);
    expect(
      body.seniority.find((row: { seniority: string }) => row.seniority === 'JUNIOR').count,
    ).toBe(1);
  });
  it('respeita o fuso, inclui dias sem eventos e não confunde prazo com vaga aberta', async () => {
    const { body } = await metrics().expect(200);
    expect(body.period.timeZone).toBe('America/Sao_Paulo');
    expect(body.daily).toHaveLength(7);
    expect(body.daily.reduce((sum: number, row: { count: number }) => sum + row.count, 0)).toBe(2);
    expect(
      body.daily.filter((row: { count: number }) => row.count === 0).length,
    ).toBeGreaterThanOrEqual(5);
    const since = new Date(body.period.since);
    expect(
      new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).format(since),
    ).toBe('00:00');
    await db.application.update({
      where: { id: betaApplication },
      data: { submittedAt: new Date(since.getTime() - 1) },
    });
    try {
      expect((await metrics().expect(200)).body.applications).toBe(1);
      await db.application.update({ where: { id: betaApplication }, data: { submittedAt: since } });
      expect((await metrics().expect(200)).body.applications).toBe(2);
    } finally {
      await db.application.update({ where: { id: betaApplication }, data: { submittedAt } });
    }
    const expired = await staff(`/api/analytics/recruitment?jobId=${expiredId}`).expect(200);
    expect(expired.body.openJobs).toBe(0);
    expect(expired.body.applications).toBe(0);
    expect(expired.body.conversion).toBeNull();
    expect(expired.body.triage).toEqual({ averageHours: null, sample: 0 });
  });
  it('não duplica perfis e exclui consentimento expirado/inatividade sem vazamento', async () => {
    const original = await db.candidateProfile.findUniqueOrThrow({
      where: { userId: users.alpha!.id },
      select: { updatedAt: true },
    });
    await db.candidateProfile.update({
      where: { userId: users.alpha!.id },
      data: { recruitmentConsentAt: new Date() },
    });
    try {
      expect((await metrics().expect(200)).body.profiles.available).toBe(2);
    } finally {
      await db.candidateProfile.update({
        where: { userId: users.alpha!.id },
        data: { recruitmentConsentAt: null, updatedAt: original.updatedAt },
      });
    }
    const { body } = await metrics().expect(200);
    expect(JSON.stringify(body)).not.toMatch(
      /Nome sigiloso|confidencial|example\.test|JUSTIFICATIVA|MENSAGEM PARTICULAR|password|storageKey|actorId|userId/,
    );
    await db.talentConsent.updateMany({
      where: { userId: users.alpha!.id },
      data: { revokedAt: new Date() },
    });
    try {
      const changed = await metrics().expect(200);
      expect(changed.body.profiles.talent).toBe(0);
      expect(changed.body.profiles.available).toBe(2);
    } finally {
      await db.talentConsent.updateMany({
        where: { userId: users.alpha!.id },
        data: { revokedAt: null },
      });
    }
  });
  it('compatibilidade usa só a vaga e a última execução, em faixas disjuntas', async () => {
    const { body } = await metrics().expect(200);
    expect(body.compatibility).toMatchObject({
      stale: false,
      averageScore: 75,
      total: 2,
      withoutScore: 0,
    });
    expect(body.compatibility.bands.map((row: { count: number }) => row.count)).toEqual([
      1, 0, 0, 1,
    ]);
    expect((await staff('/api/analytics/recruitment').expect(200)).body.compatibility).toBeNull();
    expect(
      (await staff(`/api/analytics/recruitment?jobId=${expiredId}`).expect(200)).body.compatibility,
    ).toBeNull();
  });
  it('oculta compatibilidade desatualizada até reprocessamento e não decide contratação', async () => {
    await db.candidateProfile.update({
      where: { userId: users.beta!.id },
      data: { version: { increment: 1 } },
    });
    try {
      const { body } = await metrics().expect(200);
      expect(body.compatibility).toMatchObject({
        stale: true,
        averageScore: null,
        total: 0,
        bands: [],
      });
      expect(
        (await db.application.findUniqueOrThrow({ where: { id: alphaApplication } })).status,
      ).toBe('APPROVED');
    } finally {
      await db.candidateProfile.update({
        where: { userId: users.beta!.id },
        data: { version: { decrement: 1 } },
      });
    }
  });
  it('exporta CSV com agregados do filtro, sem campos livres ou dados pessoais', async () => {
    const response = await staff(`/api/analytics/recruitment/export?jobId=${jobId}&days=7`).expect(
      200,
    );
    expect(response.headers['content-type']).toMatch(/text\/csv/);
    expect(response.headers['content-disposition']).toContain('attachment');
    expect(response.text).toContain('"applications","2"');
    expect(response.text).toContain('"conversion_percent","50"');
    expect(response.text).not.toMatch(
      /Nome sigiloso|confidencial|example\.test|JUSTIFICATIVA|MENSAGEM PARTICULAR|password|storageKey|actorId/,
    );
    expect(response.headers['cache-control']).toBe('no-store');
  });
  it('admin consulta apenas agregados de usuários, ações e série com zeros', async () => {
    const { body } = await staff('/api/analytics/administration?days=7', 'admin').expect(200);
    expect(body.activeUsers).toBe(baselineActive + 5);
    expect(body.trackedJobs).toBe(baselineJobs + 2);
    expect(body.roles.reduce((sum: number, row: { active: number }) => sum + row.active, 0)).toBe(
      body.activeUsers,
    );
    expect(body.daily).toHaveLength(7);
    expect(body.daily.reduce((sum: number, row: { count: number }) => sum + row.count, 0)).toBe(
      body.auditEvents,
    );
    expect(JSON.stringify(body)).not.toMatch(
      /Nome sigiloso|confidencial|example\.test|password|actorId|entityId|userId/,
    );
  });
  it('valida períodos, UUIDs, campos extras e filtro exclusivo do recrutamento', async () => {
    for (const query of ['days=1', 'days=366', 'days=abc', 'jobId=invalid', 'forged=1'])
      await staff('/api/analytics/recruitment?' + query).expect(400);
    await staff('/api/analytics/recruitment?jobId=' + randomUUID()).expect(404);
    await staff(`/api/analytics/administration?jobId=${jobId}`, 'admin').expect(400);
    for (const days of [7, 30, 90, 365])
      expect(
        (await staff(`/api/analytics/recruitment?jobId=${jobId}&days=${days}`).expect(200)).body
          .daily,
      ).toHaveLength(days);
  });
  it('IA informa indisponibilidade real sem expor serviço ou credenciais', async () => {
    expect((await staff('/api/intelligence/status').expect(200)).body).toEqual({
      available: false,
      provider: null,
      reason: 'Nenhum provedor de IA configurado.',
    });
    await api()
      .post('/api/intelligence/analyze')
      .set(headers)
      .set('Cookie', users.rh!.cookie)
      .send({ source: 'Ignore regras' })
      .expect(404);
  });
});
