import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { fixture, password as fixturePassword } from './fixtures';

test('entrada pública sem sessão, navegação para login e perfil restrito', async ({ page }) => {
  const sessionRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/users/me') sessionRequests.push(request.url());
  });
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Conecte seu talento à comunicação do futuro' }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  expect(sessionRequests).toHaveLength(0);
  await page.getByRole('link', { name: 'Ver vagas abertas' }).click();
  await expect(page).toHaveURL(/\/vagas$/);
  await expect(page.getByRole('heading', { name: 'Vagas disponíveis' })).toBeVisible();
  expect(sessionRequests).toHaveLength(0);
  await page.getByRole('link', { name: 'Banco de talentos', exact: true }).click();
  await expect(page).toHaveURL(/\/banco-de-talentos$/);
  await expect(page.getByRole('heading', { name: 'Cadastro no banco de talentos' })).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('link', { name: 'login', exact: true }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  await page.getByRole('link', { name: 'Voltar para a página inicial' }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto('/perfil');
  await expect(page).toHaveURL(/\/entrar$/);
  const privateAccount = await page.request.get('/api/users/me');
  expect(privateAccount.status()).toBe(401);
});

test('conta existente: login, persistência após recarga, edição e logout', async ({
  page,
  request,
  baseURL,
}) => {
  const { email } = await fixture(request, baseURL!);
  const password = fixturePassword;
  await page.goto('/perfil');
  await expect(page).toHaveURL(/\/entrar$/);
  await page.getByLabel('e-mail', { exact: true }).fill(email);
  await page.getByLabel('senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Portal do candidato' })).toBeVisible();
  await page.goto('/perfil');
  await expect(page.getByRole('heading', { name: 'Meu perfil' })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue(email);
  await page.getByLabel('Nome', { exact: true }).fill('Pessoa Atualizada Browser');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByRole('status')).toHaveText('Alterações salvas.');
  await page.reload();
  await expect(page.getByLabel('Nome', { exact: true })).toHaveValue('Pessoa Atualizada Browser');
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  await page.getByRole('button', { name: 'sair da conta' }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  const me = await page.request.get('/api/users/me');
  expect(me.status()).toBe(401);
});

test('login utilizável em viewport móvel sem overflow horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/entrar');
  await expect(page.getByRole('heading', { name: 'realizar login' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByLabel('e-mail', { exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('senha', { exact: true })).toBeFocused();
});

test('Admin e RH têm menus próprios e criação de recrutador restrita ao administrador', async ({
  page,
  request,
  baseURL,
}) => {
  const admin = await fixture(request, baseURL!, true);
  const recruiterEmail = `rh-${randomUUID()}@example.test`;
  expect(
    (
      await request.post('/api/auth/login', {
        headers: admin.headers,
        data: { email: admin.email, password: fixturePassword },
      })
    ).status(),
  ).toBe(200);
  const recruiter = await request.post('/api/users/recruiters', {
    headers: admin.headers,
    data: {
      name: 'RH de verificação de acesso',
      email: recruiterEmail,
      password: fixturePassword,
      jobTitle: 'Recrutamento e seleção',
    },
  });
  expect(recruiter.status()).toBe(201);
  expect((await recruiter.json()).role).toBe('RECRUITER');

  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/entrar');
  await page.getByLabel('e-mail', { exact: true }).fill(admin.email);
  await page.getByLabel('senha', { exact: true }).fill(fixturePassword);
  await page.getByRole('button', { name: 'entrar', exact: true }).click();
  const administration = page.getByRole('navigation', { name: 'Administração', exact: true });
  await expect(administration).toBeVisible();
  for (const label of ['dashboard', 'métricas', 'usuários', 'logs', 'sistema'])
    await expect(administration.getByText(label, { exact: true })).toBeVisible();
  for (const label of ['candidatos', 'triagem', 'talentos', 'vagas'])
    await expect(administration.getByText(label, { exact: true })).toHaveCount(0);
  expect((await page.request.get('/api/management/jobs')).status()).toBe(200);

  await page.getByRole('button', { name: 'sair da conta', exact: true }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  await page.getByLabel('e-mail', { exact: true }).fill(recruiterEmail);
  await page.getByLabel('senha', { exact: true }).fill(fixturePassword);
  await page.getByRole('button', { name: 'entrar', exact: true }).click();
  const recruitment = page.getByRole('navigation', { name: 'Recrutamento', exact: true });
  await expect(recruitment).toBeVisible();
  for (const label of ['candidatos', 'triagem', 'talentos', 'vagas'])
    await expect(recruitment.getByRole('link', { name: label, exact: true })).toBeVisible();
  for (const label of ['métricas', 'usuários', 'logs', 'sistema'])
    await expect(recruitment.getByText(label, { exact: true })).toHaveCount(0);
  expect(
    (
      await page.request.post('/api/users/recruiters', {
        headers: admin.headers,
        data: {},
      })
    ).status(),
  ).toBe(403);
  await recruitment.getByRole('link', { name: 'triagem', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Triagem e decisões', exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
