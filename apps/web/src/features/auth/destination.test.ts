import { authDestination, authSearch } from './destination';

describe('retorno após autenticação', () => {
  const job = '/vagas/12345678-1234-1234-1234-123456789012';
  it('preserva a vaga e o banco entre cadastro e login', () => {
    expect(authDestination(authSearch(job), 'CANDIDATE')).toBe(job);
    expect(authDestination(authSearch('/banco-de-talentos'), 'CANDIDATE')).toBe(
      '/banco-de-talentos',
    );
  });
  it.each([
    'https://evil.example',
    '//evil.example',
    '/gestao/vagas',
    '/vagas/../../perfil',
    '/banco-de-talentos?destino=https://evil.example',
  ])('recusa destino externo ou fora do fluxo: %s', (path) => {
    expect(authDestination(authSearch(path), 'CANDIDATE')).toBe('/candidato');
  });
  it('preserva a área interna para funcionários', () => {
    expect(authDestination(authSearch(job), 'RECRUITER')).toBe('/perfil');
  });
});
