import type { CurrentUser } from '@pointmedia/shared';
import type { ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Brand } from './Brand';

export function AccountLayout({
  user,
  onLogout,
  loggingOut,
  wide = false,
  children,
}: {
  user: CurrentUser;
  onLogout: () => void;
  loggingOut: boolean;
  wide?: boolean;
  children: ReactNode;
}) {
  const { pathname, hash } = useLocation();
  const entries: { label: string; to?: string; href?: string }[] =
    user.role === 'CANDIDATE'
      ? [
          { label: 'meu currículo', to: '/candidato' },
          { label: 'vagas', to: '/vagas' },
          { label: 'minhas candidaturas', to: '/candidato#minhas-candidaturas' },
          { label: 'banco de talentos', to: '/banco-de-talentos' },
        ]
      : user.role === 'ADMIN'
        ? [
            { label: 'dashboard', to: '/admin/dashboard' },
            { label: 'métricas', to: '/admin/metricas' },
            { label: 'usuários' },
            { label: 'logs' },
            { label: 'sistema' },
          ]
        : [
            { label: 'dashboard', to: '/gestao/dashboard' },
            { label: 'candidatos', to: '/gestao/candidatos' },
            { label: 'triagem', to: '/gestao/triagem' },
            { label: 'talentos', to: '/gestao/talentos' },
            { label: 'vagas', to: '/gestao/vagas' },
          ];
  return (
    <div className={`account-layout${wide ? ' management-layout' : ''}`}>
      <a className="skip-link" href="#main-content">
        Ir para o conteúdo
      </a>
      <aside className="sidebar" aria-label="Menu principal">
        <Brand tone="light" />
        <nav
          className="upcoming-navigation work-navigation"
          aria-label={
            user.role === 'ADMIN'
              ? 'Administração'
              : user.role === 'CANDIDATE'
                ? 'Candidato'
                : 'Recrutamento'
          }
        >
          {entries.map((item) =>
            item.to ? (
              <Link
                key={item.label}
                to={item.to}
                className={`${pathname}${hash}` === item.to ? 'active' : undefined}
                aria-current={`${pathname}${hash}` === item.to ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ) : item.href ? (
              <a key={item.label} href={item.href}>
                {item.label}
              </a>
            ) : (
              <span key={item.label} aria-disabled="true" title="Disponível em breve">
                {item.label}
              </span>
            ),
          )}
        </nav>
        <nav className="account-navigation" aria-label="Conta">
          <NavLink to="/perfil">meu perfil_</NavLink>
          <button type="button" disabled={loggingOut} onClick={onLogout}>
            {loggingOut ? 'saindo…' : 'sair da conta'}
          </button>
        </nav>
      </aside>
      <main
        id="main-content"
        tabIndex={-1}
        className={`account-main${wide ? ' management-main' : ''}`}
      >
        {children}
      </main>
    </div>
  );
}
