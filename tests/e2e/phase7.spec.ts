import { expect, test, type Locator, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { PROFILE_FIELDS } from '@pointmedia/shared';
import { about, fixture, password, publishedJob } from './fixtures';

async function responsive(page: Page, name: string) {
  await page.getByRole('heading', { level: 1 }).first().waitFor();
  await expect(page.locator('[role="status"]').filter({ hasText: /^Carregando/ })).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  for (const width of [320, 375, 768, 1366]) {
    await page.setViewportSize({ width, height: 812 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `${name} em ${width}px`,
    ).toBe(true);
    if (width === 320 || width === 1366)
      await page.screenshot({ path: `.tmp/phase7-${name}-${width}.png`, fullPage: true });
  }
}

async function contrast(locator: Locator, minimum = 4.5) {
  const ratio = await locator.evaluate((element) => {
    const rgb = (color: string) =>
      color
        .match(/[\d.]+/g)!
        .slice(0, 3)
        .map(Number);
    const luminance = (color: number[]) =>
      color
        .map((value) => {
          const channel = value / 255;
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        })
        .reduce((total, value, index) => total + value * ([0.2126, 0.7152, 0.0722][index] ?? 0), 0);
    let background = element;
    while (
      getComputedStyle(background).backgroundColor === 'rgba(0, 0, 0, 0)' &&
      background.parentElement
    )
      background = background.parentElement;
    const light = luminance(rgb(getComputedStyle(background).backgroundColor));
    const text = luminance(rgb(getComputedStyle(element).color));
    return (Math.max(light, text) + 0.05) / (Math.min(light, text) + 0.05);
  });
  expect(ratio).toBeGreaterThanOrEqual(minimum);
}

test('páginas públicas preservam layout, atalho de conteúdo e foco na navegação', async ({
  page,
  request,
  baseURL,
}) => {
  const { job } = await publishedJob(request, baseURL!);
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Ir para o conteúdo' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#conteudo-publico')).toBeFocused();
  await responsive(page, 'home');
  await page.getByRole('link', { name: 'login', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'realizar login' })).toBeFocused();
  await expect(page).toHaveTitle('Realizar login | Point Media');
  await responsive(page, 'login');
  await contrast(page.getByRole('button', { name: 'esqueceu a senha?' }));
  for (const [path, name] of [
    ['/cadastro', 'redirecionamento-cadastro'],
    ['/banco-de-talentos', 'banco'],
    [`/vagas/${job.id}`, 'vaga-publica'],
  ] as const) {
    await page.goto(path);
    await responsive(page, name);
  }
  await contrast(page.locator('.public-job-information h2'));
});

test('login e cadastro anunciam erros e modal de ajuda contém e devolve o foco', async ({
  page,
}) => {
  await page.goto('/entrar');
  await page.getByRole('button', { name: 'entrar', exact: true }).click();
  await expect(page.getByLabel('e-mail', { exact: true })).toBeFocused();
  await expect(page.getByLabel('e-mail', { exact: true })).toHaveAccessibleDescription(
    'Informe um e-mail válido.',
  );
  const help = page.getByRole('button', { name: 'esqueceu a senha?' });
  await help.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Acesso à conta' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Entendi' })).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(help).toBeFocused();
  await page.getByRole('link', { name: 'banco de talentos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Cadastro no banco de talentos' })).toBeFocused();
  await page.getByRole('button', { name: 'Entrar no banco de talentos', exact: true }).click();
  await expect(page.getByLabel('Nome *', { exact: true })).toBeFocused();
  await expect(page.getByLabel('Nome *', { exact: true })).toHaveAccessibleDescription(
    'Informe seu nome completo.',
  );
  await expect(
    page.getByLabel('Senha para sua conta *', { exact: true }),
  ).toHaveAccessibleDescription(/Use uma senha com 12 a 128 caracteres/);
});

test('candidato corrige campos e datas identificados, persiste perfil e usa âncora do portal', async ({
  page,
  request,
  baseURL,
}) => {
  const candidate = await fixture(request, baseURL!);
  expect(
    (
      await page.request.post('/api/auth/login', {
        headers: candidate.headers,
        data: { email: candidate.email, password },
      })
    ).status(),
  ).toBe(200);
  await page.goto('/candidato');
  await expect(page.getByRole('button', { name: 'Salvar perfil', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Salvar perfil', exact: true }).click();
  await expect(page.getByLabel('Área ou título profissional *', { exact: true })).toBeFocused();
  await expect(page.getByLabel('Localização', { exact: true })).toHaveAccessibleDescription(
    'Localização: preencha ou marque Não se aplica.',
  );
  await expect(
    page.getByRole('group', { name: 'Experiência profissional', exact: true }).first(),
  ).toHaveAccessibleDescription('Experiência: preencha ou marque Não se aplica.');
  await page
    .getByLabel('Área ou título profissional *', { exact: true })
    .fill('Desenvolvimento e comunicação');
  await page.getByLabel('Conte sobre você *', { exact: true }).fill(about);
  for (const label of [
    'Localização',
    'Senioridade',
    'Pretensão salarial',
    'LinkedIn',
    'Portfólio',
    'Ferramentas que domina',
    'Formação acadêmica',
  ])
    await page.getByRole('checkbox', { name: `${label}: Não se aplica`, exact: true }).check();
  await page.getByRole('button', { name: 'Adicionar experiência', exact: true }).click();
  await page.getByLabel('Empresa', { exact: true }).fill('Empresa de teste');
  await page.getByLabel('Cargo', { exact: true }).fill('Desenvolvimento');
  await page.getByLabel('Início', { exact: true }).fill('2025-06');
  await page.getByLabel('Fim (em branco se atual)', { exact: true }).fill('2024-01');
  await page.getByRole('button', { name: 'Salvar perfil', exact: true }).click();
  await expect(
    page.getByLabel('Fim (em branco se atual)', { exact: true }),
  ).toHaveAccessibleDescription('A data final da experiência não pode anteceder a inicial.');
  await page
    .getByRole('checkbox', { name: 'Experiência profissional: Não se aplica', exact: true })
    .check();
  await page.getByRole('button', { name: 'Salvar perfil', exact: true }).click();
  await expect(
    page.getByRole('status', { name: '' }).filter({ hasText: 'Perfil profissional salvo.' }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Área ou título profissional *', { exact: true })).toHaveValue(
    'Desenvolvimento e comunicação',
  );
  const persisted = await page.request.get('/api/candidates/me/profile');
  expect(persisted.status()).toBe(200);
  expect((await persisted.json()).profile.notApplicable).toHaveLength(PROFILE_FIELDS.length);
  await responsive(page, 'portal');
  await page
    .getByRole('navigation', { name: 'Candidato', exact: true })
    .getByRole('link', { name: 'minhas candidaturas', exact: true })
    .click();
  await expect(page.locator('#minhas-candidaturas')).toBeFocused();
  await expect(
    page
      .getByRole('navigation', { name: 'Candidato', exact: true })
      .locator('[aria-current="page"]'),
  ).toHaveCount(1);
  await page.goto('/perfil');
  await page.getByLabel('Nome', { exact: true }).fill('');
  await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
  await expect(page.getByLabel('Nome', { exact: true })).toHaveAccessibleDescription(
    'Informe seu nome.',
  );
  await page.getByRole('button', { name: 'Alterar senha', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar alteração', exact: true }).click();
  await expect(page.getByLabel('Senha atual', { exact: true })).toHaveAccessibleDescription(
    'Informe a senha atual.',
  );
  await expect(page.getByLabel('Nova senha', { exact: true })).toHaveAccessibleDescription(
    /Use pelo menos 12 caracteres/,
  );
});

test('RH acessa perfil longo e modal de vaga por teclado com retorno de foco', async ({
  page,
  request,
  baseURL,
}) => {
  const { admin } = await publishedJob(request, baseURL!);
  const email = `phase7-rh-${randomUUID()}@example.test`;
  expect(
    (
      await request.post('/api/users/recruiters', {
        headers: admin.headers,
        data: { name: 'RH da acessibilidade', email, password, jobTitle: 'Recrutamento' },
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
  const name = `Pessoa ${randomUUID()} ${'Sobrenome'.repeat(5)}`;
  expect(
    (
      await request.put('/api/candidates/me/profile', {
        headers: candidate.headers,
        data: {
          version: 0,
          name,
          headline: 'Comunicação'.repeat(8),
          about,
          skills: ['React'],
          experience: [],
          education: [],
          notApplicable: PROFILE_FIELDS.filter((field) => field !== 'SKILLS'),
          shareWithRecruiters: true,
        },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await page.request.post('/api/auth/login', {
        headers: admin.headers,
        data: { email, password },
      })
    ).status(),
  ).toBe(200);
  await page.goto('/gestao/candidatos');
  await page.getByLabel('Buscar candidatos', { exact: true }).fill(name);
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  const open = page.getByRole('button', { name: 'Ver perfil', exact: true });
  await expect(open).toHaveCount(1);
  await responsive(page, 'candidatos');
  await contrast(page.locator('.candidate-stat p'), 3);
  await open.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Perfil do candidato' });
  await expect(dialog.getByRole('heading', { name, exact: true })).toBeVisible();
  await contrast(dialog.locator('.skill-tags span'));
  for (const width of [320, 375, 768, 1366]) {
    await page.setViewportSize({ width, height: 812 });
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true,
    );
    if (width === 320 || width === 1366)
      await page.screenshot({ path: `.tmp/phase7-perfil-candidato-${width}.png`, fullPage: true });
  }
  await dialog.getByRole('button', { name: 'Fechar perfil' }).focus();
  await page.keyboard.press('Shift+Tab');
  expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(open).toBeFocused();
  await page.goto('/gestao/vagas');
  const create = page.getByRole('button', { name: 'Criar vaga', exact: true });
  await create.focus();
  await page.keyboard.press('Enter');
  const form = page.getByRole('dialog', { name: 'Criar vaga' });
  await expect(form.getByLabel('Título *', { exact: true })).toBeFocused();
  await form.getByRole('button', { name: 'Salvar vaga', exact: true }).click();
  await expect(form.getByLabel('Título *', { exact: true })).toHaveAccessibleDescription(
    'Informe o título da vaga.',
  );
  await page.setViewportSize({ width: 320, height: 812 });
  expect(await form.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.screenshot({ path: '.tmp/phase7-form-vaga-320.png', fullPage: true });
  await page.keyboard.press('Escape');
  await expect(form).toHaveCount(0);
  await expect(create).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(form.getByLabel('Título *', { exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(form).toHaveCount(0);
  await expect(create).toBeFocused();
});

test('dashboards e gestão mantêm controles visíveis e gráficos roláveis por teclado', async ({
  page,
  request,
  baseURL,
}) => {
  const admin = await fixture(request, baseURL!, true);
  expect(
    (
      await page.request.post('/api/auth/login', {
        headers: admin.headers,
        data: { email: admin.email, password },
      })
    ).status(),
  ).toBe(200);
  for (const [path, name] of [
    ['/admin/dashboard', 'admin'],
    ['/admin/metricas', 'metricas'],
    ['/gestao/dashboard', 'rh-dashboard'],
    ['/gestao/triagem', 'triagem'],
    ['/gestao/talentos', 'talentos'],
    ['/gestao/vagas', 'vagas'],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('[role="status"]').filter({ hasText: /^Carregando/ })).toHaveCount(0);
    await responsive(page, name);
    if (path === '/admin/dashboard') {
      await contrast(page.locator('.candidate-stat p').nth(0), 3);
      await contrast(page.locator('.candidate-stat p').nth(1), 3);
      await page.setViewportSize({ width: 320, height: 812 });
      const chart = page.getByRole('region', { name: 'Eventos de auditoria por dia', exact: true });
      await chart.focus();
      await page.keyboard.press('ArrowRight');
      await expect.poll(() => chart.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
      await expect(chart).toBeFocused();
      expect(await chart.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe(
        'none',
      );
    }
    if (path === '/gestao/vagas') {
      await page.setViewportSize({ width: 768, height: 812 });
      await page.getByText('Selecionar vaga', { exact: true }).click();
      const panel = await page.locator('.jobs-picker-panel').boundingBox();
      expect(panel!.x).toBeGreaterThanOrEqual(200);
      expect(panel!.x + panel!.width).toBeLessThanOrEqual(768);
    }
  }
});
