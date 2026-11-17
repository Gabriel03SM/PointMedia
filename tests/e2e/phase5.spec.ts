import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { PROCESS_CONSENT_VERSION, PROFILE_FIELDS } from '@pointmedia/shared';
import { about, fixture, password, publishedJob } from './fixtures';

async function setup(request: APIRequestContext, baseURL: string) {
  const { job, admin } = await publishedJob(request, baseURL);
  const candidate = await fixture(request, baseURL);
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
          name: 'Pessoa Processo Browser',
          headline: 'Perfil de processo seletivo',
          about,
          skills: [],
          education: [],
          experience: [],
          notApplicable: [...PROFILE_FIELDS],
          shareWithRecruiters: false,
        },
      })
    ).status(),
  ).toBe(200);
  const submitted = await request.post('/api/applications', {
    headers: candidate.headers,
    data: {
      jobId: job.id,
      processConsent: true,
      processConsentVersion: PROCESS_CONSENT_VERSION,
      talentPoolConsent: false,
    },
  });
  expect(submitted.status()).toBe(200);
  const id = (await submitted.json()).application.id as string;
  return { job, admin, candidate, id };
}
async function openProcess(page: Page, email: string, jobId: string) {
  await page.goto('/entrar');
  await page.getByLabel('e-mail', { exact: true }).fill(email);
  await page.getByLabel('senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Meu perfil', exact: true })).toBeVisible();
  await page.goto(`/gestao/candidatos?vaga=${jobId}`);
  await page.getByRole('button', { name: 'Ver perfil', exact: true }).click();
  return page.getByRole('dialog', { name: 'Perfil do candidato' });
}

test('RH confirma reprovação e nota; candidato acompanha mensagem sem dados internos', async ({
  page,
  request,
  baseURL,
  browser,
}) => {
  const { job, admin, candidate, id } = await setup(request, baseURL!);
  const modal = await openProcess(page, admin.email, job.id);
  await modal
    .getByLabel('Nota do recrutador', { exact: true })
    .fill('Observação confidencial somente para RH');
  await modal.getByRole('button', { name: 'Salvar nota', exact: true }).click();
  await expect(modal.getByText('Nota interna salva.', { exact: true })).toBeVisible();
  await modal.getByLabel('Próxima etapa', { exact: true }).selectOption('REJECTED');
  await modal
    .getByLabel('Justificativa interna', { exact: true })
    .fill('Justificativa privada da decisão');
  await modal
    .getByLabel('Mensagem ao candidato (opcional)', { exact: true })
    .fill('Agradecemos sua participação neste processo.');
  await modal.getByRole('button', { name: 'Revisar mudança de etapa' }).click();
  const confirmation = modal.getByRole('group', { name: 'Confirmar mudança de etapa' });
  await expect(confirmation).toContainText('não poderá ser reaberta');
  await confirmation.getByRole('button', { name: 'Voltar à edição' }).click();
  expect((await (await page.request.get(`/api/management/applications/${id}`)).json()).status).toBe(
    'RECEIVED',
  );
  await modal.getByRole('button', { name: 'Revisar mudança de etapa' }).click();
  await confirmation.getByRole('button', { name: 'Confirmar mudança', exact: true }).click();
  await expect(
    modal.getByText('Etapa atualizada e histórico registrado.', { exact: true }),
  ).toBeVisible();
  await expect(
    modal.getByText('Decisão final registrada. Esta candidatura está encerrada.'),
  ).toBeVisible();
  await modal.getByText('Histórico e mensagens — uso interno', { exact: true }).click();
  await expect(modal.getByText('Recebida → Reprovada', { exact: true })).toBeVisible();
  await page.screenshot({ path: '.tmp/phase5-process-desktop.png', fullPage: true });
  await modal.getByRole('button', { name: 'Fechar perfil' }).click();
  await page.getByLabel('Filtrar candidaturas por etapa').selectOption('REJECTED');
  await expect(page.getByText('Reprovada', { exact: true }).last()).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Ver perfil', exact: true }).click();
  await expect(
    modal.getByText('Observação confidencial somente para RH', { exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await modal.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.screenshot({ path: '.tmp/phase5-process-mobile.png', fullPage: true });

  const context = await browser.newContext({ baseURL });
  try {
    expect(
      (
        await context.request.post('/api/auth/login', {
          headers: candidate.headers,
          data: { email: candidate.email, password },
        })
      ).status(),
    ).toBe(200);
    const portal = await context.newPage();
    await portal.goto('/candidato');
    const row = portal
      .getByRole('article')
      .filter({ has: portal.getByRole('heading', { name: job.title, exact: true }) });
    await expect(row.getByText('Reprovada', { exact: true })).toBeVisible();
    await row.getByText('Histórico e mensagens', { exact: true }).click();
    await expect(
      row.getByText('Mensagem ao candidato: Agradecemos sua participação neste processo.', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(portal.getByText('Observação confidencial somente para RH')).toHaveCount(0);
    await expect(portal.getByText('Justificativa privada da decisão')).toHaveCount(0);
    await row.getByRole('link', { name: 'Ver comprovante' }).click();
    await expect(portal.locator('dd').filter({ hasText: /^Reprovada$/ })).toBeVisible();
    await portal.getByText('Histórico e mensagens', { exact: true }).click();
    await expect(portal.getByText('Recebida → Reprovada', { exact: true })).toBeVisible();
    await portal.screenshot({ path: '.tmp/phase5-candidate-history.png', fullPage: true });
  } finally {
    await context.close();
  }
});

test('aprovação após entrevista é humana, persistida e impede novas transições', async ({
  page,
  request,
  baseURL,
}) => {
  const { job, admin, id } = await setup(request, baseURL!);
  expect(
    (
      await request.post('/api/auth/login', {
        headers: admin.headers,
        data: { email: admin.email, password },
      })
    ).status(),
  ).toBe(200);
  let version = 1;
  for (const status of ['SCREENING', 'SHORTLISTED', 'INTERVIEW'])
    expect(
      (
        await request.patch(`/api/management/applications/${id}/stage`, {
          headers: admin.headers,
          data: { version: version++, status, internalReason: 'Avanço humano confirmado' },
        })
      ).status(),
    ).toBe(200);
  const modal = await openProcess(page, admin.email, job.id);
  await modal.getByLabel('Próxima etapa', { exact: true }).selectOption('APPROVED');
  await modal
    .getByLabel('Justificativa interna', { exact: true })
    .fill('Entrevista concluída e aprovação humana registrada.');
  await modal.getByRole('button', { name: 'Revisar mudança de etapa' }).click();
  await expect(modal.getByRole('group', { name: 'Confirmar mudança de etapa' })).toContainText(
    'Nenhuma mensagem adicional será publicada.',
  );
  await modal.getByRole('button', { name: 'Confirmar mudança', exact: true }).click();
  await expect(
    modal.getByText('Etapa atualizada e histórico registrado.', { exact: true }),
  ).toBeVisible();
  await expect(modal.getByLabel('Próxima etapa')).toHaveCount(0);
  await modal.getByRole('button', { name: 'Fechar perfil' }).click();
  await page.reload();
  await expect(page.locator('.candidate-shared')).toHaveText('Aprovada');
  await page.getByRole('button', { name: 'Ver perfil', exact: true }).click();
  await modal.getByText('Histórico e mensagens — uso interno', { exact: true }).click();
  await expect(modal.getByText('Entrevista → Aprovada', { exact: true })).toBeVisible();
});
