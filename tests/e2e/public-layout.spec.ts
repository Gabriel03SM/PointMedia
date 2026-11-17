import { expect, test, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { password, publishedJob } from './fixtures';

async function noHorizontalOverflow(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test('página pública de vagas, retorno do login e detalhes alinhados ao formulário', async ({
  page,
  request,
  baseURL,
}) => {
  const { job } = await publishedJob(request, baseURL!, {
    title: `Oportunidade de comunicação ${randomUUID()}`,
    description:
      'Descrição da oportunidade com responsabilidades, requisitos e informações para a inscrição.',
  });
  await page.goto('/');
  await page.getByRole('link', { name: 'Ver vagas abertas', exact: true }).click();
  await expect(page).toHaveURL(/\/vagas$/);
  await expect(page).toHaveTitle('Vagas disponíveis | Point Media');
  const card = page
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { name: job.title, exact: true }) });
  await expect(card).toBeVisible();
  await page.reload();
  await expect(card).toBeVisible();
  for (const width of [320, 375, 768, 1366]) {
    await page.setViewportSize({ width, height: 812 });
    await noHorizontalOverflow(page);
    if (width === 320 || width === 1366)
      await page.screenshot({ path: `.tmp/public-jobs-${width}.png` });
  }
  await card.getByRole('link', { name: 'Ver vaga', exact: true }).click();
  await expect(page.getByLabel('Senha para sua conta *', { exact: true })).toBeVisible();
  for (const width of [320, 375, 768, 1366]) {
    await page.setViewportSize({ width, height: 812 });
    await noHorizontalOverflow(page);
    const information = await page.locator('.job-overview').boundingBox();
    const form = await page.locator('.professional-form').boundingBox();
    expect(Math.abs(information!.x - form!.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(information!.width - form!.width)).toBeLessThanOrEqual(1);
    expect(information!.y + information!.height).toBeLessThan(form!.y);
    if (width === 320 || width === 1366) {
      await page.evaluate(() => scrollTo(0, 0));
      await page.screenshot({ path: `.tmp/public-job-details-${width}.png` });
    }
  }
  await page.getByRole('link', { name: 'Entrar para continuar a inscrição' }).click();
  const contextualBack = page.getByRole('link', { name: 'Voltar à vaga', exact: true });
  await expect(contextualBack).toHaveAttribute('href', `/vagas/${job.id}`);
  for (const width of [320, 1366]) {
    await page.setViewportSize({ width, height: 812 });
    await noHorizontalOverflow(page);
    expect((await contextualBack.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: `.tmp/public-login-${width}.png` });
  }
  await contextualBack.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(`/vagas/${job.id}$`));
  await page.getByRole('link', { name: 'Voltar às vagas', exact: true }).click();
  await expect(page).toHaveURL(/\/vagas$/);
  await page.goto('/entrar');
  await page.getByRole('link', { name: 'Voltar para a página inicial', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto('/banco-de-talentos');
  await expect(page.getByLabel('Senha para sua conta *', { exact: true })).toBeVisible();
  const bankInformation = await page.locator('.public-job-information').boundingBox();
  const bankForm = await page.locator('.professional-form').boundingBox();
  expect(Math.abs(bankInformation!.x - bankForm!.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(bankInformation!.width - bankForm!.width)).toBeLessThanOrEqual(1);
});

for (const role of ['ADMIN', 'RECRUITER'] as const) {
  test(`barra lateral de ${role} mantém altura da janela em conteúdo longo`, async ({
    page,
    request,
    baseURL,
  }) => {
    const { admin, job } = await publishedJob(request, baseURL!, {
      description:
        'Responsabilidades desta vaga e informações sobre as atividades da equipe.\n'.repeat(60),
    });
    let email = admin.email;
    if (role === 'RECRUITER') {
      email = `layout-rh-${randomUUID()}@example.test`;
      expect(
        (
          await request.post('/api/users/recruiters', {
            headers: admin.headers,
            data: {
              name: 'RH de verificação do layout',
              email,
              password,
              jobTitle: 'Recrutamento',
            },
          })
        ).status(),
      ).toBe(201);
    }
    expect(
      (
        await page.request.post('/api/auth/login', {
          headers: admin.headers,
          data: { email, password },
        })
      ).status(),
    ).toBe(200);
    await page.setViewportSize({ width: 1366, height: 812 });
    await page.goto('/gestao/vagas');
    await expect(
      page.getByRole('navigation', {
        name: role === 'ADMIN' ? 'Administração' : 'Recrutamento',
        exact: true,
      }),
    ).toBeVisible();
    await page.getByText('Selecionar vaga', { exact: true }).click();
    await page.getByLabel('Buscar vagas', { exact: true }).fill(job.title);
    await page.getByRole('button', { name: 'Buscar', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: `Vaga: ${job.title}`, exact: true }),
    ).toBeVisible();
    await page.getByText('Selecionar vaga', { exact: true }).click();
    const sidebar = page.getByRole('complementary', { name: 'Menu principal' });
    for (const viewport of [
      { width: 1366, height: 812 },
      { width: 768, height: 812 },
      { width: 1366, height: 400 },
    ]) {
      await page.setViewportSize(viewport);
      await page.evaluate(() => scrollTo(0, 0));
      await noHorizontalOverflow(page);
      expect(
        await page.evaluate(() => document.documentElement.scrollHeight - innerHeight),
      ).toBeGreaterThan(500);
      const before = await sidebar.boundingBox();
      expect(before!.height).toBe(viewport.height);
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
      const after = await sidebar.boundingBox();
      expect(after!.height).toBe(viewport.height);
      expect(Math.abs(after!.y)).toBeLessThanOrEqual(1);
      await sidebar.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });
      await expect(sidebar.getByRole('button', { name: 'sair da conta' })).toBeInViewport();
      if (viewport.height === 400) {
        expect(
          await sidebar.evaluate((element) => element.scrollHeight > element.clientHeight),
        ).toBe(true);
        await page.screenshot({ path: `.tmp/sidebar-${role}-400.png` });
      }
    }
    await page.setViewportSize({ width: 375, height: 812 });
    await page.evaluate(() => scrollTo(0, 0));
    await noHorizontalOverflow(page);
    expect(await sidebar.evaluate((element) => getComputedStyle(element).position)).toBe('static');
    expect((await sidebar.boundingBox())!.height).toBeLessThan(400);
    await page.screenshot({ path: `.tmp/sidebar-${role}-375.png` });
  });
}
