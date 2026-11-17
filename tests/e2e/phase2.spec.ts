import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { PROFILE_FIELDS } from '@pointmedia/shared';
import { samplePdf } from '../../apps/api/test/resume-fixtures';
import { saoPauloInput } from '../../apps/web/src/lib/format';

import { about, password, fixture } from './fixtures';

test('cadastro com senha, portal, Não se aplica, currículo e edição persistente', async ({
  page,
  request,
  baseURL,
}) => {
  await page.setViewportSize({ width: 1440, height: 1024 });
  const { email, headers } = await fixture(request, baseURL!);
  expect(
    (await page.request.post('/api/auth/login', { headers, data: { email, password } })).status(),
  ).toBe(200);
  await page.goto('/candidato');
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
  await expect(
    page.getByRole('textbox', { name: 'Pretensão salarial', exact: true }),
  ).toBeDisabled();
  await page
    .getByRole('textbox', { name: 'Ferramentas que domina', exact: true })
    .fill('React, TypeScript');
  await page.getByLabel('Conte sobre você *', { exact: true }).fill(about);
  await page.getByRole('checkbox', { name: /Autorizo compartilhar meus dados/ }).check();
  await page.getByLabel('Anexar currículo', { exact: true }).setInputFiles({
    name: 'curriculo-portal.pdf',
    mimeType: 'application/pdf',
    buffer: samplePdf,
  });
  await page.getByRole('button', { name: 'Salvar perfil', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Perfil profissional salvo.');
  await page.reload();
  await expect(page.getByLabel('Área ou título profissional *', { exact: true })).toHaveValue(
    'Desenvolvimento de software',
  );
  await expect(page.getByRole('link', { name: 'Baixar curriculo-portal.pdf' })).toBeVisible();
  expect((await page.request.get('/api/candidates/me/resume')).status()).toBe(200);
  await page.screenshot({ path: '.tmp/phase2-portal-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({ path: '.tmp/phase2-portal-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.goto('/gestao/vagas');
  await expect(page).toHaveURL(/\/candidato$/);
  expect((await page.request.get('/api/management/jobs')).status()).toBe(403);
});
test('gestão: modal de vaga, ausência explícita, edição, publicação e consulta pública', async ({
  page,
  request,
  baseURL,
}) => {
  await page.setViewportSize({ width: 1880, height: 1342 });
  const user = await fixture(request, baseURL!, true);
  const title = `Vaga Browser ${randomUUID()}`;
  await page.goto('/entrar');
  await page.getByLabel('e-mail', { exact: true }).fill(user.email);
  await page.getByLabel('senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Meu perfil', exact: true })).toBeVisible();
  await page.goto('/gestao/vagas');
  await page.getByRole('button', { name: 'Criar vaga', exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Criar vaga' });
  await modal.getByLabel('Título *', { exact: true }).fill(title);
  await modal
    .getByLabel('Descrição *', { exact: true })
    .fill('Descrição fictícia da oportunidade para testes reais de navegador.');
  for (const label of ['Senioridade', 'Localização', 'Faixa salarial'])
    await modal.getByRole('checkbox', { name: `${label}: Não se aplica`, exact: true }).check();
  await modal.getByLabel('Skills obrigatórias', { exact: true }).fill('React, TypeScript');
  await modal.getByLabel('Skills desejáveis', { exact: true }).fill('Testes');
  await modal
    .getByLabel('Encerramento (horário de Brasília) *', { exact: true })
    .fill(saoPauloInput(new Date(Date.now() + 3 * 86400000).toISOString()));
  await modal.evaluate((element) => {
    element.scrollTop = 0;
  });
  await page.screenshot({ path: '.tmp/phase2-job-modal.png', fullPage: true });
  await modal.getByRole('button', { name: 'Salvar vaga', exact: true }).click();
  await expect(modal).not.toBeVisible();
  await expect(page.getByRole('heading', { name: `Vaga: ${title}`, exact: true })).toBeVisible();
  await page.screenshot({ path: '.tmp/phase2-jobs.png', fullPage: true });
  await page.getByRole('button', { name: 'Editar vaga', exact: true }).click();
  const edit = page.getByRole('dialog', { name: 'Editar vaga' });
  await edit.getByLabel('Departamento', { exact: true }).fill('Tecnologia');
  await edit.getByRole('button', { name: 'Salvar vaga', exact: true }).click();
  await expect(edit).not.toBeVisible();
  await page.getByRole('button', { name: 'Publicar vaga', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Vaga publicada.');
  await page.goto('/');
  const card = page
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { name: title, exact: true }) });
  await card.getByRole('link', { name: 'Ver vaga', exact: true }).click();
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await expect(
    page.getByText('Descrição fictícia da oportunidade para testes reais de navegador.'),
  ).toBeVisible();
});
test('RH consulta somente perfil compartilhado e baixa currículo autorizado', async ({
  page,
  request,
  baseURL,
}) => {
  await page.setViewportSize({ width: 1880, height: 1342 });
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
          name: `Candidato ${candidate.id}`,
          headline: 'Profissional de teste',
          about,
          skills: [],
          experience: [],
          education: [],
          notApplicable: [...PROFILE_FIELDS],
          shareWithRecruiters: true,
        },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await request.post('/api/candidates/me/resume', {
        headers: candidate.headers,
        multipart: {
          file: { name: 'cv-compartilhado.pdf', mimeType: 'application/pdf', buffer: samplePdf },
        },
      })
    ).status(),
  ).toBe(201);
  const admin = await fixture(request, baseURL!, true);
  await page.goto('/entrar');
  await page.getByLabel('e-mail', { exact: true }).fill(admin.email);
  await page.getByLabel('senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Meu perfil', exact: true })).toBeVisible();
  await page.goto('/gestao/candidatos');
  await page.getByLabel('Buscar candidatos', { exact: true }).fill(candidate.id);
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await page.getByRole('button', { name: 'Ver perfil', exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Perfil do candidato' });
  await expect(
    modal.getByRole('heading', { name: `Candidato ${candidate.id}`, exact: true }),
  ).toBeVisible();
  await expect(modal.getByRole('link', { name: 'Baixar currículo', exact: true })).toBeVisible();
  await page.screenshot({ path: '.tmp/phase2-candidate-modal.png', fullPage: true });
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(await modal.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  expect((await page.request.get(`/api/candidates/${candidate.id}/resume`)).status()).toBe(200);
});
