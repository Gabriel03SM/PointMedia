import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { dateLabel } from '../../lib/format';
import { Brand } from '../../components/Brand';
import { Feedback } from '../../components/Feedback';
import './applications.css';
import { APPLICATION_STATUS_LABELS } from '@pointmedia/shared';
import { ApplicationHistory } from './ApplicationHistory';

export function ApplicationConfirmation() {
  const { id = '' } = useParams();
  const application = useQuery({
    queryKey: ['application', id],
    queryFn: ({ signal }) => api.application(id, signal),
    staleTime: 0,
  });
  return (
    <main className="application-confirmation">
      <section className="confirmation-card">
        <header>
          <h1>
            {application.data
              ? 'Sua candidatura foi enviada com sucesso!'
              : 'Comprovante de candidatura'}
          </h1>
          <Brand />
        </header>
        {application.isPending ? (
          <p role="status">Consultando candidatura…</p>
        ) : application.isError ? (
          <>
            <Feedback message={application.error.message} error />
            <button className="button" onClick={() => void application.refetch()}>
              Tentar novamente
            </button>
          </>
        ) : (
          <>
            <h2>O que acontece agora?</h2>
            <p>
              Nossa equipe poderá analisar seu perfil e currículo conforme os requisitos da vaga e
              entrar em contato para as próximas etapas do processo seletivo.
            </p>
            <dl className="confirmation-facts">
              <div>
                <dt>Vaga</dt>
                <dd>{application.data.job.title}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{APPLICATION_STATUS_LABELS[application.data.status]}</dd>
              </div>
              <div>
                <dt>Enviada em</dt>
                <dd>{dateLabel(application.data.submittedAt)}</dd>
              </div>
            </dl>
            <ApplicationHistory id={id} />
          </>
        )}
        <div className="actions">
          <Link className="button" to="/vagas">
            Ver mais vagas
          </Link>
          <Link className="button secondary" to="/candidato#minhas-candidaturas">
            Minhas candidaturas
          </Link>
          <Link className="button secondary" to="/">
            Voltar ao início
          </Link>
        </div>
      </section>
    </main>
  );
}
