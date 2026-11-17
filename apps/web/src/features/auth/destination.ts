import type { Role } from '@pointmedia/shared';

export function authDestination(search: string, role: Role): string {
  if (role !== 'CANDIDATE') return '/perfil';
  const destination = new URLSearchParams(search).get('retorno');
  return destination &&
    /^(\/vagas\/[0-9a-f-]{36}|\/banco-de-talentos|\/candidaturas\/[0-9a-f-]{36}\/confirmacao)$/i.test(
      destination,
    )
    ? destination
    : '/candidato';
}
export const authSearch = (destination: string) => `?retorno=${encodeURIComponent(destination)}`;
