import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { dateLabel } from '../../lib/format';
import { Feedback } from '../../components/Feedback';
import './applications.css';
import { APPLICATION_STATUS_LABELS } from '@pointmedia/shared';
import { ApplicationHistory } from './ApplicationHistory';

export function MyApplications() {
  const [page, setPage] = useState(1);
  const applications = useQuery({
    queryKey: ['my-applications', page],
    queryFn: ({ signal }) => api.applications(`page=${page}&pageSize=10`, signal),
  });
  return (
    <section className="my-applications" id="minhas-candidaturas">
      <h2>Minhas candidaturas</h2>
      {applications.isPending ? (
        <p>Carregando candidaturas…</p>
      ) : applications.isError ? (
        <>
          <Feedback message={applications.error.message} error />
          <button className="button secondary" onClick={() => void applications.refetch()}>
            Tentar novamente
          </button>
        </>
      ) : (
        <>
          {!applications.data.items.length && (
            <p>
              Você ainda não enviou candidaturas. <Link to="/vagas">Consultar vagas</Link>
            </p>
          )}
          {applications.data.items.map((item) => (
            <article className="application-row" key={item.id}>
              <div>
                <h3>{item.job.title}</h3>
                <p>Recebida em {dateLabel(item.submittedAt)}</p>
              </div>
              <span>{APPLICATION_STATUS_LABELS[item.status]}</span>
              <Link className="button secondary" to={`/candidaturas/${item.id}/confirmacao`}>
                Ver comprovante
              </Link>
              <ApplicationHistory id={item.id} />
            </article>
          ))}
          {applications.data.total > 10 && (
            <nav className="pagination" aria-label="Páginas de minhas candidaturas">
              <button
                className="button secondary"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Anterior
              </button>
              <span>Página {page}</span>
              <button
                className="button secondary"
                disabled={page * 10 >= applications.data.total}
                onClick={() => setPage(page + 1)}
              >
                Próxima
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
