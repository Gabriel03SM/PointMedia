import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { authDestination, authSearch } from './destination';
import { ApiFailure } from '../../lib/api';
import { useSession } from './session';
import type { Role } from '@pointmedia/shared';

export function ProtectedRoute({ allowedRoles }: { allowedRoles?: Role[] }) {
  const session = useSession();
  const location = useLocation();
  if (session.isPending)
    return (
      <main className="center-message" role="status">
        Carregando sua conta…
      </main>
    );
  if (session.error instanceof ApiFailure && session.error.status === 401)
    return (
      <Navigate
        to={`/entrar${authDestination(authSearch(location.pathname), 'CANDIDATE') === location.pathname ? authSearch(location.pathname) : ''}`}
        replace
      />
    );
  if (session.isError)
    return (
      <main className="center-message">
        <p role="alert">{session.error.message}</p>
        <button className="button" onClick={() => void session.refetch()}>
          Tentar novamente
        </button>
      </main>
    );
  if (allowedRoles && session.data && !allowedRoles.includes(session.data.role))
    return <Navigate to={session.data.role === 'CANDIDATE' ? '/candidato' : '/perfil'} replace />;
  return <Outlet />;
}
