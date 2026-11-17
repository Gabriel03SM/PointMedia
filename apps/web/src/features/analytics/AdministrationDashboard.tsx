import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AccountShell } from '../../components/AccountShell';
import { Feedback } from '../../components/Feedback';
import { api } from '../../lib/api';
import { dateTimeLabel } from '../../lib/format';
import { MetricColumns } from './MetricCharts';
import { PeriodSelect } from './MetricFilters';
import '../candidates/candidates.css';
import './analytics.css';

const roles = { CANDIDATE: 'Candidatos', RECRUITER: 'Recrutadores', ADMIN: 'Administradores' };
const actions: Record<string, string> = {
  ACCOUNT_REGISTERED: 'Contas cadastradas',
  LOGIN: 'Entradas na conta',
  LOGOUT: 'Saídas da conta',
  PASSWORD_CHANGED: 'Senhas alteradas',
  ACCOUNT_UPDATED: 'Contas atualizadas',
  RECRUITER_CREATED: 'Recrutadores cadastrados',
  PROFESSIONAL_PROFILE_REMOVED: 'Perfis profissionais removidos',
  PROFESSIONAL_PROFILE_SAVED: 'Perfis profissionais salvos',
  TALENT_CONSENT_GRANTED: 'Adesões ao banco de talentos',
  TALENT_CONSENT_REVOKED: 'Saídas do banco de talentos',
  RESUME_DOWNLOAD_STARTED: 'Downloads de currículo iniciados',
  RESUME_REMOVED: 'Currículos removidos',
  RESUME_UPLOADED: 'Currículos enviados',
  JOB_CREATED: 'Vagas criadas',
  JOB_UPDATED: 'Vagas atualizadas',
  JOB_PUBLISHED: 'Vagas publicadas',
  JOB_CLOSED: 'Vagas encerradas',
  JOB_CANCELLED: 'Vagas canceladas',
  SCREENING_CONFIGURATION_SAVED: 'Critérios de triagem salvos',
  SCREENING_RUN_CREATED: 'Rankings gerados',
  APPLICATION_RECEIVED: 'Candidaturas recebidas',
  APPLICATION_STAGE_CHANGED: 'Etapas atualizadas',
  APPLICATION_NOTE_ADDED: 'Notas internas registradas',
};
export function AdministrationDashboard() {
  const [days, setDays] = useState(7);
  const summary = useQuery({
    queryKey: ['administration-metrics', days],
    queryFn: ({ signal }) => api.administrationMetrics(days, signal),
    staleTime: 0,
  });
  const data = summary.data;
  return (
    <AccountShell wide>
      <div className="metric-heading">
        <div>
          <h1>Dashboard Administrativo</h1>
          <p className="portal-intro">Visão geral da operação e dos acessos do sistema.</p>
        </div>
        <PeriodSelect days={days} onChange={setDays} />
      </div>
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
              Consulta em {dateTimeLabel(data.period.until)} · Brasília.{' '}
              <button className="text-button" onClick={() => void summary.refetch()}>
                Atualizar indicadores
              </button>
            </p>
            <div className="metric-stats">
              <article className="candidate-stat">
                <h2>usuários ativos</h2>
                <p>{data.activeUsers}</p>
              </article>
              <article className="candidate-stat">
                <h2>novos cadastros no período</h2>
                <p>{data.newUsers}</p>
              </article>
              <article className="candidate-stat">
                <h2>vagas monitoradas</h2>
                <p>{data.trackedJobs}</p>
              </article>
              <article className="candidate-stat">
                <h2>eventos no período</h2>
                <p>{data.auditEvents}</p>
              </article>
            </div>
            <div className="metric-grid admin-metric-grid">
              <section className="metric-panel">
                <h2>Atividade do sistema</h2>
                <MetricColumns days={data.daily} label="Eventos de auditoria por dia" />
              </section>
              <section className="metric-panel">
                <h2>Atividade agregada no período</h2>
                {!data.actions.length ? (
                  <p>Nenhuma atividade registrada no período.</p>
                ) : (
                  <ul className="metric-actions">
                    {data.actions.map((item) => (
                      <li key={item.action}>
                        <span>{actions[item.action] ?? 'Outras operações registradas'}</span>
                        <strong>{item.count}</strong>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="hint">
                  Até 10 ações mais frequentes. Sem dados pessoais ou conteúdo das operações.
                </p>
              </section>
              <section className="metric-panel metric-full">
                <h2>Resumo de acessos</h2>
                <table className="metric-table">
                  <thead>
                    <tr>
                      <th>Perfil</th>
                      <th>Contas</th>
                      <th>Ativas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.roles.map((row) => (
                      <tr key={row.role}>
                        <th scope="row">{roles[row.role]}</th>
                        <td>{row.total}</td>
                        <td>{row.active}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="actions">
                  <Link className="button secondary" to="/admin/metricas">
                    Consultar métricas de recrutamento
                  </Link>
                  <Link className="button secondary" to="/gestao/vagas">
                    Gerenciar vagas
                  </Link>
                </div>
              </section>
            </div>
          </>
        )
      )}
    </AccountShell>
  );
}
