import { Link, NavLink } from 'react-router-dom';
import { Brand } from '../../components/Brand';
import './home.css';

export function PublicHeader() {
  return (
    <header className="home-header" id="inicio">
      <div className="home-container home-header-content">
        <Link className="home-title" to="/">
          <Brand tone="light" />
          <span>Trabalhe conosco</span>
        </Link>
        <nav className="public-navigation" aria-label="Navegação pública">
          <NavLink to="/vagas">vagas</NavLink>
          <Link className="home-login" to="/entrar">
            login
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="home-footer">
      <div className="home-container">
        <p>© {new Date().getFullYear()} Point Media – Sistema de Banco de Talentos</p>
        <Brand tone="light" />
      </div>
    </footer>
  );
}
