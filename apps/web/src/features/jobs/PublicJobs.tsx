import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { dateLabel, money, seniorityLabels, workModeLabels } from '../../lib/format';
import { Brand } from '../../components/Brand';
import { BackLink } from '../../components/BackLink';
import { Feedback } from '../../components/Feedback';
import { SubmissionForm } from '../applications/SubmissionForm';
import './jobs.css';

export function PublicJobs() {
  const [page, setPage] = useState(1);
  const jobs = useQuery({
    queryKey: ['public-jobs', page],
    queryFn: ({ signal }) => api.publicJobs(`page=${page}&pageSize=20`, signal),
  });
  if (jobs.isPending) return <p role="status">Carregando oportunidades…</p>;
  if (jobs.isError)
    return (
      <div className="home-notice">
        <Feedback message={jobs.error.message} error />
        <button className="button" onClick={() => void jobs.refetch()}>
          Tentar novamente
        </button>
      </div>
    );
  if (!jobs.data.items.length)
    return (
      <div className="home-notice">
        <h3>Nenhuma vaga aberta no momento</h3>
        <p>Acompanhe este espaço para conhecer as próximas oportunidades.</p>
      </div>
    );
  return (
    <>
      <div className="public-job-list">
        {jobs.data.items.map((job) => (
          <article className="public-job-card" key={job.id}>
            <div>
              <div className="public-job-labels">
                {job.publishedAt && Date.now() - Date.parse(job.publishedAt) < 7 * 86400000 && (
                  <span className="new-job">Novo</span>
                )}
                {job.seniority && <span>{seniorityLabels[job.seniority]}</span>}
              </div>
              <h3>{job.title}</h3>
            </div>
            <div className="public-job-action">
              <Link to={`/vagas/${job.id}`}>Ver vaga</Link>
              <p>Inscrições até {dateLabel(job.closesAt)}</p>
            </div>
          </article>
        ))}
      </div>
      {jobs.data.total > 20 && (
        <nav className="pagination" aria-label="Páginas de oportunidades">
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
  );
}

export function JobDetailsPage() {
  const { id = '' } = useParams();
  const job = useQuery({
    queryKey: ['public-job', id],
    queryFn: ({ signal }) => api.publicJob(id, signal),
    staleTime: 0,
  });
  return (
    <main className="public-job-details">
      <header className="public-form-header">
        <BackLink to="/vagas">Voltar às vagas</BackLink>
        <h1>Informações da vaga</h1>
        <Brand />
      </header>
      {job.isPending ? (
        <p className="center-message" role="status">
          Carregando vaga…
        </p>
      ) : job.isError ? (
        <div className="public-job-information">
          <Feedback message={job.error.message} error />
          <Link className="button" to="/vagas">
            Consultar vagas disponíveis
          </Link>
        </div>
      ) : (
        <>
          <section
            className="public-job-information job-overview"
            aria-labelledby="job-details-title"
          >
            <div className="job-overview-content">
              <h2 id="job-details-title">{job.data.title}</h2>
              <p className="job-description">{job.data.description}</p>
              <h3>Requisitos</h3>
              {job.data.requiredSkills.length ? (
                <ul>
                  {job.data.requiredSkills.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p>Nenhum requisito obrigatório informado.</p>
              )}
              {job.data.desiredSkills.length > 0 && (
                <>
                  <h3>Diferenciais</h3>
                  <ul>
                    {job.data.desiredSkills.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            <dl className="job-overview-facts">
              <div>
                <dt>Modalidade</dt>
                <dd>{workModeLabels[job.data.workMode]}</dd>
              </div>
              <div>
                <dt>Localização</dt>
                <dd>{job.data.location ?? 'Não se aplica'}</dd>
              </div>
              <div>
                <dt>Senioridade</dt>
                <dd>
                  {job.data.seniority ? seniorityLabels[job.data.seniority] : 'Não se aplica'}
                </dd>
              </div>
              <div>
                <dt>Faixa salarial</dt>
                <dd>
                  {job.data.salaryNotApplicable
                    ? 'Não se aplica'
                    : `${money(job.data.salaryMin!)} a ${money(job.data.salaryMax!)}`}
                </dd>
              </div>
              <div>
                <dt>Encerramento das inscrições</dt>
                <dd>
                  {dateLabel(job.data.closesAt)} às{' '}
                  {new Intl.DateTimeFormat('pt-BR', {
                    timeZone: 'America/Sao_Paulo',
                    hour: '2-digit',
                    minute: '2-digit',
                  }).format(new Date(job.data.closesAt))}{' '}
                  (Brasília)
                </dd>
              </div>
            </dl>
          </section>
          <SubmissionForm job={job.data} />
        </>
      )}
    </main>
  );
}
