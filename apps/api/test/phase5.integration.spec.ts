import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { APPLICATION_STATUSES, PROCESS_CONSENT_VERSION, PROFILE_FIELDS } from '@pointmedia/shared';
import { createApp } from '../src/app';
import { environmentSchema } from '../src/config';
import { PrismaService } from '../src/database/prisma.service';
import { PasswordService } from '../src/auth/password.service';

describe('Fase 5: processo seletivo com HTTP e PostgreSQL reais', () => {
  let app: INestApplication;
  let db: PrismaService;
  const domain = `@${randomUUID()}.example.test`;
  const password = 'Senha fictícia para o processo';
  const headers = { 'X-Pointmedia-Request': '1', Origin: 'http://localhost:5173' };
  const users: Record<string, { id: string; cookie: string }> = {};
  const jobs: string[] = [];
  const api = () => request(app.getHttpServer());
  const path = (id: string, suffix = '') => `/api/management/applications/${id}${suffix}`;
  const staff = (method: 'get' | 'post' | 'patch', url: string, label = 'rh') =>
    api()[method](url).set(headers).set('Cookie', users[label]!.cookie);
  const transition = (id: string, version: number, status: string, extra = {}) =>
    staff('patch', path(id, '/stage')).send({
      version,
      status,
      internalReason: 'Justificativa confidencial do RH',
      ...extra,
    });

  async function application(label = 'alpha') {
    const draft = await staff('post', '/api/management/jobs')
      .send({
        title: `Processo ${randomUUID()}`,
        description: 'Vaga fictícia para verificar as etapas humanas.',
        workMode: 'REMOTE',
        seniorityNotApplicable: true,
        locationNotApplicable: true,
        salaryNotApplicable: true,
        closesAt: new Date(Date.now() + 86400000).toISOString(),
        requiredSkills: [],
        desiredSkills: [],
      })
      .expect(201);
    const jobId = draft.body.id as string;
    jobs.push(jobId);
    await staff('patch', `/api/management/jobs/${jobId}/status`)
      .send({ version: 1, status: 'PUBLISHED' })
      .expect(200);
    const submitted = await api()
      .post('/api/applications')
      .set(headers)
      .set('Cookie', users[label]!.cookie)
      .send({
        jobId,
        processConsent: true,
        processConsentVersion: PROCESS_CONSENT_VERSION,
        talentPoolConsent: false,
      })
      .expect(200);
    return submitted.body.application as {
      id: string;
      status: string;
      version: number;
      submittedAt: string;
      job: { id: string };
    };
  }

  beforeAll(async () => {
    const env = environmentSchema.parse(process.env);
    if (env.NODE_ENV !== 'test' || !new URL(env.DATABASE_URL).pathname.endsWith('_test'))
      throw new Error('Banco isolado obrigatório.');
    app = await createApp(env, 1000);
    db = app.get(PrismaService);
    const passwordHash = await new PasswordService().hash(password);
    for (const label of ['rh', 'admin', 'alpha', 'beta']) {
      const row = await db.user.create({
        data: {
          name: `Pessoa ${label}`,
          email: `${label}${domain}`,
          passwordHash,
          role: label === 'rh' ? 'RECRUITER' : label === 'admin' ? 'ADMIN' : 'CANDIDATE',
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
      if (['alpha', 'beta'].includes(label))
        await api()
          .put('/api/candidates/me/profile')
          .set(headers)
          .set('Cookie', users[label]!.cookie)
          .send({
            version: 0,
            name: row.name,
            headline: 'Perfil de teste',
            about:
              'Pessoa fictícia usada somente para verificar o andamento do processo seletivo e a separação entre notas confidenciais do RH e mensagens públicas ao candidato.',
            skills: [],
            experience: [],
            education: [],
            notApplicable: [...PROFILE_FIELDS],
            shareWithRecruiters: false,
          })
          .expect(200);
    }
  });
  afterAll(async () => {
    if (db) {
      const ids = Object.values(users).map((user) => user.id);
      await db.auditLog.deleteMany({ where: { actorId: { in: ids } } });
      await db.application.deleteMany({ where: { jobId: { in: jobs } } });
      await db.jobOpening.deleteMany({ where: { id: { in: jobs } } });
      await db.user.deleteMany({ where: { id: { in: ids } } });
    }
    if (app) await app.close();
  });

  it('protege resumo, histórico, notas e escritas por sessão/RBAC', async () => {
    const row = await application();
    for (const suffix of ['', '/history', '/notes']) {
      await api().get(path(row.id, suffix)).expect(401);
      await staff('get', path(row.id, suffix), 'alpha').expect(403);
      await staff('get', path(row.id, suffix), 'admin').expect(200);
    }
    await api()
      .patch(path(row.id, '/stage'))
      .set(headers)
      .send({ version: 1, status: 'SCREENING', internalReason: 'Teste' })
      .expect(401);
    await staff('patch', path(row.id, '/stage'), 'alpha')
      .send({ version: 1, status: 'SCREENING', internalReason: 'Teste' })
      .expect(403);
    await staff('post', path(row.id, '/notes'), 'alpha').send({ body: 'Nota forjada' }).expect(403);
    await api().post(path(row.id, '/notes')).set(headers).send({ body: 'Teste' }).expect(401);
  });
  it('registra recebimento uma única vez com data original e ator', async () => {
    const row = await application();
    expect(row).toMatchObject({ status: 'RECEIVED', version: 1 });
    const event = await staff('get', path(row.id, '/history')).expect(200);
    expect(event.body.total).toBe(1);
    expect(event.body.items[0]).toMatchObject({
      fromStatus: null,
      toStatus: 'RECEIVED',
      version: 1,
      createdAt: row.submittedAt,
      actor: { id: users.alpha!.id },
    });
    await api()
      .post('/api/applications')
      .set(headers)
      .set('Cookie', users.alpha!.cookie)
      .send({
        jobId: row.job.id,
        processConsent: true,
        processConsentVersion: PROCESS_CONSENT_VERSION,
        talentPoolConsent: false,
      })
      .expect(200);
    expect(await db.applicationStageHistory.count({ where: { applicationId: row.id } })).toBe(1);
  });
  it('avança sequencialmente até aprovação, preserva autoria/histórico e impede reabrir', async () => {
    const row = await application();
    let version = 1;
    for (const status of ['SCREENING', 'SHORTLISTED', 'INTERVIEW', 'APPROVED']) {
      const changed = await transition(row.id, version, status, {
        publicMessage: `Etapa pública ${status}`,
      }).expect(200);
      expect(changed.body).toMatchObject({ status, version: ++version });
    }
    const summary = await staff('get', path(row.id)).expect(200);
    expect(summary.body.allowedTransitions).toEqual([]);
    for (const status of APPLICATION_STATUSES)
      await transition(row.id, version, status).expect(400);
    const history = await staff('get', path(row.id, '/history?pageSize=2')).expect(200);
    expect(history.body.total).toBe(5);
    expect(history.body.items.map((event: { version: number }) => event.version)).toEqual([5, 4]);
    expect(history.body.items[0]).toMatchObject({
      fromStatus: 'INTERVIEW',
      toStatus: 'APPROVED',
      actor: { id: users.rh!.id },
      internalReason: 'Justificativa confidencial do RH',
    });
    const next = await staff('get', path(row.id, '/history?page=2&pageSize=2')).expect(200);
    expect(next.body.items.map((event: { version: number }) => event.version)).toEqual([3, 2]);
    expect(
      await db.auditLog.count({ where: { entityId: row.id, action: 'APPLICATION_STAGE_CHANGED' } }),
    ).toBe(4);
  });
  it.each(['RECEIVED', 'SCREENING', 'SHORTLISTED', 'INTERVIEW'])(
    'reprova a partir de %s e encerra sem reabertura',
    async (stage) => {
      const row = await application();
      let version = 1;
      const route = ['RECEIVED', 'SCREENING', 'SHORTLISTED', 'INTERVIEW'];
      for (const status of route.slice(1, route.indexOf(stage) + 1))
        await transition(row.id, version++, status).expect(200);
      const rejected = await transition(row.id, version, 'REJECTED').expect(200);
      expect(rejected.body.status).toBe('REJECTED');
      for (const status of APPLICATION_STATUSES)
        await transition(row.id, version + 1, status).expect(400);
    },
  );
  it('rejeita saltos, retrocessos e repetição sem alterar dados/histórico', async () => {
    const row = await application();
    for (const status of ['RECEIVED', 'INTERVIEW', 'SHORTLISTED', 'APPROVED'])
      await transition(row.id, 1, status).expect(400);
    await transition(row.id, 1, 'SCREENING').expect(200);
    await transition(row.id, 2, 'RECEIVED').expect(400);
    await transition(row.id, 1, 'SHORTLISTED').expect(409);
    expect(await db.applicationStageHistory.count({ where: { applicationId: row.id } })).toBe(2);
    expect((await staff('get', path(row.id)).expect(200)).body.version).toBe(2);
  });
  it('aceita exatamente uma decisão concorrente na mesma versão', async () => {
    const row = await application();
    const results = await Promise.all(
      Array.from({ length: 6 }, (_, i) => transition(row.id, 1, i % 2 ? 'SCREENING' : 'REJECTED')),
    );
    expect(results.map((response) => response.status).sort()).toEqual([
      200, 409, 409, 409, 409, 409,
    ]);
    expect(await db.applicationStageHistory.count({ where: { applicationId: row.id } })).toBe(2);
    expect(
      await db.auditLog.count({ where: { entityId: row.id, action: 'APPLICATION_STAGE_CHANGED' } }),
    ).toBe(1);
  });
  it('candidato recebe somente histórico público próprio, sem autor, justificativa ou notas', async () => {
    const row = await application();
    await transition(row.id, 1, 'SCREENING', {
      publicMessage: 'Seu perfil está em análise.',
    }).expect(200);
    await staff('post', path(row.id, '/notes'))
      .send({ body: 'NOTA PRIVADA EXCLUSIVA DO RH' })
      .expect(201);
    const history = await api()
      .get(`/api/applications/me/${row.id}/history`)
      .set('Cookie', users.alpha!.cookie)
      .expect(200);
    expect(history.body.items[0]).toMatchObject({
      toStatus: 'SCREENING',
      publicMessage: 'Seu perfil está em análise.',
    });
    for (const item of history.body.items)
      expect(Object.keys(item).sort()).toEqual(
        ['id', 'fromStatus', 'toStatus', 'version', 'createdAt', 'publicMessage'].sort(),
      );
    expect(JSON.stringify(history.body)).not.toMatch(
      /NOTA PRIVADA|confidencial|actor|internalReason|password|email/,
    );
    await api()
      .get(`/api/applications/me/${row.id}/history`)
      .set('Cookie', users.beta!.cookie)
      .expect(404);
    await api().get(`/api/applications/me/${row.id}/history`).expect(401);
    await staff('get', `/api/applications/me/${row.id}/history`).expect(403);
  });
  it('notas independentes são persistidas, paginadas, auditadas e isoladas por candidatura', async () => {
    const row = await application();
    const other = await application();
    for (let i = 0; i < 3; i++)
      await staff('post', path(row.id, '/notes'), 'admin')
        .send({ body: `  Nota interna ${i}  ` })
        .expect(201);
    const notes = await staff('get', path(row.id, '/notes?pageSize=2')).expect(200);
    expect(notes.body.total).toBe(3);
    expect(notes.body.items[0]).toMatchObject({
      body: 'Nota interna 2',
      actor: { id: users.admin!.id },
    });
    const last = await staff('get', path(row.id, '/notes?pageSize=2&page=2')).expect(200);
    expect(last.body.items).toHaveLength(1);
    expect((await staff('get', path(other.id, '/notes')).expect(200)).body.total).toBe(0);
    expect((await staff('get', path(row.id)).expect(200)).body.version).toBe(1);
    expect(
      await db.auditLog.count({ where: { entityId: row.id, action: 'APPLICATION_NOTE_ADDED' } }),
    ).toBe(3);
  });
  it('valida campos, tamanhos, UUIDs, origem, versões e paginação', async () => {
    const row = await application();
    for (const extra of [
      { internalReason: '   ' },
      { internalReason: 'x'.repeat(2001) },
      { publicMessage: 'x'.repeat(2001) },
      { version: 0 },
      { version: '1' },
      { status: 'FORGED' },
      { actorId: users.admin!.id },
    ])
      await transition(row.id, 1, 'SCREENING', extra).expect(400);
    for (const data of [{ body: ' ' }, { body: 'x'.repeat(2001) }, { body: 'Ok', public: true }])
      await staff('post', path(row.id, '/notes')).send(data).expect(400);
    await api()
      .patch(path(row.id, '/stage'))
      .set('Cookie', users.rh!.cookie)
      .send({ version: 1, status: 'SCREENING', internalReason: 'Teste' })
      .expect(403);
    await staff('post', path(row.id, '/notes'))
      .set('Origin', 'https://origem-invalida.test')
      .send({ body: 'Teste' })
      .expect(403);
    for (const suffix of [
      '/history?page=0',
      '/history?pageSize=51',
      '/notes?page=0',
      '/notes?forged=true',
    ])
      await staff('get', path(row.id, suffix)).expect(400);
    await staff('get', path('invalid')).expect(400);
    await transition(randomUUID(), 1, 'SCREENING').expect(404);
  });
  it('filtra etapas por vaga e no portal com estado persistido', async () => {
    const row = await application();
    await transition(row.id, 1, 'SCREENING').expect(200);
    const query = `?jobId=${row.job.id}&status=SCREENING`;
    expect(
      (await staff('get', '/api/management/applications' + query).expect(200)).body.total,
    ).toBe(1);
    expect(
      (
        await staff(
          'get',
          '/api/management/applications' + query.replace('SCREENING', 'RECEIVED'),
        ).expect(200)
      ).body.total,
    ).toBe(0);
    const own = await api()
      .get('/api/applications/me' + query)
      .set('Cookie', users.alpha!.cookie)
      .expect(200);
    expect(own.body.items[0]).toMatchObject({ status: 'SCREENING', version: 2 });
    await staff('get', '/api/management/applications?status=FORGED').expect(400);
  });
  it('bloqueia acesso RH a candidato inativo sem gravar notas/etapas', async () => {
    const row = await application('beta');
    await db.user.update({ where: { id: users.beta!.id }, data: { active: false } });
    try {
      for (const suffix of ['', '/history', '/notes'])
        await staff('get', path(row.id, suffix)).expect(404);
      await transition(row.id, 1, 'SCREENING').expect(404);
      await staff('post', path(row.id, '/notes')).send({ body: 'Nota' }).expect(404);
      expect(await db.applicationStageHistory.count({ where: { applicationId: row.id } })).toBe(1);
    } finally {
      await db.user.update({ where: { id: users.beta!.id }, data: { active: true } });
    }
  });
});
