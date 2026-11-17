import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { api, ApiFailure } from '../lib/api';
import { App } from './App';

vi.mock('../lib/api', async (original) => {
  const actual = await original<typeof import('../lib/api')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      me: vi.fn(),
      publicJobs: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 }),
    },
  };
});

function mount(path: string) {
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={cache}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('entrada pública', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('abre a home sem consultar sessão e solicita login apenas ao escolher entrar', async () => {
    vi.mocked(api.me).mockRejectedValue(new ApiFailure(401, 'Faça login.'));
    mount('/');
    expect(
      screen.getByRole('heading', { name: 'Conecte seu talento à comunicação do futuro' }),
    ).toBeVisible();
    expect(api.me).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('link', { name: 'Ver vagas abertas' }));
    expect(await screen.findByRole('heading', { name: 'Vagas disponíveis' })).toBeVisible();
    expect(await screen.findByText('Nenhuma vaga aberta no momento')).toBeVisible();
    expect(api.me).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('link', { name: 'login' }));
    expect(await screen.findByRole('heading', { name: 'realizar login' })).toBeVisible();
    await userEvent.click(screen.getByRole('link', { name: 'Voltar para a página inicial' }));
    expect(
      await screen.findByRole('heading', { name: 'Conecte seu talento à comunicação do futuro' }),
    ).toBeVisible();
  });

  it('direciona uma URL desconhecida para a home pública sem exigir autenticação', async () => {
    mount('/pagina-inexistente');
    expect(
      await screen.findByRole('heading', { name: 'Conecte seu talento à comunicação do futuro' }),
    ).toBeVisible();
    expect(api.me).not.toHaveBeenCalled();
  });
});
