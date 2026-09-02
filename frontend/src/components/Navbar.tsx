import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Brand } from './Brand';
import { useAuth } from '../context/AuthContext';
import { Badge } from './Badge';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, isRecruiter, isCandidate, logout, quickLoginAs } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="site-header">
      <div className="site-header__main">
        <Brand onDark />
        <span className="public-header-title">Trabalhe conosco</span>
        <nav aria-label="Navegação principal" className="main-nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
            Vagas Abertas
          </NavLink>
          
          {isRecruiter && (
            <>
              <NavLink to="/recruiter/dashboard" className={({ isActive }) => (isActive ? 'active' : '')}>
                Dashboard
              </NavLink>
              <NavLink to="/recruiter/jobs" className={({ isActive }) => (isActive ? 'active' : '')}>
                Gestão de Vagas
              </NavLink>
              <NavLink to="/recruiter/talent-pool" className={({ isActive }) => (isActive ? 'active' : '')}>
                Banco de Talentos
              </NavLink>
            </>
          )}

          {isCandidate && (
            <NavLink to="/candidato/painel" className={({ isActive }) => (isActive ? 'active' : '')}>
              Minhas Candidaturas
            </NavLink>
          )}
        </nav>
      </div>

      <div className="site-header__auth">
        {isAuthenticated ? (
          <div className="user-menu">
            <div className="user-menu__info">
              <span className="user-menu__name">{user?.name || user?.email}</span>
              <Badge variant={user?.role === 'RECRUITER' ? 'pink' : user?.role === 'ADMIN' ? 'ink' : 'blue'} size="sm">
                {user?.role === 'RECRUITER' ? 'Recrutador' : user?.role === 'ADMIN' ? 'Admin' : 'Candidato'}
              </Badge>
            </div>
            <button
              onClick={() => {
                logout();
                navigate('/');
              }}
              className="button button--ghost button--sm"
            >
              Sair
            </button>
          </div>
        ) : (
          <div className="auth-actions">
            <div className="demo-switchers">
              <span className="demo-switchers__label">Demo Rápida:</span>
              <button
                type="button"
                onClick={() => {
                  quickLoginAs('RECRUITER');
                  navigate('/recruiter/dashboard');
                }}
                className="demo-btn demo-btn--recruiter"
                title="Entrar como RH / Recrutador"
              >
                RH
              </button>
              <button
                type="button"
                onClick={() => {
                  quickLoginAs('CANDIDATE');
                  navigate('/candidato/painel');
                }}
                className="demo-btn demo-btn--candidate"
                title="Entrar como Candidato"
              >
                Candidato
              </button>
            </div>
            <Link to="/login" className="login-link">
              login
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
