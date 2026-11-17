import { Navigate, useLocation } from 'react-router-dom';
import { authDestination } from './destination';

// Compatibilidade com links antigos: o cadastro acontece no formulário da inscrição.
export function RegisterPage() {
  const { search } = useLocation();
  const destination = authDestination(search, 'CANDIDATE');
  return (
    <Navigate
      replace
      to={
        /^\/vagas\//.test(destination) || destination === '/banco-de-talentos'
          ? destination
          : '/vagas'
      }
    />
  );
}
