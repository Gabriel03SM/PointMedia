import { NavLink } from 'react-router-dom';
import { Brand } from './Brand';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/recruiter/dashboard', label: 'dashboard' },
  { to: '/recruiter/jobs', label: 'vagas' },
  { to: '/recruiter/talent-pool', label: 'talentos' },
];

export function RecruiterSidebar() {
  const { logout } = useAuth();
  return (
    <aside className="recruiter-sidebar">
      <Brand onDark />
      <nav aria-label="Navegação do painel">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} className={({ isActive }) => (isActive ? 'active' : '')}>
            {link.label}
          </NavLink>
        ))}
        <NavLink to="/recruiter/jobs/job-1/ranking" className={({ isActive }) => (isActive ? 'active' : '')}>
          triagem
        </NavLink>
      </nav>
      <div className="recruiter-sidebar__bottom">
        <button type="button">meu perfil</button>
        <button type="button" onClick={logout}>sair da conta</button>
      </div>
    </aside>
  );
}
