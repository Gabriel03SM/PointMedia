import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { APPLICATION_STATUS_LABELS } from '@pointmedia/shared';
import { AccountShell } from '../../components/AccountShell';
import { Brand } from '../../components/Brand';
import { Feedback } from '../../components/Feedback';
import { api } from '../../lib/api';
import { seniorityLabels, dateTimeLabel } from '../../lib/format';
import { MetricBars, MetricColumns } from './MetricCharts';
import { MetricJobFilter, PeriodSelect } from './MetricFilters';
import '../candidates/candidates.css';
import './analytics.css';

const number = (value: number) =>
  new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value);
export function RecruitmentDashboard({ metrics = false }: { metrics?: boolean }) {
  const [params, setParams] = useSearchParams();
  const days = [7, 30, 90, 365].includes(Number(params.get('dias')))
    ? Number(params.get('dias'))
    : 30;
  const id = params.get('vaga') ?? '';
  const query = new URLSearchParams({
    days: String(days),
    ...(id ? { jobId: id } : {}),
  }).toString();
  const change = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  };
  const summary = useQuery({
    queryKey: ['recruitment-metrics', query],
    queryFn: ({ signal }) => api.recruitmentMetrics(query, signal),
    staleTime: 0,
  });
  const intelligence = useQuery({
    queryKey: ['intelligence-status'],
    queryFn: ({ signal }) => api.intelligenceStatus(signal),
  });
  const data = summary.data;
  return (
    <AccountShell wide>
      <div className="metric-heading">
        <div>
          <h1>{metrics ? 'Métricas gerais' : 'Dashboard - Recrutamento'}</h1>
          <p className="portal-intro">
            {metrics
              ? 'Acompanhe volume, conversão e andamento dos processos.'
              : 'Visão geral dos perfis autorizados, vagas e candidaturas.'}
          </p>
        </div>
        <PeriodSelect days={days} onChange={(value) => change('dias', String(value))} />
        {data && (
          <a className="button" href={`/api/analytics/recruitment/export?${query}`}>
            Exportar CSV
          </a>
        )}
      </div>
      <MetricJobFilter id={id} onChange={(value) => change('vaga', value)} />
      {summary.isPending ? (
        <p role="status">Calculando indicadores…</p>
      ) : summary.isError ? (
        <>
          <Feedback message={summary.error.message} error />
          <button className="button" onClick={() => void summary.refetch()}>
            Tentar novamente
          </button>
        </>
      ) : (
        data && (
          <>
            <p className="metric-asof">
              Consulta em {dateTimeLabel(data.period.until)} · dias de calendário em Brasília.{' '}
              <button className="text-button" onClick={() => void summary.refetch()}>
                Atualizar indicadores
              </button>
            </p>
            <div className="metric-stats">
              {metrics ? (
                <>
                  <article className="candidate-stat">
                    <h2>conversão da coorte</h2>
                    <p>{data.conversion === null ? 'Sem dados' : `${number(data.conversion)}%`}</p>
                    <small>{data.applications} candidatura(s) no período</small>
                  </article>
                  <article className="candidate-stat">
                    <h2>match médio da vaga</h2>
                    <p>
                      {data.compatibility?.averageScore == null
                        ? 'Indisponível'
                        : `${number(data.compatibility.averageScore)}/100`}
                    </p>
                    <small>Última execução atualizada; somente a vaga selecionada</small>
                  </article>
                  <article className="candidate-stat">
                    <h2>tempo até triagem</h2>
                    <p>
                      {data.triage.averageHours === null
                        ? 'Sem dados'
                        : `${number(data.triage.averageHours / 24)} dias`}
                    </p>
                    <small>Amostra: {data.triage.sample} candidatura(s)</small>
                  </article>
                  <div className="metric-brand">
                    <Brand tone="light" />
                  </div>
                </>
              ) : (
                <>
                  <article className="candidate-stat">
                    <h2>talentos ativos</h2>
                    <p>{data.profiles.talent}</p>
                  </article>
                  <article className="candidate-stat">
                    <h2>perfis do mês</h2>
                    <p>{data.profiles.month}</p>
                  </article>
                  <article className="candidate-stat">
                    <h2>vagas abertas</h2>
                    <p>{data.openJobs}</p>
                  </article>
                  <article className="candidate-stat">
                    <h2>candidaturas no período</h2>
                    <p>{data.applications}</p>
                  </article>
                </>
              )}
            </div>
            <div className="metric-grid">
              <section className="metric-panel">
                <h2>{metrics ? 'Funil de acompanhamento' : 'Candidatos por senioridade'}</h2>
                <MetricBars
                  label={
                    metrics ? 'Etapas alcançadas pela coorte' : 'Senioridade dos perfis disponíveis'
                  }
                  items={
                    metrics
                      ? data.funnel
                          .filter((row) => row.status !== 'REJECTED')
                          .map((row) => ({
                            label: APPLICATION_STATUS_LABELS[row.status],
                            count: row.count,
                          }))
                      : data.seniority.map((row) => ({
                          label: row.seniority ? seniorityLabels[row.seniority] : 'Não informada',
                          count: row.count,
                        }))
                  }
                />
                <p className="hint">
                  {metrics
                    ? 'Conta cada etapa alcançada, inclusive por quem avançou ou foi reprovado depois.'
                    : `${data.profiles.available} perfil(is) disponíveis por autorização. Não informada inclui Não se aplica.`}
                </p>
              </section>
              <section className="metric-panel">
                <h2>{metrics ? 'Candidaturas por etapa atual' : 'Compatibilidade por vaga'}</h2>
                {metrics ? (
                  <MetricBars
                    label="Etapas atuais"
                    items={data.stages.map((row) => ({
                      label: APPLICATION_STATUS_LABELS[row.status],
                      count: row.count,
                    }))}
                  />
                ) : (
                  <Compatibility id={id} data={data.compatibility} />
                )}
              </section>
              <section className="metric-panel metric-full">
                <h2>{days > 30 ? 'Evolução mensal das candidaturas' : 'Candidaturas por dia'}</h2>
                <MetricColumns days={data.daily} label="Volume de candidaturas" />
              </section>
              {metrics ? (
                <section className="metric-panel metric-full">
                  <h2>Compatibilidade por vaga</h2>
                  <Compatibility id={id} data={data.compatibility} />
                  <p className="hint">
                    Conversão usa aprovações atuais da coorte; processos em andamento ainda podem
                    mudar. Origem dos candidatos não é coletada pelo cadastro atual.
                  </p>
                </section>
              ) : (
                <>
                  <section className="metric-panel">
                    <h2>Andamento das candidaturas</h2>
                    <MetricBars
                      label="Etapas atuais"
                      items={data.stages.map((row) => ({
                        label: APPLICATION_STATUS_LABELS[row.status],
                        count: row.count,
                      }))}
                    />
                    <Link
                      to={`/gestao/candidatos?aba=candidaturas${id ? `&vaga=${encodeURIComponent(id)}` : ''}`}
                    >
                      Acompanhar candidaturas
                    </Link>
                  </section>
                  <section className="metric-panel">
                    <h2>Apoio de IA</h2>
                    {intelligence.isPending ? (
                      <p role="status">Consultando disponibilidade…</p>
                    ) : intelligence.isError ? (
                      <>
                        <Feedback message={intelligence.error.message} error />
                        <button
                          className="button secondary"
                          onClick={() => void intelligence.refetch()}
                        >
                          Consultar novamente
                        </button>
                      </>
                    ) : (
                      <p>
                        {intelligence.data.available
                          ? 'Provedor disponível para apoio ao RH.'
                          : intelligence.data.reason}
                      </p>
                    )}
                    <p>A triagem determinística e as decisões humanas continuam disponíveis.</p>
                    <Link
                      to={id ? `/gestao/triagem?vaga=${encodeURIComponent(id)}` : '/gestao/triagem'}
                    >
                      Consultar triagem
                    </Link>
                  </section>
                </>
              )}
            </div>
          </>
        )
      )}
    </AccountShell>
  );
}

function Compatibility({
  id,
  data,
}: {
  id: string;
  data: import('@pointmedia/shared').CompatibilityMetrics | null;
}) {
  if (!id)
    return (
      <p>
        Selecione uma vaga para consultar sua compatibilidade. Scores de vagas diferentes não são
        comparados.
      </p>
    );
  if (!data)
    return (
      <p>
        A vaga ainda não possui uma execução de triagem.{' '}
        <Link to={`/gestao/triagem?vaga=${encodeURIComponent(id)}`}>
          Configurar e gerar ranking
        </Link>
      </p>
    );
  if (data.stale)
    return (
      <p role="alert">
        Ranking desatualizado.{' '}
        <Link to={`/gestao/triagem?vaga=${encodeURIComponent(id)}`}>Reprocesse a triagem</Link> para
        consultar os indicadores de compatibilidade.
      </p>
    );
  return (
    <>
      <MetricBars
        label="Faixas disjuntas de compatibilidade"
        items={[...data.bands, { label: 'Sem nota', count: data.withoutScore }]}
      />
      <p className="hint">
        {data.total} perfil(is) avaliados da coorte. Execução de {dateTimeLabel(data.generatedAt)}.
        Ausência de dados não recebe zero.
      </p>
    </>
  );
}
