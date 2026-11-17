import { expect, type APIRequestContext } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import type { Job, JobInput } from '@pointmedia/shared';

export const password = 'Senha fictícia para o navegador';
export const about =
  'Perfil fictício usado exclusivamente na verificação do portal de candidatos. Experiência declarada em desenvolvimento de software, comunicação e colaboração com equipes multidisciplinares.';
export async function fixture(_request: APIRequestContext, baseURL: string, admin = false) {
  const email = `phase2-${randomUUID()}@example.test`;
  const headers = { 'X-Pointmedia-Request': '1', Origin: new URL(baseURL).origin };
  const user = { id: randomUUID() };
  if (
    process.env.NODE_ENV !== 'test' ||
    !new URL(process.env.DATABASE_URL!).pathname.endsWith('_test')
  )
    throw new Error('Fixture exige banco de teste.');
  const requireApi = createRequire(resolve('apps/api/package.json'));
  const { Client } = requireApi('pg') as typeof import('pg');
  const { PasswordService } = requireApi('./dist/auth/password.service.js') as {
    PasswordService: new () => { hash(value: string): Promise<string> };
  };
  const passwordHash = await new PasswordService().hash(password);
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(
      'INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "updatedAt") VALUES ($1::uuid, $2, $3, $4, $5::"Role", now())',
      [user.id, 'Pessoa Fictícia Browser', email, passwordHash, admin ? 'ADMIN' : 'CANDIDATE'],
    );
  } finally {
    await client.end();
  }
  return { email, id: user.id, headers };
}

export async function publishedJob(
  request: APIRequestContext,
  baseURL: string,
  overrides: Partial<JobInput> = {},
) {
  const admin = await fixture(request, baseURL, true);
  expect(
    (
      await request.post('/api/auth/login', {
        headers: admin.headers,
        data: { email: admin.email, password },
      })
    ).status(),
  ).toBe(200);
  const draft = await request.post('/api/management/jobs', {
    headers: admin.headers,
    data: {
      title: `Vaga Browser ${randomUUID()}`,
      description: 'Vaga fictícia para verificar funcionalidades reais no navegador.',
      workMode: 'REMOTE',
      seniorityNotApplicable: true,
      locationNotApplicable: true,
      salaryNotApplicable: true,
      closesAt: new Date(Date.now() + 86400000).toISOString(),
      requiredSkills: ['React'],
      desiredSkills: [],
      ...overrides,
    },
  });
  expect(draft.status()).toBe(201);
  const row = (await draft.json()) as Job;
  const published = await request.patch(`/api/management/jobs/${row.id}/status`, {
    headers: admin.headers,
    data: { status: 'PUBLISHED', version: row.version },
  });
  expect(published.status()).toBe(200);
  return { admin, job: (await published.json()) as Job };
}
