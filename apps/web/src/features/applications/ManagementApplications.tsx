import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { dateLabel } from '../../lib/format';
import { CandidateModal } from '../candidates/CandidateModal';
import { Feedback } from '../../components/Feedback';
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  type ApplicationStatus,
  type ManagementApplication,
} from '@pointmedia/shared';

export function ManagementApplications({ jobId }: { jobId?: string }) {
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ApplicationStatus | ''>('');
  const [selected, setSelected] = useState<ManagementApplication>();
  const query = new URLSearchParams({
    page: String(page),
    pageSize: '20',
    ...(jobId ? { jobId } : {}),
    ...(q ? { q } : {}),
    ...(status ? { status } : {}),
  }).toString();
  const applications = useQuery({
    queryKey: ['management-applications', query],
    queryFn: ({ signal }) => api.managementApplications(query, signal),
  });
  return (
    <section>
      <div className="candidates-top">
        <form
          className="candidate-search"
          onSubmit={(event) => {
            event.preventDefault();
            setQ(search);
            setPage(1);
          }}
        >
          <input
            aria-label="Buscar candidaturas"
            placeholder="Buscar por candidato ou vaga…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <button className="button secondary">Buscar</button>
        </form>
        <div className="candidate-stat">
          <h2>candidaturas recebidas</h2>
          <p>{applications.data?.total ?? '—'}</p>
        </div>
      </div>
      <div className="candidate-filters">
        <select
          aria-label="Filtrar candidaturas por etapa"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as ApplicationStatus | '');
            setPage(1);
          }}
        >
          <option value="">Todas as etapas</option>
          {APPLICATION_STATUSES.map((value) => (
            <option key={value} value={value}>
              {APPLICATION_STATUS_LABELS[value]}
            </option>
          ))}
        </select>
      </div>
      {applications.isPending ? (
        <p role="status">Carregando candidaturas…</p>
      ) : applications.isError ? (
        <>
          <Feedback message={applications.error.message} error />
          <button className="button" onClick={() => void applications.refetch()}>
            Tentar novamente
          </button>
        </>
      ) : (
        <>
          {!applications.data.items.length && (
            <p className="empty-state">Nenhuma candidatura encontrada.</p>
          )}
          <div className="candidate-list">
            {applications.data.items.map((item) => (
              <article className="candidate-row" key={item.id}>
                <div>
                  <h2>{item.candidate.name}</h2>
                  <p>{item.candidate.headline ?? 'Perfil removido'}</p>
                </div>
                <div>
                  <h3>{item.job.title}</h3>
                  <p>{dateLabel(item.submittedAt)}</p>
                </div>
                <span className="candidate-shared">{APPLICATION_STATUS_LABELS[item.status]}</span>
                <button className="button secondary" onClick={() => setSelected(item)}>
                  Ver perfil
                </button>
              </article>
            ))}
          </div>
          {applications.data.total > 20 && (
            <nav className="pagination" aria-label="Páginas de candidaturas">
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
                disabled={page * 20 >= applications.data.total}
                onClick={() => setPage(page + 1)}
              >
                Próxima
              </button>
            </nav>
          )}
        </>
      )}
      {selected && (
        <CandidateModal
          id={selected.candidate.userId}
          source={{ applicationId: selected.id }}
          workMode={selected.job.workMode}
          onClose={() => setSelected(undefined)}
        />
      )}
    </section>
  );
}
