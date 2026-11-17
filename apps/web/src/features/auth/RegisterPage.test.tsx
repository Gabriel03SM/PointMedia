import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RegisterPage } from './RegisterPage';
import { authSearch } from './destination';

function mount(search = '') {
  render(
    <MemoryRouter initialEntries={['/cadastro' + search]}>
      <Routes>
        <Route path="/cadastro" element={<RegisterPage />} />
        <Route path="/vagas" element={<h1>Oportunidades</h1>} />
        <Route path="/banco-de-talentos" element={<h1>Inscrição no banco</h1>} />
        <Route path="/vagas/:id" element={<h1>Inscrição na vaga</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}
describe('links antigos de cadastro', () => {
  it('não oferece cadastro independente', async () => {
    mount();
    expect(await screen.findByRole('heading', { name: 'Oportunidades' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'criar conta' })).not.toBeInTheDocument();
  });
  it.each([
    ['/banco-de-talentos', 'Inscrição no banco'],
    ['/vagas/12345678-1234-1234-1234-123456789012', 'Inscrição na vaga'],
  ])('continua no formulário de inscrição: %s', async (destination, heading) => {
    mount(authSearch(destination));
    expect(await screen.findByRole('heading', { name: heading })).toBeVisible();
  });
  it('não redireciona para um destino externo', async () => {
    mount(authSearch('https://externo.example.test'));
    expect(await screen.findByRole('heading', { name: 'Oportunidades' })).toBeVisible();
  });
});
