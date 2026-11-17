import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Feedback } from '../../components/Feedback';

export function PeriodSelect({
  days,
  onChange,
}: {
  days: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="field">
      Período
      <select
        aria-label="Período dos indicadores"
        value={days}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {[7, 30, 90, 365].map((value) => (
          <option key={value} value={value}>
            {value} dias
          </option>
        ))}
      </select>
    </label>
  );
}
export function MetricJobFilter({ id, onChange }: { id: string; onChange: (id: string) => void }) {
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const jobs = useQuery({
    queryKey: ['management-jobs', 'metrics', q, page],
    queryFn: ({ signal }) =>
      api.jobs(new URLSearchParams({ q, page: String(page), pageSize: '20' }).toString(), signal),
  });
  const selected = useQuery({
    queryKey: ['management-job', id],
    queryFn: ({ signal }) => api.job(id, signal),
    enabled: !!id,
  });
  return (
    <div className="metric-job-filter">
      <form
        className="candidate-search"
        onSubmit={(event) => {
          event.preventDefault();
          setQ(search);
          setPage(1);
        }}
      >
        <input
          aria-label="Buscar vaga para indicadores"
          placeholder="Buscar vaga…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          maxLength={120}
        />
        <button className="button secondary">Buscar vaga</button>
      </form>
      {jobs.isPending ? (
        <p role="status">Carregando vagas…</p>
      ) : jobs.isError ? (
        <>
          <Feedback message={jobs.error.message} error />
          <button className="button secondary" onClick={() => void jobs.refetch()}>
            Atualizar vagas
          </button>
        </>
      ) : (
        <>
          <label className="field">
            Vaga
            <select
              aria-label="Vaga dos indicadores"
              value={id}
              onChange={(event) => onChange(event.target.value)}
            >
              <option value="">Todas as vagas</option>
              {id && !jobs.data.items.some((job) => job.id === id) && (
                <option value={id}>{selected.data?.title ?? 'Vaga selecionada'}</option>
              )}
              {jobs.data.items.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
          </label>
          {jobs.data.total > 20 && (
            <nav className="pagination" aria-label="Páginas de vagas dos indicadores">
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
        </>
      )}
    </div>
  );
}
