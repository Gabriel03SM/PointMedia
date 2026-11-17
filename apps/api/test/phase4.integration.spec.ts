import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import {
  DEFAULT_SCREENING_SETTINGS,
  PROCESS_CONSENT_VERSION,
  PROFILE_FIELDS,
  type Job,
} from '@pointmedia/shared';
import { createApp } from '../src/app';
import { environmentSchema } from '../src/config';
import { PrismaService } from '../src/database/prisma.service';
import { PasswordService } from '../src/auth/password.service';

describe('Fase 4: triagem com HTTP e PostgreSQL reais', () => {
  let app: INestApplication;
  let db: PrismaService;
  const domain = `@${randomUUID()}.example.test`;
  const password = 'Senha fictícia para a triagem';
  const headers = { 'X-Pointmedia-Request': '1', Origin: 'http://localhost:5173' };
  const users: Record<string, { id: string; cookie: string }> = {};
  const jobIds: string[] = [];
  const api = () => request(app.getHttpServer());
  const staff = (method: 'get' | 'put' | 'post', path: string) =>
    api()[method](path).set(headers).set('Cookie', users.recruiter!.cookie);
  const path = (id: string, suffix: string) => `/api/screening/jobs/${id}/${suffix}`;
  const jobInput = {
    title: 'Vaga de triagem',
    description: 'Oportunidade fictícia exclusivamente para a validação de triagem.',
    workMode: 'REMOTE',
    seniority: 'SENIOR',
    seniorityNotApplicable: false,
    locationNotApplicable: true,
    salaryMin: '3000.00',
    salaryMax: '5000.00',
    salaryNotApplicable: false,
    requiredSkills: ['React', 'TypeScript'],
    desiredSkills: ['Testes'],
    closesAt: new Date(Date.now() + 86400000).toISOString(),
  };
  function profile(label: string) {
    return {
      version: 0,
      name: `Pessoa ${label} ${domain}`,
      headline: 'Desenvolvimento de software',
      about:
        'Perfil fictício exclusivamente para verificar aderência determinística dos critérios de vagas. Experiência declarada em colaboração, comunicação e desenvolvimento com qualidade técnica.',
      skills:
        label === 'beta' ? ['React'] : label === 'empty' ? [] : ['React', 'TypeScript', 'Testes'],
      seniority: label === 'empty' ? null : label === 'beta' ? 'JUNIOR' : 'SENIOR',
      expectedSalary: label === 'empty' ? null : label === 'beta' ? '6500.00' : '4500.00',
      experience: [],
      education: [],
      notApplicable:
        label === 'empty'
          ? [...PROFILE_FIELDS]
          : ['LOCATION', 'LINKEDIN', 'PORTFOLIO', 'EXPERIENCE', 'EDUCATION'],
      shareWithRecruiters: false,
    };
  }
  async function newJob() {
    const draft = await api()
      .post('/api/management/jobs')
      .set(headers)
      .set('Cookie', users.recruiter!.cookie)
      .send({ ...jobInput, title: `Triagem ${randomUUID()}` })
      .expect(201);
    const published = await api()
      .patch(`/api/management/jobs/${draft.body.id}/status`)
      .set(headers)
      .set('Cookie', users.recruiter!.cookie)
      .send({ version: 1, status: 'PUBLISHED' })
      .expect(200);
    jobIds.push(published.body.id as string);
    return published.body as Job;
  }
  const config = (id: string, version = 0, extra: object = {}) =>
    staff('put', path(id, 'configuration')).send({
      ...DEFAULT_SCREENING_SETTINGS,
      version,
      ...extra,
    });
  const generate = (job: Job, configurationVersion = 1) =>
    staff('post', path(job.id, 'runs')).send({ configurationVersion, jobVersion: job.version });
  const ranking = (id: string, query = '') => staff('get', path(id, 'ranking') + query);
  const apply = (id: string, label = 'alpha') =>
    api().post('/api/applications').set(headers).set('Cookie', users[label]!.cookie).send({
      jobId: id,
      processConsent: true,
      processConsentVersion: PROCESS_CONSENT_VERSION,
      talentPoolConsent: false,
    });
  beforeAll(async () => {
    const env = environmentSchema.parse(process.env);
    if (env.NODE_ENV !== 'test' || !new URL(env.DATABASE_URL).pathname.endsWith('_test'))
      throw new Error('Banco isolado obrigatório.');
    app = await createApp(env, 1000);
    db = app.get(PrismaService);
    const passwordHash = await new PasswordService().hash(password);
    for (const label of ['recruiter', 'admin', 'alpha', 'beta', 'gamma', 'empty']) {
      const row = await db.user.create({
        data: {
          name: `Pessoa ${label}`,
          email: `${label}${domain}`,
          passwordHash,
          role: label === 'recruiter' ? 'RECRUITER' : label === 'admin' ? 'ADMIN' : 'CANDIDATE',
        },
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
      if (!['recruiter', 'admin'].includes(label))
        await api()
          .put('/api/candidates/me/profile')
          .set(headers)
          .set('Cookie', users[label]!.cookie)
          .send(profile(label))
          .expect(200);
    }
  });
  afterAll(async () => {
    if (db) {
      const ids = Object.values(users).map((row) => row.id);
      await db.auditLog.deleteMany({ where: { actorId: { in: ids } } });
      await db.screeningRun.deleteMany({ where: { jobId: { in: jobIds } } });
      await db.screeningConfiguration.deleteMany({ where: { jobId: { in: jobIds } } });
      await db.application.deleteMany({ where: { userId: { in: ids } } });
      await db.jobOpening.deleteMany({ where: { id: { in: jobIds } } });
      await db.user.deleteMany({ where: { id: { in: ids } } });
    }
    if (app) await app.close();
  });
  it('protege todas as rotas de triagem e permite RH/admin', async () => {
    const job = await newJob();
    for (const suffix of ['configuration', 'ranking']) {
      await api().get(path(job.id, suffix)).expect(401);
      await api().get(path(job.id, suffix)).set('Cookie', users.alpha!.cookie).expect(403);
      await api().get(path(job.id, suffix)).set('Cookie', users.admin!.cookie).expect(200);
    }
    await api()
      .post(path(job.id, 'runs'))
      .set(headers)
      .set('Cookie', users.alpha!.cookie)
      .send({ configurationVersion: 1, jobVersion: job.version })
      .expect(403);
    await staff('get', path('invalido', 'ranking')).expect(400);
    await staff('get', path(randomUUID(), 'configuration')).expect(404);
  });
  it('GET não grava configuração; valida pesos, política e campos desconhecidos', async () => {
    const job = await newJob();
    const initial = await staff('get', path(job.id, 'configuration')).expect(200);
    expect(initial.body.configuration).toBeNull();
    expect(initial.body.defaults.skillsWeight).toBe(50);
    expect(await db.screeningConfiguration.count({ where: { jobId: job.id } })).toBe(0);
    await config(job.id, 0, { skillsWeight: 51 }).expect(400);
    await config(job.id, 0, { skillsWeight: -1, seniorityWeight: 81 }).expect(400);
    await config(job.id, 0, { mandatorySkillsShare: 101 }).expect(400);
    await config(job.id, 0, { createdById: users.alpha!.id }).expect(400);
    await config(job.id, 0, { skillsWeight: 49.5, seniorityWeight: 30.5 }).expect(400);
    await generate(job).expect(409);
    expect(await db.screeningRun.count({ where: { jobId: job.id } })).toBe(0);
  });
  it('configura versões imutáveis com auditoria e conflito de edição', async () => {
    const job = await newJob();
    const first = await config(job.id).expect(200);
    const second = await config(job.id, 1, { skillsWeight: 60, seniorityWeight: 20 }).expect(200);
    expect(second.body.configuration.version).toBe(2);
    expect(second.body.configuration.id).not.toBe(first.body.configuration.id);
    await config(job.id, 1).expect(409);
    const original = await db.screeningConfiguration.findUniqueOrThrow({
      where: { id: first.body.configuration.id as string },
    });
    expect(original.skillsWeight).toBe(50);
    expect(
      await db.auditLog.count({
        where: { entityId: original.id, action: 'SCREENING_CONFIGURATION_SAVED' },
      }),
    ).toBe(1);
  });
  it('duas gravações concorrentes da mesma versão não sobrescrevem critérios', async () => {
    const job = await newJob();
    const responses = await Promise.all([config(job.id), config(job.id)]);
    expect(responses.map((row) => row.status).sort()).toEqual([200, 409]);
    expect(await db.screeningConfiguration.count({ where: { jobId: job.id } })).toBe(1);
  });
  it('reprocessamentos concorrentes preservam execuções completas ou retornam conflito recuperável', async () => {
    const job = await newJob();
    await config(job.id).expect(200);
    await apply(job.id).expect(200);
    const responses = await Promise.all([generate(job), generate(job)]);
    expect(responses.every((row) => [201, 409].includes(row.status))).toBe(true);
    const accepted = responses.filter((row) => row.status === 201);
    expect(accepted.length).toBeGreaterThan(0);
    const runs = await db.screeningRun.findMany({
      where: { jobId: job.id },
      orderBy: { sequence: 'asc' },
      include: { results: true },
    });
    expect(runs.length).toBe(accepted.length);
    expect(runs.map((row) => row.sequence)).toEqual(
      Array.from({ length: accepted.length }, (_, index) => index + 1),
    );
    expect(runs.every((row) => row.results.length === 1)).toBe(true);
    expect((await ranking(job.id)).body.run.sequence).toBe(accepted.length);
  });

  it('ranking sem candidaturas permanece vazio com execução real', async () => {
    const job = await newJob();
    await config(job.id).expect(200);
    const run = await generate(job).expect(201);
    expect(run.body.evaluatedCount).toBe(0);
    expect(run.body.sequence).toBe(1);
    const response = await ranking(job.id).expect(200);
    expect(response.body.items).toEqual([]);
    expect(response.body.applicationsCount).toBe(0);
    expect(response.body.stale).toBe(false);
  });
  it('pontua somente inscritos da vaga, persiste justificativas e não altera candidaturas', async () => {
    const job = await newJob();
    await config(job.id).expect(200);
    await apply(job.id).expect(200);
    await apply(job.id, 'beta').expect(200);
    const run = await generate(job).expect(201);
    expect(run.body.evaluatedCount).toBe(2);
    expect(run.body.reviewRequiredCount).toBe(1);
    const response = await ranking(job.id).expect(200);
    expect(response.body.items.map((item: { score: number }) => item.score)).toEqual([100, 47.88]);
    expect(response.body.items[0].candidate.userId).toBe(users.alpha!.id);
    expect(response.body.items[1].reviewReasons.join(' ')).toContain('TypeScript');
    expect(JSON.stringify(response.body)).not.toMatch(
      /passwordHash|storageKey|sourceHash|@example\.test/,
    );
    expect(await db.application.count({ where: { jobId: job.id, status: 'RECEIVED' } })).toBe(2);
    expect(await db.screeningResult.count({ where: { runId: run.body.id as string } })).toBe(2);
    expect(
      await db.auditLog.count({
        where: { entityId: run.body.id as string, action: 'SCREENING_RUN_CREATED' },
      }),
    ).toBe(1);
    const otherJob = await newJob();
    await config(otherJob.id).expect(200);
    await generate(otherJob).expect(201);
    expect((await ranking(otherJob.id)).body.total).toBe(0);
  });
  it('empates têm desempate estável e paginação/pesquisa preservam os resultados', async () => {
    const job = await newJob();
    await config(job.id).expect(200);
    const a = await apply(job.id).expect(200);
    const b = await apply(job.id, 'gamma').expect(200);
    await db.application.updateMany({
      where: { jobId: job.id },
      data: { submittedAt: new Date('2026-01-01T12:00:00Z') },
    });
    await generate(job).expect(201);
    const expected = [a.body.application.id as string, b.body.application.id as string].sort();
    const one = await ranking(job.id, '?pageSize=1&page=1').expect(200);
    const two = await ranking(job.id, '?pageSize=1&page=2').expect(200);
    expect([one.body.items[0].applicationId, two.body.items[0].applicationId]).toEqual(expected);
    expect(one.body.total).toBe(2);
    const filtered = await ranking(job.id, '?q=gamma').expect(200);
    expect(filtered.body.total).toBe(1);
    await ranking(job.id, '?page=0').expect(400);
  });
  it('nota desconhecida fica pendente e por último, com cobertura e revisão explícitas', async () => {
    const job = await newJob();
    await config(job.id).expect(200);
    await apply(job.id).expect(200);
    await apply(job.id, 'empty').expect(200);
    await generate(job).expect(201);
    const response = await ranking(job.id).expect(200);
    expect(response.body.items[1].score).toBeNull();
    expect(response.body.items[1].coverage).toBe(0);
    expect(response.body.run.withoutScoreCount).toBe(1);
    expect(response.body.items[1].reviewRequired).toBe(true);
  });
  it('alterar pesos exige reprocessamento e preserva a execução anterior', async () => {
    const job = await newJob();
    await config(job.id).expect(200);
    await apply(job.id, 'beta').expect(200);
    const first = await generate(job).expect(201);
    await config(job.id, 1, { skillsWeight: 0, seniorityWeight: 0, salaryWeight: 100 }).expect(200);
    const old = await ranking(job.id).expect(200);
    expect(old.body.stale).toBe(true);
    expect(old.body.run.configurationVersion).toBe(1);
    await generate(job, 1).expect(409);
    const second = await generate(job, 2).expect(201);
    expect(second.body.sequence).toBe(2);
    const current = await ranking(job.id).expect(200);
    expect(current.body.stale).toBe(false);
    expect(current.body.items[0].score).toBe(76.92);
    const previous = await db.screeningResult.findFirstOrThrow({
      where: { runId: first.body.id as string },
    });
    expect(previous.score?.toFixed(2)).toBe('47.88');
    expect(await db.screeningRun.count({ where: { jobId: job.id } })).toBe(2);
  });
  it('nova inscrição e alteração de requisitos sinalizam resultado desatualizado', async () => {
    const job = await newJob();
    await config(job.id).expect(200);
    await apply(job.id).expect(200);
    await generate(job).expect(201);
    await apply(job.id, 'gamma').expect(200);
    expect((await ranking(job.id)).body.stale).toBe(true);
    await generate(job).expect(201);
    expect((await ranking(job.id)).body.stale).toBe(false);
    const updated = await api()
      .put(`/api/management/jobs/${job.id}`)
      .set(headers)
      .set('Cookie', users.recruiter!.cookie)
      .send({ ...jobInput, title: job.title, version: job.version, requiredSkills: ['SQL'] })
      .expect(200);
    expect((await ranking(job.id)).body.stale).toBe(true);
    await generate(job).expect(409);
    await generate(updated.body as Job).expect(201);
    expect((await ranking(job.id)).body.stale).toBe(false);
  });
  it('alteração do perfil sinaliza atualização e a nova execução usa a versão atual', async () => {
    const job = await newJob();
    await config(job.id).expect(200);
    await apply(job.id).expect(200);
    await generate(job).expect(201);
    const current = await db.candidateProfile.findUniqueOrThrow({
      where: { userId: users.alpha!.id },
    });
    await api()
      .put('/api/candidates/me/profile')
      .set(headers)
      .set('Cookie', users.alpha!.cookie)
      .send({ ...profile('alpha'), version: current.version, expectedSalary: '10000.00' })
      .expect(200);
    expect((await ranking(job.id)).body.stale).toBe(true);
    await generate(job).expect(201);
    const result = await ranking(job.id).expect(200);
    expect(result.body.items[0].profileVersion).toBe(current.version + 1);
    expect(result.body.items[0].score).toBe(90);
  });
  it('inativar conta ou remover perfil impede exposição de resultados antigos', async () => {
    const job = await newJob();
    await config(job.id).expect(200);
    await apply(job.id, 'gamma').expect(200);
    await generate(job).expect(201);
    await db.user.update({ where: { id: users.gamma!.id }, data: { active: false } });
    let response = await ranking(job.id).expect(200);
    expect(response.body.items).toEqual([]);
    expect(response.body.stale).toBe(true);
    await db.user.update({ where: { id: users.gamma!.id }, data: { active: true } });
    const current = await db.candidateProfile.findUniqueOrThrow({
      where: { userId: users.gamma!.id },
    });
    await api()
      .delete('/api/candidates/me/profile')
      .set(headers)
      .set('Cookie', users.gamma!.cookie)
      .send({ version: current.version })
      .expect(204);
    response = await ranking(job.id).expect(200);
    expect(response.body.items).toEqual([]);
    expect(response.body.unavailableProfiles).toBe(1);
    expect(response.body.stale).toBe(true);
  });
});
