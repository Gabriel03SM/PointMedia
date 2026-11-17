import { expect, test, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import {
  PROCESS_CONSENT_VERSION,
  type Job,
  type PageResult,
  type ScreeningRanking,
} from '@pointmedia/shared';
import { sampleDocx, samplePdf } from '../../apps/api/test/resume-fixtures';
import { saoPauloInput } from '../../apps/web/src/lib/format';
import { about, fixture, password } from './fixtures';

async function login(page: Page, email: string) {
  await page.goto('/entrar');
  await page.getByLabel('e-mail', { exact: true }).fill(email);
  await page.getByLabel('senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Meu perfil', exact: true })).toBeVisible();
}

async function fillSignup(page: Page, name: string, email: string, docx = false) {
  await page.getByLabel('Nome *', { exact: true }).fill(name);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Senha para sua conta *', { exact: true }).fill(password);
  await page
    .getByLabel('Área ou título profissional *', { exact: true })
    .fill('Desenvolvimento web');
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
    .fill('React, TypeScript, Testes');
  await page.getByLabel('Conte sobre você *', { exact: true }).fill(about);
  await page.getByLabel('Anexar currículo', { exact: true }).setInputFiles({
    name: docx ? 'curriculo.docx' : 'curriculo.pdf',
    mimeType: docx
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : 'application/pdf',
    buffer: docx ? sampleDocx() : samplePdf,
  });
}

test('fluxo principal contínuo: Admin → RH → vaga → inscrição → ranking → decisão → banco', async ({
  browser,
  request,
  baseURL,
}) => {
  // Um único cenário cobre os 13 passos, incluindo quatro decisões humanas pela UI.
  test.setTimeout(120_000);
  const tag = randomUUID();
  const recruiterEmail = `rh-full-${tag}@example.test`;
  const candidateEmail = `candidate-full-${tag}@example.test`;
  const candidateName = `Pessoa do fluxo ${tag}`;
  const lateEmail = `late-full-${tag}@example.test`;
  const lateName = `Pessoa do banco ${tag}`;
  const title = `Vaga do fluxo ${tag}`;
  const contexts = await Promise.all([0, 1, 2].map(() => browser.newContext({ baseURL })));
  const staff = await contexts[0]!.newPage();
  const candidate = await contexts[1]!.newPage();
  const late = await contexts[2]!.newPage();
  const headers = { 'X-Pointmedia-Request': '1', Origin: new URL(baseURL!).origin };
  let job!: Job;
  let applicationId = '';
  let candidateId = '';
  let lateId = '';
  try {
    await test.step('1. Admin cadastra RH pela API restrita', async () => {
      const admin = await fixture(request, baseURL!, true);
      expect(
        (
          await request.post('/api/auth/login', { headers, data: { email: admin.email, password } })
        ).status(),
      ).toBe(200);
      const created = await request.post('/api/users/recruiters', {
        headers,
        data: {
          name: 'RH do fluxo completo',
          email: recruiterEmail,
          password,
          jobTitle: 'Recrutamento',
        },
      });
      expect(created.status()).toBe(201);
      expect((await created.json()).role).toBe('RECRUITER');
    });
    await test.step('2. RH cria e publica a vaga pela interface', async () => {
      await login(staff, recruiterEmail);
      expect(
        (
          await staff.request.post('/api/users/recruiters', {
            headers,
            data: { name: 'Negado', email: `denied-${tag}@example.test`, password, jobTitle: 'RH' },
          })
        ).status(),
      ).toBe(403);
      await staff.goto('/gestao/vagas');
      await staff.getByRole('button', { name: 'Criar vaga', exact: true }).click();
      const form = staff.getByRole('dialog', { name: 'Criar vaga' });
      await form.getByLabel('Título *', { exact: true }).fill(title);
      await form
        .getByLabel('Descrição *', { exact: true })
        .fill('Oportunidade fictícia para verificar o fluxo completo de recrutamento.');
      for (const label of ['Senioridade', 'Localização', 'Faixa salarial'])
        await form.getByRole('checkbox', { name: `${label}: Não se aplica`, exact: true }).check();
      await form.getByLabel('Skills obrigatórias', { exact: true }).fill('React, TypeScript');
      await form.getByLabel('Skills desejáveis', { exact: true }).fill('Testes');
      await form
        .getByLabel('Encerramento (horário de Brasília) *', { exact: true })
        .fill(saoPauloInput(new Date(Date.now() + 3 * 86400000).toISOString()));
      await form.getByRole('button', { name: 'Salvar vaga', exact: true }).click();
      await expect(form).not.toBeVisible();
      await expect(
        staff.getByRole('heading', { name: `Vaga: ${title}`, exact: true }),
      ).toBeVisible();
      await staff.getByRole('button', { name: 'Publicar vaga', exact: true }).click();
      await expect(staff.getByText('Vaga publicada.', { exact: true })).toBeVisible();
      const listed = await staff.request.get(`/api/management/jobs?q=${encodeURIComponent(title)}`);
      expect(listed.status()).toBe(200);
      const jobs = (await listed.json()) as PageResult<Job>;
      expect(jobs.items).toHaveLength(1);
      job = jobs.items[0]!;
      expect(job.effectiveStatus).toBe('PUBLISHED');
    });
    await test.step('3. Candidato preenche dados, senha e PDF sem criar conta antecipada', async () => {
      await candidate.goto(`/vagas/${job.id}`);
      await fillSignup(candidate, candidateName, candidateEmail);
      expect(
        (
          await candidate.request.post('/api/auth/login', {
            headers,
            data: { email: candidateEmail, password },
          })
        ).status(),
      ).toBe(401);
    });
    await test.step('4. Envio final cria conta e candidatura com autorização específica', async () => {
      await candidate.getByRole('checkbox', { name: /Autorizo disponibilizar meus dados/ }).check();
      await candidate.getByRole('button', { name: 'Enviar candidatura', exact: true }).click();
      await expect(
        candidate.getByRole('heading', { name: 'Sua candidatura foi enviada com sucesso!' }),
      ).toBeVisible();
      applicationId = /candidaturas\/([^/]+)/.exec(candidate.url())![1]!;
      const me = await candidate.request.get('/api/users/me');
      expect(me.status()).toBe(200);
      candidateId = (await me.json()).id as string;
    });
    await test.step('5. Prazo aceito e ausência de adesão implícita são verificados', async () => {
      const receipt = await candidate.request.get(`/api/applications/me/${applicationId}`);
      expect(receipt.status()).toBe(200);
      expect(Date.parse((await receipt.json()).submittedAt)).toBeLessThan(Date.parse(job.closesAt));
      expect((await (await candidate.request.get('/api/talent-pool/me')).json()).active).toBe(
        false,
      );
    });
    await test.step('6. Comprovante persiste após recarga e repetição não duplica candidatura', async () => {
      await candidate.reload();
      await expect(candidate.getByText(title, { exact: true })).toBeVisible();
      const duplicate = await candidate.request.post('/api/applications', {
        headers,
        data: {
          jobId: job.id,
          processConsent: true,
          processConsentVersion: PROCESS_CONSENT_VERSION,
          talentPoolConsent: false,
        },
      });
      expect(duplicate.status()).toBe(200);
      expect((await duplicate.json()).application.id).toBe(applicationId);
    });
    await test.step('7. RH configura critérios e calcula a compatibilidade da vaga', async () => {
      await staff.goto(`/gestao/triagem?vaga=${job.id}`);
      await staff.getByText('Configurar pesos — ainda não salvos', { exact: true }).click();
      await staff.getByRole('button', { name: 'Salvar critérios iniciais', exact: true }).click();
      await expect(
        staff.getByText('Critérios salvos. Gere o ranking para aplicar esta versão.', {
          exact: true,
        }),
      ).toBeVisible();
      await staff
        .getByRole('button', { name: 'Gerar ou reprocessar ranking', exact: true })
        .click();
      await expect(
        staff.getByText('Ranking gerado. Execução 1, critérios versão 1.', { exact: true }),
      ).toBeVisible();
    });
    await test.step('8. Ranking real é consultado pelo RH e bloqueado para o candidato', async () => {
      const ranking = await staff.request.get(`/api/screening/jobs/${job.id}/ranking`);
      expect(ranking.status()).toBe(200);
      const data = (await ranking.json()) as ScreeningRanking;
      expect(data.items).toHaveLength(1);
      expect(data.stale).toBe(false);
      expect(data.items[0]!.score).toBeGreaterThan(0);
      await expect(
        staff.getByRole('article').getByRole('heading', { name: candidateName, exact: true }),
      ).toBeVisible();
      expect((await candidate.request.get(`/api/screening/jobs/${job.id}/ranking`)).status()).toBe(
        403,
      );
    });
    await test.step('9. RH acessa perfil e currículo somente no contexto autorizado', async () => {
      await staff.goto(`/gestao/candidatos?vaga=${job.id}`);
      await staff.getByRole('button', { name: 'Ver perfil', exact: true }).click();
      const modal = staff.getByRole('dialog', { name: 'Perfil do candidato' });
      await expect(modal.getByRole('heading', { name: candidateName, exact: true })).toBeVisible();
      const file = await staff.request.get(`/api/management/applications/${applicationId}/resume`);
      expect(file.status()).toBe(200);
      expect(file.headers()['content-type']).toContain('application/pdf');
      expect((await staff.request.get(`/api/candidates/${candidateId}/profile`)).status()).toBe(
        404,
      );
    });
    await test.step('10. RH registra nota interna e decisões sequenciais pela interface', async () => {
      const modal = staff.getByRole('dialog', { name: 'Perfil do candidato' });
      await modal
        .getByLabel('Nota do recrutador', { exact: true })
        .fill('Nota privada do fluxo completo.');
      await modal.getByRole('button', { name: 'Salvar nota', exact: true }).click();
      await expect(modal.getByText('Nota interna salva.', { exact: true })).toBeVisible();
      for (const status of ['SCREENING', 'SHORTLISTED', 'INTERVIEW', 'APPROVED']) {
        await modal.getByLabel('Próxima etapa', { exact: true }).selectOption(status);
        await modal
          .getByLabel('Justificativa interna', { exact: true })
          .fill(`Decisão humana privada: ${status}`);
        if (status === 'APPROVED')
          await modal
            .getByLabel('Mensagem ao candidato (opcional)', { exact: true })
            .fill('Sua participação foi aprovada após a entrevista.');
        await modal.getByRole('button', { name: 'Revisar mudança de etapa' }).click();
        await modal.getByRole('button', { name: 'Confirmar mudança', exact: true }).click();
        await expect
          .poll(
            async () =>
              (
                await (
                  await staff.request.get(`/api/management/applications/${applicationId}`)
                ).json()
              ).status,
          )
          .toBe(status);
      }
      await expect(
        modal.getByText('Decisão final registrada. Esta candidatura está encerrada.'),
      ).toBeVisible();
      await modal.getByRole('button', { name: 'Fechar perfil' }).click();
    });
    await test.step('11. Candidato acompanha aprovação e mensagem sem conteúdo interno', async () => {
      await candidate.goto('/candidato');
      const row = candidate
        .getByRole('article')
        .filter({ has: candidate.getByRole('heading', { name: title, exact: true }) });
      await expect(row.getByText('Aprovada', { exact: true })).toBeVisible();
      await row.getByText('Histórico e mensagens', { exact: true }).click();
      await expect(
        row.getByText('Mensagem ao candidato: Sua participação foi aprovada após a entrevista.', {
          exact: true,
        }),
      ).toBeVisible();
      const history = await candidate.request.get(
        `/api/applications/me/${applicationId}/history?pageSize=10`,
      );
      expect(history.status()).toBe(200);
      const content = JSON.stringify(await history.json());
      expect(content).not.toContain('internalReason');
      expect(content).not.toContain('actor');
      expect(content).not.toContain('Decisão humana privada');
      await expect(candidate.getByText('Nota privada do fluxo completo.')).toHaveCount(0);
    });
    await test.step('12. Após encerramento, novo interessado entra apenas no banco com senha e consentimento', async () => {
      await staff.goto('/gestao/vagas');
      await staff.getByText('Selecionar vaga', { exact: true }).click();
      await staff.getByLabel('Selecionar vaga', { exact: true }).selectOption(job.id);
      await staff.getByRole('button', { name: 'Encerrar vaga', exact: true }).click();
      await expect(staff.getByText('Vaga encerrada.', { exact: true })).toBeVisible();
      await late.goto(`/vagas/${job.id}`);
      await expect(late.getByRole('heading', { name: 'Inscrições encerradas' })).toBeVisible();
      await fillSignup(late, lateName, lateEmail, true);
      await late.getByRole('checkbox', { name: /Quero participar do banco de talentos/ }).check();
      await late.getByRole('button', { name: 'Entrar no banco de talentos', exact: true }).click();
      await expect(
        late.getByText(
          'Cadastro no banco de talentos confirmado. Nenhuma candidatura foi criada para uma vaga encerrada.',
          { exact: true },
        ),
      ).toBeVisible();
      lateId = (await (await late.request.get('/api/users/me')).json()).id as string;
      expect(
        (await (await late.request.get(`/api/applications/me?jobId=${job.id}`)).json()).total,
      ).toBe(0);
      expect((await late.request.get(`/api/applications/me/${applicationId}`)).status()).toBe(404);
    });
    await test.step('13. RH encontra o talento consentido para futuras oportunidades', async () => {
      await staff.goto('/gestao/talentos');
      await staff.getByLabel('Buscar candidatos', { exact: true }).fill(lateName);
      await staff.getByRole('button', { name: 'Buscar', exact: true }).click();
      await expect(staff.getByRole('heading', { name: lateName, exact: true })).toBeVisible();
      expect((await staff.request.get(`/api/talent-pool/${lateId}/resume`)).status()).toBe(200);
      expect((await staff.request.get(`/api/talent-pool/${candidateId}/profile`)).status()).toBe(
        404,
      );
      await staff.screenshot({ path: '.tmp/phase8-flow-talents.png', fullPage: true });
    });
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});
