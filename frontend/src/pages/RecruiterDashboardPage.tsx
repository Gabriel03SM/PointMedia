import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import type { DashboardSummary, Job } from '../types';
import { api } from '../services/api';
import { Badge } from '../components/Badge';
import { ScoreGauge } from '../components/ScoreGauge';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
);

export const RecruiterDashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [sumData, jobsData] = await Promise.all([
        api.getDashboardSummary(),
        api.getRecruiterJobs(),
      ]);
      setSummary(sumData);
      setJobs(jobsData);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading || !summary) {
    return (
      <div className="page-container loading-container">
        <div className="spinner" />
        <p>Carregando painel de recrutamento...</p>
      </div>
    );
  }

  // Chart data for Recruitment Pipeline
  const pipelineLabels = summary.pipelineByStage.map((p) => p.stageName);
  const pipelineCounts = summary.pipelineByStage.map((p) => p.count);

  const barChartData = {
    labels: pipelineLabels,
    datasets: [
      {
        label: 'Candidatos por Etapa',
        data: pipelineCounts,
        backgroundColor: ['#5B9BD5', '#EC4899', '#111111', '#4CAF50', '#9C27B0'],
        borderRadius: 8,
      },
    ],
  };

  const doughnutData = {
    labels: ['Em Triagem Ativa', 'Aprovados / Finalistas', 'Novas Inscrições'],
    datasets: [
      {
        data: [summary.activeApplications, summary.hiredCount, summary.totalApplications - summary.activeApplications],
        backgroundColor: ['#5B9BD5', '#EC4899', '#E9E9E9'],
        borderWidth: 0,
      },
    ],
  };

  return (
    <div className="dashboard-page page-container">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">PAINEL DE GESTÃO &amp; SELEÇÃO</p>
          <h1>Dashboard - Recrutamento</h1>
        </div>
        <div className="dashboard-actions">
          <Link to="/recruiter/jobs/new" className="button button--primary">
            + Criar Nova Vaga
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card__icon kpi-card__icon--blue">💼</div>
          <div className="kpi-card__content">
            <span className="kpi-card__value">{summary.activeJobs}</span>
            <span className="kpi-card__label">Vagas Ativas ({summary.totalJobs} total)</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card__icon kpi-card__icon--pink">👥</div>
          <div className="kpi-card__content">
            <span className="kpi-card__value">{summary.totalApplications}</span>
            <span className="kpi-card__label">Total de Candidaturas</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card__icon kpi-card__icon--ink">⚡</div>
          <div className="kpi-card__content">
            <span className="kpi-card__value">{summary.activeApplications}</span>
            <span className="kpi-card__label">Em Processo Ativo</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card__icon kpi-card__icon--green">🎯</div>
          <div className="kpi-card__content">
            <span className="kpi-card__value">{summary.hiredCount}</span>
            <span className="kpi-card__label">Contratações Realizadas</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="dashboard-charts-grid">
        <div className="chart-card">
          <div className="chart-card__header">
            <h3>Funil de Processos Seletivos</h3>
            <span className="chart-subtitle">Distribuição por etapa atual</span>
          </div>
          <div className="chart-container">
            <Bar
              data={barChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: { beginAtZero: true, grid: { color: '#f0f0f0' } },
                  x: { grid: { display: false } },
                },
              }}
            />
          </div>
        </div>

        <div className="chart-card chart-card--compact">
          <div className="chart-card__header">
            <h3>Status Global</h3>
            <span className="chart-subtitle">Proporção da esteira</span>
          </div>
          <div className="chart-container chart-container--donut">
            <Doughnut
              data={doughnutData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom', labels: { boxWidth: 12, padding: 15 } },
                },
                cutout: '70%',
              }}
            />
          </div>
        </div>
      </div>

      {/* Active Jobs Quick Ranking Access */}
      <div className="dashboard-section">
        <div className="section-header-inline">
          <h2>vagas abertas &amp; triagem</h2>
          <Link to="/recruiter/jobs" className="link-more">
            Ver todas as vagas →
          </Link>
        </div>

        <div className="dashboard-jobs-table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Vaga / Posição</th>
                <th>Área</th>
                <th>Senioridade</th>
                <th>Candidatos</th>
                <th>Prazo</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td>
                    <div className="job-cell">
                      <strong>{job.title}</strong>
                      <span className="job-cell__loc">{job.location}</span>
                    </div>
                  </td>
                  <td>
                    <Badge variant="blue" size="sm">
                      {job.department}
                    </Badge>
                  </td>
                  <td>
                    <Badge variant="ink" size="sm">
                      {job.seniority}
                    </Badge>
                  </td>
                  <td>
                    <span className="count-badge">{job._count?.applications || 0} inscritos</span>
                  </td>
                  <td>{new Date(job.deadline).toLocaleDateString('pt-BR')}</td>
                  <td>
                    <Link
                      to={`/recruiter/jobs/${job.id}/ranking`}
                      className="button button--primary button--sm"
                    >
                      Abrir Ranking &amp; Triagem
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Applications Feed */}
      <div className="dashboard-section">
        <h2>candidaturas recentes</h2>
        <div className="recent-list">
          {summary.recentApplications.map((app) => (
            <div key={app.id} className="recent-item">
              <div className="recent-item__main">
                <ScoreGauge score={app.score} size="sm" showLabel={false} />
                <div>
                  <h4>{app.candidateName}</h4>
                  <span className="recent-item__job">{app.jobTitle}</span>
                </div>
              </div>

              <div className="recent-item__meta">
                <Badge variant="pink" size="sm">
                  {app.stageName}
                </Badge>
                <span className="recent-item__time">{app.appliedAt}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
