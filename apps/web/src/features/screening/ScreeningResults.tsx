import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Job, RankedCandidate } from '@pointmedia/shared';
import { api } from '../../lib/api';
import { dateLabel } from '../../lib/format';
import { Feedback } from '../../components/Feedback';
import { CandidateModal } from '../candidates/CandidateModal';

const labels = { SKILLS: 'Tecnologias', SENIORITY: 'Senioridade', SALARY: 'Pretensão salarial' };
const number = (value: number) =>
  new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value);
export function ScreeningResults({ job, compact = false }: { job: Job; compact?: boolean }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<RankedCandidate>();
  const pageSize = compact ? 5 : 20;
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    ...(q ? { q } : {}),
  }).toString();
  const ranking = useQuery({
    queryKey: ['screening', job.id, 'ranking', query],
    queryFn: ({ signal }) => api.screeningRanking(job.id, query, signal),
    staleTime: 0,
  });
  if (ranking.isPending) return <p role="status">Carregando ranking…</p>;
  if (ranking.isError)
    return (
      <>
        <Feedback message={ranking.error.message} error />
        <button className="button secondary" onClick={() => void ranking.refetch()}>
          Tentar novamente
        </button>
      </>
    );
  const data = ranking.data;
  return (
    <>
      {!compact && (
        <div className="screening-stats">
          <div className="candidate-stat">
            <h2>candidaturas</h2>
            <p>{data.applicationsCount}</p>
          </div>
          <div className="candidate-stat">
            <h2>avaliados na execução</h2>
            <p>{data.run?.evaluatedCount ?? 0}</p>
          </div>
          <div className="candidate-stat">
            <h2>revisão humana</h2>
            <p>{data.run?.reviewRequiredCount ?? 0}</p>
          </div>
        </div>
      )}
      <div className="screening-results">
        <header className="screening-results-heading">
          <h2>Ranking para {job.title}</h2>
          <button className="button secondary" onClick={() => void ranking.refetch()}>
            Atualizar consulta
          </button>
        </header>
        {data.stale && (
          <p className="screening-warning" role="alert">
            Ranking desatualizado: inscrições, perfis, vaga ou critérios mudaram. Reprocesse antes
            de usar esta comparação.
          </p>
        )}
        {data.unavailableProfiles > 0 && (
          <p>
            {data.unavailableProfiles} candidatura(s) sem perfil profissional disponível para
            avaliação.
          </p>
        )}
        {data.run ? (
          <p className="hint">
            Execução {data.run.sequence} de {dateLabel(data.run.createdAt)} · critérios v
            {data.run.configurationVersion} · {data.run.algorithmVersion}. Dados declarados;
            compatibilidade relativa somente a esta vaga.
          </p>
        ) : (
          <p>Nenhuma execução registrada. Salve os critérios e gere o ranking.</p>
        )}
        {!compact && (
          <form
            className="candidate-search screening-search"
            onSubmit={(event) => {
              event.preventDefault();
              setQ(search);
              setPage(1);
            }}
          >
            <input
              aria-label="Buscar no ranking"
              placeholder="Buscar candidato ou área…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <button className="button secondary">Buscar</button>
          </form>
        )}
        {data.run && !data.items.length && (
          <p className="empty-state">
            Nenhum candidato disponível neste resultado. Verifique inscrições e filtros.
          </p>
        )}
        <div>
          {data.items.map((item, index) => (
            <article className="screening-row" key={item.applicationId}>
              <span className="screening-position">{(page - 1) * pageSize + index + 1}</span>
              <div className="screening-candidate">
                <h3>{item.candidate.name}</h3>
                <p>{item.candidate.headline}</p>
                <p>Cobertura dos dados: {number(item.coverage)}%</p>
                {item.reviewRequired && (
                  <span className="screening-review">Revisão humana necessária</span>
                )}
                <details className="screening-explanation">
                  <summary>Entender pontuação</summary>
                  <p>
                    Perfil versão {item.profileVersion}. Critérios desconhecidos não significam
                    incompatibilidade.
                  </p>
                  {item.criteria.map((criterion) => (
                    <section key={criterion.key}>
                      <h4>
                        {labels[criterion.key]} — peso {criterion.weight}%
                      </h4>
                      <p>{criterion.explanation}</p>
                      <p>
                        {criterion.score === null
                          ? 'Sem nota neste critério'
                          : `Aderência ${number(criterion.score)}/100`}
                        {criterion.contribution === null
                          ? ''
                          : ` · contribuição ${number(criterion.contribution)} pontos`}
                      </p>
                      {criterion.notes.length > 0 && (
                        <ul>
                          {criterion.notes.map((note, n) => (
                            <li key={n}>{note}</li>
                          ))}
                        </ul>
                      )}
                    </section>
                  ))}
                  {item.reviewReasons.length > 0 && (
                    <>
                      <h4>Pontos para revisão</h4>
                      <ul>
                        {item.reviewReasons.map((reason, n) => (
                          <li key={n}>{reason}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </details>
              </div>
              <span
                className={`screening-score${item.score === null ? ' screening-score-pending' : ''}`}
              >
                {item.score === null ? 'Sem dados suficientes' : `Score ${number(item.score)}`}
              </span>
              <button className="button secondary" onClick={() => setSelected(item)}>
                Ver perfil
              </button>
            </article>
          ))}
        </div>
        {data.total > pageSize && (
          <nav className="pagination" aria-label="Páginas do ranking">
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
              disabled={page * pageSize >= data.total}
              onClick={() => setPage(page + 1)}
            >
              Próxima
            </button>
          </nav>
        )}
      </div>
      {selected && (
        <CandidateModal
          id={selected.candidate.userId}
          source={{ applicationId: selected.applicationId }}
          workMode={job.workMode}
          onClose={() => setSelected(undefined)}
        />
      )}
    </>
  );
}
