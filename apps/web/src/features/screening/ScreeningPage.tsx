import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { AccountShell } from '../../components/AccountShell';
import { Feedback } from '../../components/Feedback';
import { ScreeningControls } from './ScreeningControls';
import { ScreeningResults } from './ScreeningResults';

export function ScreeningPage() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const jobs = useQuery({
    queryKey: ['management-jobs', 'screening', page, q],
    queryFn: ({ signal }) =>
      api.jobs(
        new URLSearchParams({ page: String(page), pageSize: '20', ...(q ? { q } : {}) }).toString(),
        signal,
      ),
  });
  const id = params.get('vaga') ?? jobs.data?.items[0]?.id;
  const job = useQuery({
    queryKey: ['management-job', id],
    queryFn: ({ signal }) => api.job(id!, signal),
    enabled: Boolean(id),
    staleTime: 0,
  });
  return (
    <AccountShell wide>
      <h1>Triagem e decisões</h1>
      <p className="portal-intro">
        Compatibilidade explicável por vaga. Decisões e etapas permanecem sob responsabilidade
        humana.
      </p>
      <form
        className="candidate-search"
        onSubmit={(event) => {
          event.preventDefault();
          setQ(search);
          setPage(1);
        }}
      >
        <input
          aria-label="Buscar vaga para triagem"
          placeholder="Buscar vaga…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button className="button secondary">Buscar vaga</button>
      </form>
      {jobs.isPending ? (
        <p role="status">Carregando vagas…</p>
      ) : jobs.isError ? (
        <>
          <Feedback message={jobs.error.message} error />
          <button className="button secondary" onClick={() => void jobs.refetch()}>
            Tentar novamente
          </button>
        </>
      ) : (
        <div className="screening-job-picker">
          <label className="field">
            Vaga para triagem
            <select
              aria-label="Vaga para triagem"
              value={id ?? ''}
              onChange={(event) => setParams({ vaga: event.target.value })}
            >
              {id && !jobs.data.items.some((item) => item.id === id) && (
                <option value={id}>{job.data?.title ?? 'Vaga selecionada'}</option>
              )}
              {!jobs.data.items.length && !id && <option value="">Nenhuma vaga encontrada</option>}
              {jobs.data.items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
          {jobs.data.total > 20 && (
            <nav className="pagination" aria-label="Páginas de vagas para triagem">
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
                disabled={page * 20 >= jobs.data.total}
                onClick={() => setPage(page + 1)}
              >
                Próxima
              </button>
            </nav>
          )}
        </div>
      )}
      {id &&
        (job.isPending ? (
          <p role="status">Carregando vaga selecionada…</p>
        ) : job.isError ? (
          <>
            <Feedback message={job.error.message} error />
            <button className="button secondary" onClick={() => void job.refetch()}>
              Atualizar vaga
            </button>
          </>
        ) : (
          <div key={id}>
            <ScreeningControls job={job.data} />
            <ScreeningResults job={job.data} />
          </div>
        ))}
    </AccountShell>
  );
}
