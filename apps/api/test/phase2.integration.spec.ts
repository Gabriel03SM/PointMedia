import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { PROFILE_FIELDS } from '@pointmedia/shared';
import { createApp } from '../src/app';
import { environmentSchema } from '../src/config';
import { PrismaService } from '../src/database/prisma.service';
import { PasswordService } from '../src/auth/password.service';
import { ResumesService } from '../src/candidates/resumes.service';
import { sampleDocx, samplePdf } from './resume-fixtures';

describe('Fase 2 com HTTP e PostgreSQL reais', () => {
  let app: INestApplication;
  let db: PrismaService;
  const tag = randomUUID();
  const domain = `@${tag}.example.test`;
  const headers = { 'X-Pointmedia-Request': '1', Origin: 'http://localhost:5173' };
  const password = 'senha fictícia de integração';
  let adminCookie: string;
  let candidateCookie: string;
  let otherCookie: string;
  let candidateId: string;
  let jobId: string;
  const job = {
    title: `Desenvolvedor ${tag}`,
    description: 'Descrição completa da vaga fictícia para integração.',
    workMode: 'REMOTE',
    seniorityNotApplicable: true,
    locationNotApplicable: true,
    salaryNotApplicable: true,
    requiredSkills: ['React'],
    desiredSkills: ['Testes'],
    closesAt: new Date(Date.now() + 86400000).toISOString(),
  };
  const professional = {
    version: 0,
    name: `Candidato Fictício ${tag}`,
    phone: '+55 11 99999-0000',
    headline: 'Desenvolvimento web',
    about:
      'Perfil profissional fictício criado exclusivamente para verificar integração e persistência. Experiência declarada em desenvolvimento web e comunicação com equipes de produto.',
    skills: [],
    experience: [],
    education: [],
    notApplicable: [...PROFILE_FIELDS],
    shareWithRecruiters: false,
  };
  const cookie = (response: request.Response) => {
    const values = response.headers['set-cookie'] as unknown as string[];
    return values[0]!.split(';')[0]!;
  };
  const api = () => request(app.getHttpServer());
  beforeAll(async () => {
    const config = environmentSchema.parse(process.env);
    if (config.NODE_ENV !== 'test' || !new URL(config.DATABASE_URL).pathname.endsWith('_test'))
      throw new Error('Banco isolado obrigatório.');
    app = await createApp(config, 1000);
    db = app.get(PrismaService);
    const passwordHash = await new PasswordService().hash(password);
    await db.user.createMany({
      data: [
        { name: 'Admin Integração', email: `admin${domain}`, passwordHash, role: 'ADMIN' },
        {
          name: 'Candidato Integração',
          email: `candidate${domain}`,
          passwordHash,
          role: 'CANDIDATE',
        },
        { name: 'Outro Candidato', email: `other${domain}`, passwordHash, role: 'CANDIDATE' },
      ],
    });
    const login = (label: string) =>
      api()
        .post('/api/auth/login')
        .set(headers)
        .send({ email: `${label}${domain}`, password })
        .expect(200);
    adminCookie = cookie(await login('admin'));
    candidateCookie = cookie(await login('candidate'));
    otherCookie = cookie(await login('other'));
    candidateId = (await db.user.findUniqueOrThrow({ where: { email: `candidate${domain}` } })).id;
  });
  afterAll(async () => {
    if (db) {
      const users = await db.user.findMany({
        where: { email: { endsWith: domain } },
        select: { id: true },
      });
      const ids = users.map((item) => item.id);
      const jobs = await db.jobOpening.findMany({
        where: { createdById: { in: ids } },
        select: { id: true },
      });
      const files = await db.resumeFile.findMany({ where: { userId: { in: ids } } });
      for (const file of files) await app.get(ResumesService).removeStored(file.storageKey);
      await db.auditLog.deleteMany({
        where: {
          OR: [
            { actorId: { in: ids } },
            { entityId: { in: [...ids, ...jobs.map((item) => item.id)] } },
          ],
        },
      });
      await db.jobOpening.deleteMany({ where: { id: { in: jobs.map((item) => item.id) } } });
      await db.user.deleteMany({ where: { id: { in: ids } } });
    }
    if (app) await app.close();
  });

  it('protege a gestão e permite consulta pública sem sessão', async () => {
    await api().get('/api/management/jobs').expect(401);
    await api().get('/api/management/jobs').set('Cookie', candidateCookie).expect(403);
    await api().get('/api/jobs').expect(200);
    await api().get('/api/jobs?page=0').expect(400);
  });
  it('cria rascunho com Não se aplica persistido e sem exposição pública', async () => {
    const response = await api()
      .post('/api/management/jobs')
      .set(headers)
      .set('Cookie', adminCookie)
      .send(job)
      .expect(201);
    jobId = response.body.id as string;
    expect(response.body.status).toBe('DRAFT');
    expect(response.body.salaryMin).toBeNull();
    expect(response.body.requiredSkills).toEqual(['React']);
    await api().get(`/api/jobs/${jobId}`).expect(404);
    expect(await db.auditLog.count({ where: { entityId: jobId, action: 'JOB_CREATED' } })).toBe(1);
  });
  it('rejeita ausência silenciosa, valores contraditórios, duplicidade e escalada de campos', async () => {
    const create = (body: object) =>
      api().post('/api/management/jobs').set(headers).set('Cookie', adminCookie).send(body);
    await create({ ...job, salaryNotApplicable: false }).expect(400);
    await create({ ...job, salaryMin: '1000', salaryMax: '2000' }).expect(400);
    await create({
      ...job,
      salaryNotApplicable: false,
      salaryMin: '2000',
      salaryMax: '1000',
    }).expect(400);
    await create({ ...job, requiredSkills: ['React', 'react'] }).expect(400);
    await create({ ...job, requiredSkills: ['ﬃ'.repeat(80)] }).expect(400);
    await create({ ...job, createdById: candidateId }).expect(400);
  });
  it('edita com versão e publica somente com prazo futuro', async () => {
    await api()
      .put(`/api/management/jobs/${jobId}`)
      .set(headers)
      .set('Cookie', adminCookie)
      .send({ ...job, version: 1, department: 'Tecnologia' })
      .expect(200);
    await api()
      .put(`/api/management/jobs/${jobId}`)
      .set(headers)
      .set('Cookie', adminCookie)
      .send({ ...job, version: 1 })
      .expect(409);
    await api()
      .patch(`/api/management/jobs/${jobId}/status`)
      .set(headers)
      .set('Cookie', adminCookie)
      .send({ status: 'PUBLISHED', version: 2 })
      .expect(200);
    const response = await api().get('/api/jobs').query({ q: tag }).expect(200);
    expect(response.body.total).toBe(1);
    expect(response.body.items[0]).not.toHaveProperty('createdById');
  });
  it('respeita encerramento por prazo, transições e cancelamento lógico', async () => {
    await db.jobOpening.update({
      where: { id: jobId },
      data: { closesAt: new Date(Date.now() - 1000) },
    });
    const list = await api().get('/api/jobs').query({ q: tag }).expect(200);
    expect(list.body.total).toBe(0);
    const detail = await api().get(`/api/jobs/${jobId}`).expect(200);
    expect(detail.body.effectiveStatus).toBe('CLOSED');
    await api()
      .put(`/api/management/jobs/${jobId}`)
      .set(headers)
      .set('Cookie', adminCookie)
      .send({ ...job, version: 3 })
      .expect(409);
    await api()
      .patch(`/api/management/jobs/${jobId}/status`)
      .set(headers)
      .set('Cookie', adminCookie)
      .send({ status: 'CLOSED', version: 3 })
      .expect(200);
    await api()
      .patch(`/api/management/jobs/${jobId}/status`)
      .set(headers)
      .set('Cookie', adminCookie)
      .send({ status: 'PUBLISHED', version: 4 })
      .expect(400);
    await api()
      .delete(`/api/management/jobs/${jobId}`)
      .set(headers)
      .set('Cookie', adminCookie)
      .send({ version: 4 })
      .expect(200);
    await api().get(`/api/jobs/${jobId}`).expect(404);
    expect((await db.jobOpening.findUniqueOrThrow({ where: { id: jobId } })).status).toBe(
      'CANCELLED',
    );
  });
  it('cria perfil próprio e exige valores ou Não se aplica', async () => {
    await api()
      .get('/api/candidates/me/profile')
      .set('Cookie', candidateCookie)
      .expect(200, { profile: null });
    await api()
      .put('/api/candidates/me/profile')
      .set(headers)
      .set('Cookie', candidateCookie)
      .send({ ...professional, notApplicable: [] })
      .expect(400);
    const saved = await api()
      .put('/api/candidates/me/profile')
      .set(headers)
      .set('Cookie', candidateCookie)
      .send(professional)
      .expect(200);
    expect(saved.body.userId).toBe(candidateId);
    expect(saved.body.notApplicable).toContain('SALARY');
    expect(saved.body).not.toHaveProperty('passwordHash');
    await api()
      .get(`/api/candidates/${candidateId}/profile`)
      .set('Cookie', adminCookie)
      .expect(404);
    await api()
      .get(`/api/candidates/${candidateId}/profile`)
      .set('Cookie', otherCookie)
      .expect(403);
  });
  it('impede sobrescrita, campos desconhecidos e datas incoerentes', async () => {
    const save = (body: object) =>
      api()
        .put('/api/candidates/me/profile')
        .set(headers)
        .set('Cookie', candidateCookie)
        .send(body);
    await save(professional).expect(409);
    await save({ ...professional, version: 1, userId: randomUUID() }).expect(400);
    await save({
      ...professional,
      version: 1,
      notApplicable: professional.notApplicable.filter((item) => item !== 'EXPERIENCE'),
      experience: [
        {
          company: 'Teste',
          position: 'Teste',
          startedMonth: '2024-05',
          endedMonth: '2023-01',
          description: '',
        },
      ],
    }).expect(400);
  });
  it('compartilha perfil por escolha explícita, com busca paginada restrita', async () => {
    await api()
      .put('/api/candidates/me/profile')
      .set(headers)
      .set('Cookie', candidateCookie)
      .send({
        ...professional,
        version: 1,
        shareWithRecruiters: true,
        seniority: 'JUNIOR',
        skills: ['React'],
        notApplicable: professional.notApplicable.filter(
          (item) => item !== 'SENIORITY' && item !== 'SKILLS',
        ),
      })
      .expect(200);
    await api()
      .get(`/api/candidates/${candidateId}/profile`)
      .set('Cookie', adminCookie)
      .expect(200);
    await api().get('/api/candidates').set('Cookie', candidateCookie).expect(403);
    const page = await api()
      .get('/api/candidates')
      .query({ q: tag, pageSize: 1 })
      .set('Cookie', adminCookie)
      .expect(200);
    expect(page.body.items.some((item: { userId: string }) => item.userId === candidateId)).toBe(
      true,
    );
    const filtered = await api()
      .get('/api/candidates')
      .query({ q: tag, skill: 'react', seniority: 'JUNIOR', sort: 'name' })
      .set('Cookie', adminCookie)
      .expect(200);
    expect(filtered.body.total).toBe(1);
    const unmatched = await api()
      .get('/api/candidates')
      .query({ q: tag, seniority: 'SENIOR' })
      .set('Cookie', adminCookie)
      .expect(200);
    expect(unmatched.body.total).toBe(0);
  });
  it('faz upload privado, mantém metadados seguros e autoriza download', async () => {
    const response = await api()
      .post('/api/candidates/me/resume')
      .set(headers)
      .set('Cookie', candidateCookie)
      .attach('file', samplePdf, { filename: 'curriculo.pdf', contentType: 'application/pdf' })
      .expect(201);
    expect(response.body.originalName).toBe('curriculo.pdf');
    expect(response.body).not.toHaveProperty('storageKey');
    expect(response.body).not.toHaveProperty('sha256');
    await api().get('/api/candidates/me/resume').expect(401);
    await api().get('/api/candidates/me/resume').set('Cookie', otherCookie).expect(404);
    const download = await api()
      .get('/api/candidates/me/resume')
      .set('Cookie', candidateCookie)
      .expect(200);
    expect(download.headers['content-disposition']).toContain('attachment;');
    expect(download.headers['cache-control']).toBe('no-store');
    expect(download.body).toEqual(samplePdf);
    await api().get(`/api/candidates/${candidateId}/resume`).set('Cookie', adminCookie).expect(200);
    expect(
      await db.auditLog.count({
        where: { entityId: response.body.id as string, action: 'RESUME_DOWNLOAD_STARTED' },
      }),
    ).toBe(2);
    await api().get(`/api/candidates/${candidateId}/resume`).set('Cookie', otherCookie).expect(403);
  });
  it('recusa uploads sem proteção, falsos, com campos extras ou excessivos', async () => {
    await api()
      .post('/api/candidates/me/resume')
      .set('Cookie', candidateCookie)
      .attach('file', samplePdf, { filename: 'cv.pdf', contentType: 'application/pdf' })
      .expect(403);
    await api()
      .post('/api/candidates/me/resume')
      .set(headers)
      .set('Cookie', candidateCookie)
      .attach('file', Buffer.from('PK fake'), {
        filename: 'cv.docx',
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
      .expect(400);
    await api()
      .post('/api/candidates/me/resume')
      .set(headers)
      .set('Cookie', candidateCookie)
      .field('unexpected', 'value')
      .attach('file', samplePdf, { filename: 'cv.pdf', contentType: 'application/pdf' })
      .expect(400);
    await api()
      .post('/api/candidates/me/resume')
      .set(headers)
      .set('Cookie', candidateCookie)
      .attach('file', Buffer.alloc(5 * 1024 * 1024 + 1), {
        filename: 'cv.pdf',
        contentType: 'application/pdf',
      })
      .expect(413);
  });
  it('substitui PDF por DOCX válido sem publicar o arquivo', async () => {
    const docx = sampleDocx();
    await api()
      .post('/api/candidates/me/resume')
      .set(headers)
      .set('Cookie', candidateCookie)
      .attach('file', docx, {
        filename: 'curriculo.docx',
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
      .expect(201);
    const profile = await api()
      .get('/api/candidates/me/profile')
      .set('Cookie', candidateCookie)
      .expect(200);
    expect(profile.body.profile.resume.originalName).toBe('curriculo.docx');
    const stored = await db.resumeFile.findUniqueOrThrow({ where: { userId: candidateId } });
    await api().get(`/.local/resumes/${stored.storageKey}`).expect(404);
  });
  it('revoga compartilhamento e permite remover currículo e perfil sem excluir a conta', async () => {
    await api()
      .put('/api/candidates/me/profile')
      .set(headers)
      .set('Cookie', candidateCookie)
      .send({ ...professional, version: 2 })
      .expect(200);
    await api()
      .get(`/api/candidates/${candidateId}/profile`)
      .set('Cookie', adminCookie)
      .expect(404);
    await api().get(`/api/candidates/${candidateId}/resume`).set('Cookie', adminCookie).expect(404);
    await api().get('/api/candidates/me/resume').set('Cookie', candidateCookie).expect(200);
    await api()
      .delete('/api/candidates/me/resume')
      .set(headers)
      .set('Cookie', candidateCookie)
      .expect(204);
    await api().get('/api/candidates/me/resume').set('Cookie', candidateCookie).expect(404);
    await api()
      .delete('/api/candidates/me/profile')
      .set(headers)
      .set('Cookie', candidateCookie)
      .send({ version: 3 })
      .expect(204);
    await api()
      .get('/api/candidates/me/profile')
      .set('Cookie', candidateCookie)
      .expect(200, { profile: null });
    await api().get('/api/users/me').set('Cookie', candidateCookie).expect(200);
  });
});
