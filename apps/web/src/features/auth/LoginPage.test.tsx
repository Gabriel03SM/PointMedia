import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { api, ApiFailure } from '../../lib/api';
import { LoginPage } from './LoginPage';

vi.mock('../../lib/api', async (original) => {
  const actual = await original<typeof import('../../lib/api')>();
  return { ...actual, api: { ...actual.api, me: vi.fn(), login: vi.fn() } };
});

function mount() {
  vi.mocked(api.me).mockRejectedValue(new ApiFailure(401, 'Faça login.'));
  const cache = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={cache}>
      <MemoryRouter initialEntries={['/entrar']}>
        <Routes>
          <Route path="/entrar" element={<LoginPage />} />
          <Route path="/perfil" element={<h1>Perfil conectado</h1>} />
          <Route path="/candidato" element={<h1>Perfil conectado</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('login', () => {
  it('orienta o primeiro acesso pela vaga ou banco, sem cadastro avulso', async () => {
    mount();
    expect(await screen.findByRole('link', { name: 'vaga' })).toHaveAttribute('href', '/vagas');
    expect(screen.getByRole('link', { name: 'banco de talentos' })).toHaveAttribute(
      'href',
      '/banco-de-talentos',
    );
    expect(
      screen.queryByRole('link', { name: 'Criar conta de candidato' }),
    ).not.toBeInTheDocument();
  });
  it('valida campos antes de chamar o backend', async () => {
    mount();
    await userEvent.click(screen.getByRole('button', { name: 'entrar' }));
    expect(await screen.findByText('Informe um e-mail válido.')).toBeVisible();
    expect(api.login).not.toHaveBeenCalled();
  });
  it('mostra mensagem devolvida pela API', async () => {
    vi.mocked(api.login).mockRejectedValue(new ApiFailure(401, 'E-mail ou senha inválidos.'));
    mount();
    await userEvent.type(screen.getByLabelText('e-mail'), 'candidato@example.test');
    await userEvent.type(screen.getByLabelText('senha', { exact: true }), 'senha incorreta');
    await userEvent.click(screen.getByRole('button', { name: 'entrar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha inválidos.');
  });
  it('navega após autenticação e não armazena token no localStorage', async () => {
    vi.mocked(api.login).mockResolvedValue({
      id: 'test',
      name: 'Teste',
      email: 'teste@example.test',
      role: 'CANDIDATE',
      phone: null,
      jobTitle: null,
      passwordChangedAt: new Date().toISOString(),
    });
    mount();
    await userEvent.type(screen.getByLabelText('e-mail'), 'teste@example.test');
    await userEvent.type(screen.getByLabelText('senha', { exact: true }), 'senha de teste válida');
    await userEvent.click(screen.getByRole('button', { name: 'entrar' }));
    expect(await screen.findByRole('heading', { name: 'Perfil conectado' })).toBeVisible();
    expect(localStorage.length).toBe(0);
  });
});
