import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { TALENT_CONSENT_TEXT, TALENT_CONSENT_VERSION } from '@pointmedia/shared';
import { vi } from 'vitest';
import { api, ApiFailure } from '../../lib/api';
import { SubmissionForm } from './SubmissionForm';

vi.mock('../../lib/api', async (original) => {
  const actual = await original<typeof import('../../lib/api')>();
  return {
    ...actual,
    api: { ...actual.api, me: vi.fn(), talentPolicy: vi.fn(), register: vi.fn(), login: vi.fn() },
  };
});

it('mantém a inscrição concluída se o login posterior falhar e oferece acesso sem repetir o cadastro', async () => {
  vi.mocked(api.me).mockRejectedValue(new ApiFailure(401, 'Entre na sua conta.'));
  vi.mocked(api.talentPolicy).mockResolvedValue({
    consentVersion: TALENT_CONSENT_VERSION,
    text: TALENT_CONSENT_TEXT,
    retentionDays: 180,
  });
  vi.mocked(api.register).mockResolvedValue({
    user: {
      id: 'fixture',
      name: 'Pessoa Teste',
      email: 'pessoa@example.test',
      role: 'CANDIDATE',
      phone: null,
      jobTitle: null,
      passwordChangedAt: new Date().toISOString(),
    },
    result: {
      outcome: 'TALENT_POOL',
      application: null,
      talentConsent: {
        id: 'consent',
        consentVersion: TALENT_CONSENT_VERSION,
        grantedAt: new Date().toISOString(),
        expiresAt: new Date().toISOString(),
        revokedAt: null,
      },
    },
  });
  vi.mocked(api.login).mockRejectedValue(new ApiFailure(0, 'Conexão interrompida.'));
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
      }
    >
      <MemoryRouter>
        <SubmissionForm />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  fireEvent.change(await screen.findByLabelText('Nome *'), { target: { value: 'Pessoa Teste' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'pessoa@example.test' } });
  fireEvent.change(screen.getByLabelText('Senha para sua conta *'), {
    target: { value: 'Senha fictícia para inscrição' },
  });
  fireEvent.change(screen.getByLabelText('Área ou título profissional *'), {
    target: { value: 'Desenvolvimento' },
  });
  fireEvent.change(screen.getByLabelText('Conte sobre você *'), {
    target: { value: 'Experiência profissional fictícia. '.repeat(8) },
  });
  for (const label of [
    'Localização',
    'Senioridade',
    'Pretensão salarial',
    'LinkedIn',
    'Portfólio',
    'Ferramentas que domina',
    'Experiência profissional',
    'Formação acadêmica',
  ])
    fireEvent.click(screen.getByLabelText(`${label}: Não se aplica`));
  fireEvent.click(screen.getByLabelText(TALENT_CONSENT_TEXT));
  fireEvent.click(screen.getByRole('button', { name: 'Entrar no banco de talentos' }));
  expect(
    await screen.findByText(
      'Inscrição concluída e conta criada. Entre com seu e-mail e senha para acompanhar.',
    ),
  ).toBeVisible();
  expect(screen.getByRole('link', { name: 'Entrar na minha conta' })).toHaveAttribute(
    'href',
    '/entrar?retorno=%2Fbanco-de-talentos',
  );
  expect(
    screen.queryByRole('button', { name: 'Entrar no banco de talentos' }),
  ).not.toBeInTheDocument();
  expect(api.register).toHaveBeenCalledTimes(1);
  expect(api.login).toHaveBeenCalledTimes(1);
});
