import { Link } from 'react-router-dom';
import { Brand } from '../../components/Brand';
import { PublicJobs } from '../jobs/PublicJobs';
import { PublicHeader, PublicFooter } from './PublicLayout';
import './home.css';

export function HomePage() {
  return (
    <div className="home-page">
      <a className="skip-link" href="#conteudo-publico">
        Ir para o conteúdo
      </a>
      <PublicHeader />
      <main id="conteudo-publico" tabIndex={-1}>
        <section className="home-hero" aria-labelledby="home-heading">
          <div className="home-container home-hero-content">
            <div className="home-intro">
              <Brand tone="light" className="home-wordmark" />
              <h1 id="home-heading">Conecte seu talento à comunicação do futuro</h1>
              <div className="home-accent" aria-hidden="true" />
              <p>
                Conheça a Point Media e acompanhe as oportunidades para fazer parte da nossa equipe.
              </p>
              <nav className="home-actions" aria-label="Oportunidades">
                <Link className="home-button" to="/vagas">
                  Ver vagas abertas
                </Link>
                <a className="home-button home-button-light" href="#banco-de-talentos">
                  Banco de talentos
                </a>
              </nav>
            </div>
            <aside className="home-process" aria-labelledby="process-heading">
              <h2 id="process-heading">Processo seletivo digital</h2>
              <p>Conheça o caminho do seu talento até a nossa equipe.</p>
              <ol>
                <li>
                  <div>
                    <h3>Candidate-se</h3>
                    <p>Encontre uma oportunidade alinhada ao seu perfil profissional.</p>
                  </div>
                </li>
                <li>
                  <div>
                    <h3>Acompanhe</h3>
                    <p>Conheça as etapas do processo seletivo.</p>
                  </div>
                </li>
                <li>
                  <div>
                    <h3>Conecte-se</h3>
                    <p>Compartilhe seu talento com a Point Media.</p>
                  </div>
                </li>
              </ol>
            </aside>
          </div>
        </section>
        <section className="home-container home-jobs" id="vagas" aria-labelledby="jobs-heading">
          <h2 id="jobs-heading">Vagas disponíveis</h2>
          <p className="home-section-intro">
            Explore oportunidades e encontre a vaga que mais combina com seu perfil profissional.
          </p>
          <PublicJobs />
          <Link className="home-button home-button-light all-jobs-link" to="/vagas">
            Ver todas as vagas
          </Link>
        </section>
        <section
          className="home-container home-talent"
          id="banco-de-talentos"
          aria-labelledby="talent-heading"
        >
          <div className="home-talent-content">
            <h2 id="talent-heading">Não encontrou uma vaga ideal?</h2>
            <p>
              O Banco de Talentos reúne perfis profissionais para futuras oportunidades na Point
              Media.
            </p>
            <Link className="home-button" to="/banco-de-talentos">
              Cadastrar no banco de talentos
            </Link>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
