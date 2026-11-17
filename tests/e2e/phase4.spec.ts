import { expect, test, type APIRequestContext } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { PROCESS_CONSENT_VERSION, PROFILE_FIELDS } from '@pointmedia/shared';
import { about, fixture, password, publishedJob } from './fixtures';

async function applicant(
  request: APIRequestContext,
  baseURL: string,
  jobId: string,
  partial = false,
) {
  const candidate = await fixture(request, baseURL);
  expect(
    (
      await request.post('/api/auth/login', {
        headers: candidate.headers,
        data: { email: candidate.email, password },
      })
    ).status(),
  ).toBe(200);
  const data = {
    version: 0,
    name: `Pessoa Triagem ${randomUUID()}`,
    headline: 'Desenvolvimento web',
    seniority: partial ? 'JUNIOR' : 'SENIOR',
    expectedSalary: partial ? '6500.00' : '4500.00',
    skills: partial ? ['React'] : ['React', 'TypeScript', 'Testes'],
    about,
    experience: [],
    education: [],
    notApplicable: PROFILE_FIELDS.filter(
      (field) => !['SENIORITY', 'SALARY', 'SKILLS'].includes(field),
    ),
    shareWithRecruiters: false,
  };
  expect(
    (
      await request.put('/api/candidates/me/profile', { headers: candidate.headers, data })
    ).status(),
  ).toBe(200);
  expect(
    (
      await request.post('/api/applications', {
        headers: candidate.headers,
        data: {
          jobId,
          processConsent: true,
          processConsentVersion: PROCESS_CONSENT_VERSION,
          talentPoolConsent: false,
        },
      })
    ).status(),
  ).toBe(200);
  return { ...candidate, data };
}

test('RH configura, explica e reprocessa ranking real por critérios e dados atualizados', async ({
  page,
  request,
  baseURL,
}) => {
  const { admin, job } = await publishedJob(request, baseURL!, {
    seniority: 'SENIOR',
    seniorityNotApplicable: false,
    salaryMin: '3000.00',
    salaryMax: '5000.00',
    salaryNotApplicable: false,
    requiredSkills: ['React', 'TypeScript'],
    desiredSkills: ['Testes'],
  });
  const alpha = await applicant(request, baseURL!, job.id);
  const beta = await applicant(request, baseURL!, job.id, true);
  await page.setViewportSize({ width: 1880, height: 1342 });
  await page.goto('/entrar');
  await page.getByLabel('e-mail', { exact: true }).fill(admin.email);
  await page.getByLabel('senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Meu perfil', exact: true })).toBeVisible();
  await page.goto(`/gestao/triagem?vaga=${job.id}`);
  await page.getByText('Configurar pesos — ainda não salvos', { exact: true }).click();
  await page.getByLabel('Tecnologias (%)', { exact: true }).fill('51');
  await page.getByRole('button', { name: 'Salvar critérios iniciais', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('A soma dos três critérios deve ser 100%.');
  await page.getByLabel('Tecnologias (%)', { exact: true }).fill('50');
  await page.getByRole('button', { name: 'Salvar critérios iniciais', exact: true }).click();
  await expect(
    page.getByText('Critérios salvos. Gere o ranking para aplicar esta versão.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Gerar ou reprocessar ranking', exact: true }).click();
  await expect(
    page.getByText('Ranking gerado. Execução 1, critérios versão 1.', { exact: true }),
  ).toBeVisible();
  const alphaRow = page
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { name: alpha.data.name, exact: true }) });
  const betaRow = page
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { name: beta.data.name, exact: true }) });
  await expect(alphaRow.getByText('Score 100', { exact: true })).toBeVisible();
  await expect(betaRow.getByText('Score 47,88', { exact: true })).toBeVisible();
  await betaRow.getByText('Entender pontuação', { exact: true }).click();
  await expect(
    betaRow.getByText('Confirmar com o candidato: TypeScript', { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: '.tmp/phase4-ranking-desktop.png', fullPage: true });
  await alphaRow.getByRole('button', { name: 'Ver perfil', exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Perfil do candidato' });
  await expect(modal.getByRole('heading', { name: alpha.data.name, exact: true })).toBeVisible();
  await modal.getByRole('button', { name: 'Fechar perfil' }).click();
  await page.getByLabel('Tecnologias (%)', { exact: true }).fill('0');
  await page.getByLabel('Senioridade (%)', { exact: true }).fill('0');
  await page.getByLabel('Salário (%)', { exact: true }).fill('100');
  await page.getByRole('button', { name: 'Salvar nova versão dos critérios', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Ranking desatualizado');
  await page.getByRole('button', { name: 'Gerar ou reprocessar ranking', exact: true }).click();
  await expect(
    page.getByText('Ranking gerado. Execução 2, critérios versão 2.', { exact: true }),
  ).toBeVisible();
  await expect(betaRow.getByText('Score 76,92', { exact: true })).toBeVisible();
  expect(
    (
      await request.post('/api/auth/login', {
        headers: alpha.headers,
        data: { email: alpha.email, password },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await request.put('/api/candidates/me/profile', {
        headers: alpha.headers,
        data: { ...alpha.data, version: 1, expectedSalary: '10000.00' },
      })
    ).status(),
  ).toBe(200);
  await page.getByRole('button', { name: 'Atualizar consulta', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Ranking desatualizado');
  await page.getByRole('button', { name: 'Gerar ou reprocessar ranking', exact: true }).click();
  await expect(
    page.getByText('Ranking gerado. Execução 3, critérios versão 2.', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('article').first().getByRole('heading', { name: beta.data.name, exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(alphaRow.getByText('Score 50', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '.tmp/phase4-ranking-mobile.png', fullPage: true });
});

test('vaga sem candidatos tem resultado vazio; candidato não acessa ranking interno', async ({
  page,
  request,
  baseURL,
}) => {
  const { admin, job } = await publishedJob(request, baseURL!);
  await page.goto('/entrar');
  await page.getByLabel('e-mail', { exact: true }).fill(admin.email);
  await page.getByLabel('senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Meu perfil', exact: true })).toBeVisible();
  await page.goto(`/gestao/triagem?vaga=${job.id}`);
  await page.getByText('Configurar pesos — ainda não salvos', { exact: true }).click();
  await page.getByRole('button', { name: 'Salvar critérios iniciais', exact: true }).click();
  await expect(
    page.getByText('Critérios salvos. Gere o ranking para aplicar esta versão.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Gerar ou reprocessar ranking', exact: true }).click();
  await expect(
    page.getByText('Ranking gerado. Execução 1, critérios versão 1.', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Nenhum candidato disponível neste resultado. Verifique inscrições e filtros.', {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'sair da conta', exact: true }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  const candidate = await fixture(request, baseURL!);
  await page.getByLabel('e-mail', { exact: true }).fill(candidate.email);
  await page.getByLabel('senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'entrar', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Portal do candidato', exact: true }),
  ).toBeVisible();
  await page.goto('/gestao/triagem');
  await expect(page).toHaveURL(/\/candidato$/);
  expect((await page.request.get(`/api/screening/jobs/${job.id}/ranking`)).status()).toBe(403);
});
