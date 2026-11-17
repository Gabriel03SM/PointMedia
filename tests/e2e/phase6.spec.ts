import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import {
  DEFAULT_SCREENING_SETTINGS,
  PROCESS_CONSENT_VERSION,
  PROFILE_FIELDS,
} from '@pointmedia/shared';
import { about, fixture, password, publishedJob } from './fixtures';

test('RH consulta indicadores reais por vaga, ranking, filtro, CSV e IA desativada', async ({
  page,
  request,
  baseURL,
}) => {
  const { job, admin } = await publishedJob(request, baseURL!);
  const email = `rh-metricas-${randomUUID()}@example.test`;
  expect(
    (
      await request.post('/api/users/recruiters', {
        headers: admin.headers,
        data: { name: 'RH dos indicadores', email, password, jobTitle: 'Recrutamento' },
      })
    ).status(),
  ).toBe(201);
  const candidate = await fixture(request, baseURL!);
  expect(
    (
      await request.post('/api/auth/login', {
        headers: candidate.headers,
        data: { email: candidate.email, password },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await request.put('/api/candidates/me/profile', {
        headers: candidate.headers,
        data: {
          version: 0,
          name: 'Pessoa Métricas Browser',
          headline: 'Perfil para indicadores',
          about,
          skills: ['React'],
          experience: [],
          education: [],
          notApplicable: PROFILE_FIELDS.filter((field) => field !== 'SKILLS'),
          shareWithRecruiters: false,
        },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await request.post('/api/applications', {
        headers: candidate.headers,
        data: {
          jobId: job.id,
          processConsent: true,
          processConsentVersion: PROCESS_CONSENT_VERSION,
          talentPoolConsent: false,
        },
      })
    ).status(),
  ).toBe(200);
  await page.goto('/entrar');
  await page.getByLabel('e-mail', { exact: true }).fill(email);
  await page.getByLabel('senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'entrar', exact: true }).click();
  const nav = page.getByRole('navigation', { name: 'Recrutamento', exact: true });
  await expect(nav.getByRole('link', { name: 'dashboard', exact: true })).toBeVisible();
  expect(
    (
      await page.request.put(`/api/screening/jobs/${job.id}/configuration`, {
        headers: admin.headers,
        data: { ...DEFAULT_SCREENING_SETTINGS, version: 0 },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await page.request.post(`/api/screening/jobs/${job.id}/runs`, {
        headers: admin.headers,
        data: { configurationVersion: 1, jobVersion: job.version },
      })
    ).status(),
  ).toBe(201);
  await nav.getByRole('link', { name: 'dashboard', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Dashboard - Recrutamento', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Vaga dos indicadores').selectOption(job.id);
  await page.getByLabel('Período dos indicadores').selectOption('7');
  const card = page
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { name: 'candidaturas no período', exact: true }) });
  await expect(card.getByText('1', { exact: true })).toBeVisible();
  await expect(page.getByRole('progressbar', { name: '90 a 100', exact: true })).toHaveAttribute(
    'value',
    '1',
  );
  await expect(page.getByText('Nenhum provedor de IA configurado.', { exact: true })).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Exportar CSV', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('pointmedia-indicadores.csv');
  const csv = await readFile((await download.path())!, 'utf8');
  expect(csv).toContain('"applications","1"');
  expect(csv).not.toContain(candidate.email);
  await page.screenshot({ path: '.tmp/phase6-recruitment-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 375, height: 812 });
  const title = await page
    .getByRole('heading', { name: 'Dashboard - Recrutamento', exact: true })
    .boundingBox();
  const period = await page.getByLabel('Período dos indicadores').boundingBox();
  expect(period!.y).toBeGreaterThanOrEqual(title!.y + title!.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '.tmp/phase6-recruitment-mobile.png', fullPage: true });
  expect((await page.request.get('/api/analytics/administration')).status()).toBe(403);
  expect((await request.get('/api/analytics/recruitment')).status()).toBe(403);
  await page.goto('/admin/metricas');
  await expect(page).toHaveURL(/\/perfil$/);
});

test('Admin usa dashboard e métricas com agregados e estados vazios reais', async ({
  page,
  request,
  baseURL,
}) => {
  const admin = await fixture(request, baseURL!, true);
  await page.goto('/entrar');
  await page.getByLabel('e-mail', { exact: true }).fill(admin.email);
  await page.getByLabel('senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'entrar', exact: true }).click();
  const nav = page.getByRole('navigation', { name: 'Administração', exact: true });
  const loaded = page.waitForResponse(
    (response) =>
      response.url().includes('/api/analytics/administration?days=7') && response.status() === 200,
  );
  await nav.getByRole('link', { name: 'dashboard', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Dashboard Administrativo', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('table')).toContainText('Administradores');
  const real = await (await loaded).json();
  const active = page
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { name: 'usuários ativos', exact: true }) });
  await expect(active.getByText(String(real.activeUsers), { exact: true })).toBeVisible();
  await page.screenshot({ path: '.tmp/phase6-administration-desktop.png', fullPage: true });
  await nav.getByRole('link', { name: 'métricas', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Métricas gerais', exact: true })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Funil de acompanhamento', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      'Selecione uma vaga para consultar sua compatibilidade. Scores de vagas diferentes não são comparados.',
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByLabel('Período dos indicadores').selectOption('90');
  await expect(
    page.getByRole('heading', { name: 'Evolução mensal das candidaturas', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: '.tmp/phase6-metrics-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 375, height: 812 });
  const title = await page
    .getByRole('heading', { name: 'Métricas gerais', exact: true })
    .boundingBox();
  const period = await page.getByLabel('Período dos indicadores').boundingBox();
  expect(period!.y).toBeGreaterThanOrEqual(title!.y + title!.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '.tmp/phase6-metrics-mobile.png', fullPage: true });
});
