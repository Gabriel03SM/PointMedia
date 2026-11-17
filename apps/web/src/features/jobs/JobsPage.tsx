import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { JOB_STATUSES, type Job, type JobStatus } from '@pointmedia/shared';
import { api } from '../../lib/api';
import {
  dateLabel,
  jobStatusLabels,
  money,
  seniorityLabels,
  workModeLabels,
} from '../../lib/format';
import { AccountShell } from '../../components/AccountShell';
import { Feedback } from '../../components/Feedback';
import { JobModal } from './JobModal';
import './jobs.css';
import { Link } from 'react-router-dom';
import { ScreeningJobPanel } from '../screening/ScreeningJobPanel';

export function JobsPage() {
  const cache = useQueryClient();
  const [q, setQ] = useState('');
  const [draftSearch, setDraftSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string>();
  const [modal, setModal] = useState<{ job?: Job }>();
  const [notice, setNotice] = useState<{ text: string; error?: boolean }>();
  const [pending, setPending] = useState(false);
  const query = new URLSearchParams({
    page: String(page),
    pageSize: '20',
    ...(q ? { q } : {}),
    ...(status ? { status } : {}),
  }).toString();
  const jobs = useQuery({
    queryKey: ['management-jobs', query],
    queryFn: ({ signal }) => api.jobs(query, signal),
  });
  const selected = jobs.data?.items.find((item) => item.id === selectedId) ?? jobs.data?.items[0];
  const refresh = async () => {
    await cache.invalidateQueries({ queryKey: ['management-jobs'] });
    await cache.invalidateQueries({ queryKey: ['public-jobs'] });
  };
  const change = async (next: Exclude<JobStatus, 'DRAFT'>) => {
    if (!selected) return;
    if (
      next === 'CANCELLED' &&
      !window.confirm(
        'Cancelar esta vaga? Ela deixará de ser pública e o histórico será preservado.',
      )
    )
      return;
    setPending(true);
    try {
      await api.jobStatus(selected, next);
      await refresh();
      setNotice({ text: `Vaga ${jobStatusLabels[next].toLowerCase()}.` });
    } catch (failure) {
      setNotice({
        text: failure instanceof Error ? failure.message : 'Não foi possível atualizar a vaga.',
        error: true,
      });
    } finally {
      setPending(false);
    }
  };
  return (
    <AccountShell wide>
      <header className="jobs-heading">
        <h1>Gestão de vagas</h1>
        <div className="jobs-heading-actions">
          <details className="jobs-picker">
            <summary>Selecionar vaga</summary>
            <div className="jobs-picker-panel">
              <form
                className="jobs-filters"
                onSubmit={(event) => {
                  event.preventDefault();
                  setQ(draftSearch);
                  setPage(1);
                }}
              >
                <input
                  aria-label="Buscar vagas"
                  placeholder="Buscar por título ou departamento…"
                  value={draftSearch}
                  onChange={(event) => setDraftSearch(event.target.value)}
                />
                <select
                  aria-label="Status da vaga"
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Todos os status</option>
                  {JOB_STATUSES.map((item) => (
                    <option value={item} key={item}>
                      {jobStatusLabels[item]}
                    </option>
                  ))}
                </select>
                <button className="button secondary">Buscar</button>
              </form>
              {jobs.data && jobs.data.items.length > 0 && (
                <label className="job-selector">
                  Vaga
                  <select
                    aria-label="Selecionar vaga"
                    value={selected?.id ?? ''}
                    onChange={(event) => setSelectedId(event.target.value)}
                  >
                    {jobs.data.items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title} — {jobStatusLabels[item.effectiveStatus]}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </details>
          <button className="button" onClick={() => setModal({})}>
            Criar vaga
          </button>
        </div>
      </header>
      <Feedback message={notice?.text} error={notice?.error} />
      {jobs.isPending ? (
        <p role="status">Carregando vagas…</p>
      ) : jobs.isError ? (
        <div>
          <Feedback message={jobs.error.message} error />
          <button className="button" onClick={() => void jobs.refetch()}>
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          <div className="jobs-panels">
            <section className="job-panel">
              {!selected ? (
                <div className="empty-state">
                  <h2>Nenhuma vaga encontrada</h2>
                  <p>Crie uma vaga ou ajuste a busca.</p>
                </div>
              ) : (
                <>
                  <h2>Vaga: {selected.title}</h2>
                  <span className={`job-status status-${selected.effectiveStatus.toLowerCase()}`}>
                    {jobStatusLabels[selected.effectiveStatus]}
                  </span>
                  <div className="field">
                    <label htmlFor="selected-job-title">Título</label>
                    <input id="selected-job-title" value={selected.title} readOnly />
                  </div>
                  <div className="job-form-columns">
                    <div className="field">
                      <label htmlFor="selected-job-level">Senioridade</label>
                      <input
                        id="selected-job-level"
                        value={
                          selected.seniority ? seniorityLabels[selected.seniority] : 'Não se aplica'
                        }
                        readOnly
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="selected-job-mode">Modalidade</label>
                      <input
                        id="selected-job-mode"
                        value={workModeLabels[selected.workMode]}
                        readOnly
                      />
                    </div>
                  </div>
                  <h3>Skills obrigatórias</h3>
                  <div className="skill-tags">
                    {selected.requiredSkills.length ? (
                      selected.requiredSkills.map((item) => <span key={item}>{item}</span>)
                    ) : (
                      <p className="hint">Nenhuma exigência informada.</p>
                    )}
                  </div>
                  <h3>Skills desejáveis</h3>
                  <div className="skill-tags desirable">
                    {selected.desiredSkills.length ? (
                      selected.desiredSkills.map((item) => <span key={item}>{item}</span>)
                    ) : (
                      <p className="hint">Nenhum diferencial informado.</p>
                    )}
                  </div>
                  <p className="job-description">{selected.description}</p>
                  <p>
                    {selected.locationNotApplicable
                      ? 'Localização: não se aplica'
                      : selected.location}
                  </p>
                  <p>
                    {selected.salaryNotApplicable
                      ? 'Faixa salarial: não se aplica'
                      : `${money(selected.salaryMin!)} a ${money(selected.salaryMax!)}`}
                  </p>
                  <p>
                    Inscrições até {dateLabel(selected.closesAt)},{' '}
                    {new Intl.DateTimeFormat('pt-BR', {
                      timeZone: 'America/Sao_Paulo',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date(selected.closesAt))}{' '}
                    (Brasília).
                  </p>
                  <div className="actions job-actions">
                    <Link
                      className="button secondary"
                      to={`/gestao/candidatos?vaga=${selected.id}`}
                    >
                      Ver candidaturas
                    </Link>
                    {['DRAFT', 'PUBLISHED'].includes(selected.effectiveStatus) && (
                      <button
                        className="button secondary"
                        disabled={pending}
                        onClick={() => setModal({ job: selected })}
                      >
                        Editar vaga
                      </button>
                    )}
                    {selected.effectiveStatus === 'DRAFT' && (
                      <button
                        className="button"
                        disabled={pending}
                        onClick={() => void change('PUBLISHED')}
                      >
                        Publicar vaga
                      </button>
                    )}
                    {selected.effectiveStatus === 'PUBLISHED' && (
                      <button
                        className="button"
                        disabled={pending}
                        onClick={() => void change('CLOSED')}
                      >
                        Encerrar vaga
                      </button>
                    )}
                    {selected.effectiveStatus !== 'CANCELLED' && (
                      <button
                        className="button secondary"
                        disabled={pending}
                        onClick={() => void change('CANCELLED')}
                      >
                        Cancelar vaga
                      </button>
                    )}
                  </div>
                </>
              )}
            </section>
            <section className="job-panel job-ranking">
              {selected ? (
                <ScreeningJobPanel key={selected.id} job={selected} />
              ) : (
                <h2>Candidatos rankeados</h2>
              )}
            </section>
          </div>
          {jobs.data.total > 20 && (
            <nav className="pagination" aria-label="Páginas de vagas">
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
      {modal && (
        <JobModal
          job={modal.job}
          onClose={() => setModal(undefined)}
          onSaved={(job) => {
            setModal(undefined);
            setSelectedId(job.id);
            setPage(1);
            setStatus('');
            setQ('');
            setDraftSearch('');
            setNotice({ text: 'Vaga salva.' });
            void refresh();
          }}
        />
      )}
    </AccountShell>
  );
}
