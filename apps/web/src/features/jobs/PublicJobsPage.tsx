import { Link } from 'react-router-dom';
import { BackLink } from '../../components/BackLink';
import { PublicHeader, PublicFooter } from '../public/PublicLayout';
import { PublicJobs } from './PublicJobs';

export function PublicJobsPage() {
  return (
    <div className="home-page">
      <a className="skip-link" href="#conteudo-publico">
        Ir para o conteúdo
      </a>
      <PublicHeader />
      <main className="home-container public-jobs-page" id="conteudo-publico" tabIndex={-1}>
        <BackLink to="/">Voltar à página inicial</BackLink>
        <div className="public-jobs-heading">
          <div>
            <h1>Vagas disponíveis</h1>
            <p className="home-section-intro">
              Conheça as oportunidades da Point Media e escolha uma vaga para se inscrever.
            </p>
          </div>
          <Link className="home-button home-button-light" to="/banco-de-talentos">
            Banco de talentos
          </Link>
        </div>
        <section aria-label="Oportunidades abertas">
          <PublicJobs />
        </section>
        <p className="public-jobs-note">
          Não encontrou uma vaga para o seu perfil?{' '}
          <Link to="/banco-de-talentos">Participe do banco de talentos</Link> para futuras
          oportunidades.
        </p>
      </main>
      <PublicFooter />
    </div>
  );
}
