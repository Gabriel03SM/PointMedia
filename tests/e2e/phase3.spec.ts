import { expect, test, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { PROCESS_CONSENT_VERSION } from '@pointmedia/shared';
import { samplePdf } from '../../apps/api/test/resume-fixtures';
import { about, fixture, password, publishedJob } from './fixtures';

async function register(page: Page) {
  const name = `Pessoa Fase Três ${randomUUID()}`;
  await page.getByLabel('Nome *', { exact: true }).fill(name);
  await page.getByLabel('Email', { exact: true }).fill(`phase3-${randomUUID()}@example.test`);
  await page.getByLabel('Senha para sua conta *', { exact: true }).fill(password);
  expect(
    (
      await page.request.post('/api/auth/login', {
        headers: { 'X-Pointmedia-Request': '1', Origin: new URL(page.url()).origin },
        data: { email: await page.getByLabel('Email', { exact: true }).inputValue(), password },
      })
    ).status(),
  ).toBe(401);
  await expect(page.getByLabel('Área ou título profissional *', { exact: true })).toBeVisible();
  return name;
}
async function fillProfile(page: Page) {
  await page
    .getByLabel('Área ou título profissional *', { exact: true })
    .fill('Desenvolvimento de software');
  for (const label of [
    'Localização',
    'Senioridade',
    'Pretensão salarial',
    'LinkedIn',
    'Portfólio',
    'Experiência profissional',
    'Formação acadêmica',
  ])
    await page.getByRole('checkbox', { name: `${label}: Não se aplica`, exact: true }).check();
  await page
    .getByRole('textbox', { name: 'Ferramentas que domina', exact: true })
    .fill('React, TypeScript');
  await page.getByLabel('Conte sobre você *', { exact: true }).fill(about);
}

test('visitante cria conta com senha, retorna à vaga, envia e recupera o comprovante', async ({
  page,
  request,
  baseURL,
  browser,
}) => {
  const { job, admin } = await publishedJob(request, baseURL!);
  await page.goto(`/vagas/${job.id}`);
  await register(page);
  await expect(page).toHaveURL(new RegExp(`/vagas/${job.id}$`));
  await fillProfile(page);
  await page.getByLabel('Anexar currículo', { exact: true }).setInputFiles({
    name: 'cv-candidatura.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('arquivo falso'),
  });
  await page.getByRole('button', { name: 'Enviar candidatura', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Autorize a participação nesta vaga.');
  await page.getByRole('checkbox', { name: /Autorizo disponibilizar meus dados/ }).check();
  await page.getByRole('button', { name: 'Enviar candidatura', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(/PDF|arquivo|Arquivo/);
  expect((await page.request.get('/api/users/me')).status()).toBe(401);
  expect(
    (
      await page.request.post('/api/auth/login', {
        headers: { 'X-Pointmedia-Request': '1', Origin: new URL(page.url()).origin },
        data: { email: await page.getByLabel('Email', { exact: true }).inputValue(), password },
      })
    ).status(),
  ).toBe(401);
  await page
    .getByLabel('Anexar currículo', { exact: true })
    .setInputFiles({ name: 'cv-candidatura.pdf', mimeType: 'application/pdf', buffer: samplePdf });
  await page.getByRole('button', { name: 'Enviar candidatura', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Sua candidatura foi enviada com sucesso!' }),
  ).toBeVisible();
  const url = page.url();
  const id = /candidaturas\/([^/]+)/.exec(url)![1]!;
  await page.reload();
  await expect(page.getByText(job.title, { exact: true })).toBeVisible();
  await page.screenshot({ path: '.tmp/phase3-confirmation-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: '.tmp/phase3-confirmation-mobile.png', fullPage: true });
  const consent = await page.request.get('/api/talent-pool/me');
  expect((await consent.json()).active).toBe(false);
  const duplicate = await page.request.post('/api/applications', {
    headers: { 'X-Pointmedia-Request': '1', Origin: new URL(baseURL!).origin },
    data: {
      jobId: job.id,
      processConsent: true,
      processConsentVersion: PROCESS_CONSENT_VERSION,
      talentPoolConsent: false,
    },
  });
  expect(duplicate.status()).toBe(200);
  expect((await duplicate.json()).application.id).toBe(id);
  await page.goto('/candidato');
  await expect(page.getByRole('heading', { name: 'Minhas candidaturas' })).toBeVisible();
  await expect(page.getByRole('heading', { name: job.title })).toBeVisible();
  const staff = await request.get(`/api/management/applications?jobId=${job.id}`);
  expect((await staff.json()).total).toBe(1);
  await page.goto(`/vagas/${job.id}`);
  await expect(page.getByRole('link', { name: 'Ver comprovante', exact: true })).toBeVisible();
  const staffContext = await browser.newContext({
    baseURL,
    viewport: { width: 1880, height: 1342 },
  });
  try {
    const staffPage = await staffContext.newPage();
    await staffPage.goto('/entrar');
    await staffPage.getByLabel('e-mail', { exact: true }).fill(admin.email);
    await staffPage.getByLabel('senha', { exact: true }).fill(password);
    await staffPage.getByRole('button', { name: 'entrar', exact: true }).click();
    await expect(staffPage.getByRole('heading', { name: 'Meu perfil', exact: true })).toBeVisible();
    await staffPage.goto(`/gestao/candidatos?vaga=${job.id}`);
    await expect(staffPage.getByRole('heading', { name: job.title, exact: true })).toBeVisible();
    await staffPage.screenshot({ path: '.tmp/phase3-applications.png', fullPage: true });
    await staffPage.getByRole('button', { name: 'Ver perfil', exact: true }).click();
    const modal = staffPage.getByRole('dialog', { name: 'Perfil do candidato' });
    await expect(modal.getByLabel('Modalidade', { exact: true })).toHaveValue('Remoto');
    await expect(
      modal.getByRole('link', { name: 'Baixar currículo', exact: true }),
    ).toHaveAttribute('href', `/api/management/applications/${id}/resume`);
    await staffPage.setViewportSize({ width: 375, height: 812 });
    expect(await modal.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true,
    );
  } finally {
    await staffContext.close();
  }
});

test('prazo muda durante preenchimento: com autorização entra somente no banco', async ({
  page,
  request,
  baseURL,
}) => {
  const { job, admin } = await publishedJob(request, baseURL!);
  await page.goto(`/vagas/${job.id}`);
  await register(page);
  await fillProfile(page);
  await page.getByRole('checkbox', { name: /Autorizo disponibilizar meus dados/ }).check();
  await page.getByRole('checkbox', { name: /Quero participar do banco de talentos/ }).check();
  expect(
    (
      await request.patch(`/api/management/jobs/${job.id}/status`, {
        headers: admin.headers,
        data: { status: 'CLOSED', version: job.version },
      })
    ).status(),
  ).toBe(200);
  await page.getByRole('button', { name: 'Enviar candidatura', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Cadastro no banco de talentos confirmado.');
  const applications = await page.request.get(`/api/applications/me?jobId=${job.id}`);
  expect((await applications.json()).total).toBe(0);
  expect((await (await page.request.get('/api/talent-pool/me')).json()).active).toBe(true);
  await page.screenshot({ path: '.tmp/phase3-late-bank.png', fullPage: true });
});

test('banco independente, consulta RH autorizada e saída voluntária persistente', async ({
  page,
  request,
  baseURL,
  browser,
}) => {
  const admin = await fixture(request, baseURL!, true);
  await page.goto('/');
  await page.getByRole('link', { name: 'Cadastrar no banco de talentos', exact: true }).click();
  const name = await register(page);
  await expect(page).toHaveURL(/\/banco-de-talentos$/);
  await fillProfile(page);
  await page.getByRole('checkbox', { name: /Quero participar do banco de talentos/ }).check();
  await page
    .getByLabel('Anexar currículo', { exact: true })
    .setInputFiles({ name: 'cv-banco.pdf', mimeType: 'application/pdf', buffer: samplePdf });
  await page.screenshot({ path: '.tmp/phase3-bank-form.png', fullPage: true });
  await page.getByRole('button', { name: 'Entrar no banco de talentos', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Cadastro no banco de talentos confirmado.');
  const me = await page.request.get('/api/users/me');
  const userId = (await me.json()).id as string;
  const staffContext = await browser.newContext({ baseURL });
  try {
    const staffPage = await staffContext.newPage();
    await staffPage.goto('/entrar');
    await staffPage.getByLabel('e-mail', { exact: true }).fill(admin.email);
    await staffPage.getByLabel('senha', { exact: true }).fill(password);
    await staffPage.getByRole('button', { name: 'entrar', exact: true }).click();
    await expect(staffPage.getByRole('heading', { name: 'Meu perfil', exact: true })).toBeVisible();
    await staffPage.goto('/gestao/talentos');
    await staffPage.getByLabel('Buscar candidatos', { exact: true }).fill(name);
    await staffPage.getByRole('button', { name: 'Buscar', exact: true }).click();
    await expect(staffPage.getByRole('heading', { name, exact: true })).toBeVisible();
    await staffPage.screenshot({ path: '.tmp/phase3-talents.png', fullPage: true });
    await staffPage.getByRole('button', { name: 'Ver perfil', exact: true }).click();
    const modal = staffPage.getByRole('dialog', { name: 'Perfil do candidato' });
    await expect(
      modal.getByRole('link', { name: 'Baixar currículo', exact: true }),
    ).toHaveAttribute('href', `/api/talent-pool/${userId}/resume`);
    expect((await staffPage.request.get(`/api/talent-pool/${userId}/resume`)).status()).toBe(200);
    await page.goto('/candidato');
    await page.getByRole('button', { name: 'Sair do banco de talentos', exact: true }).click();
    await expect(page.locator('#banco-de-talentos').getByRole('status')).toContainText(
      'Saída confirmada.',
    );
    await page.reload();
    await expect(page.getByText(/Você não participa do banco de talentos/)).toBeVisible();
    expect((await staffPage.request.get(`/api/talent-pool/${userId}/profile`)).status()).toBe(404);
    expect((await staffPage.request.get(`/api/talent-pool/${userId}/resume`)).status()).toBe(404);
    await modal.getByRole('button', { name: 'Fechar perfil' }).click();
    await staffPage.reload();
    await staffPage.getByLabel('Buscar candidatos', { exact: true }).fill(name);
    await staffPage.getByRole('button', { name: 'Buscar', exact: true }).click();
    await expect(
      staffPage.getByText(/Nenhum talento com consentimento ativo encontrado/),
    ).toBeVisible();
    await staffPage.setViewportSize({ width: 375, height: 812 });
    expect(
      await staffPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  } finally {
    await staffContext.close();
  }
});
