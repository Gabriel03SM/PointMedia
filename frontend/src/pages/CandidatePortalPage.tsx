import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Application } from '../types';
import { api } from '../services/api';
import { Badge } from '../components/Badge';
import { ScoreGauge } from '../components/ScoreGauge';
import { useAuth } from '../context/AuthContext';

export const CandidatePortalPage: React.FC = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const data = await api.getCandidateApplications();
      setApplications(data);
      setLoading(false);
    };
    fetchData();
  }, []);

  return (
    <div className="candidate-portal-page page-container">
      <div className="portal-header">
        <div>
          <p className="eyebrow">ÁREA EXCLUSIVA DO CANDIDATO</p>
          <h1>olá, {user?.name || 'candidato(a)'}!</h1>
          <p className="portal-subtitle">
            Acompanhe em tempo real o status, pontuação de aderência e histórico das suas candidaturas na Point Media.
          </p>
        </div>
        <Link to="/" className="button button--primary">
          Explorar Mais Vagas
        </Link>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Carregando suas candidaturas...</p>
        </div>
      ) : applications.length === 0 ? (
        <div className="empty-state">
          <h3>Nenhuma candidatura ativa</h3>
          <p>Você ainda não se candidatou a nenhuma oportunidade aberta.</p>
          <Link to="/" className="button button--primary" style={{ marginTop: '16px' }}>
            Ver Vagas Abertas
          </Link>
        </div>
      ) : (
        <div className="applications-feed">
          {applications.map((app) => (
            <div key={app.id} className="candidate-app-card">
              <div className="candidate-app-card__header">
                <div>
                  <div className="badges-wrap">
                    <Badge variant="blue">{app.job.department}</Badge>
                    <Badge variant="ink">{app.job.seniority}</Badge>
                    <Badge variant="pink">{app.status === 'ACTIVE' ? 'Em Andamento' : app.status}</Badge>
                  </div>
                  <h2 className="app-job-title">{app.job.title}</h2>
                  <p className="app-meta">
                    Inscrição realizada em:{' '}
                    {new Date(app.createdAt).toLocaleDateString('pt-BR')} • {app.job.location}
                  </p>
                </div>

                <div className="app-score-wrap">
                  <ScoreGauge score={app.score} size="md" />
                </div>
              </div>

              {/* Stage Progress Stepper */}
              <div className="timeline-section">
                <h4>Etapa Atual do Processo</h4>
                <div className="stepper-track">
                  {app.job.stages
                    ?.sort((a, b) => a.order - b.order)
                    .map((stage) => {
                      const currentOrder = app.currentStage?.order || 1;
                      const isCompleted = stage.order < currentOrder;
                      const isCurrent = stage.order === currentOrder;

                      return (
                        <div
                          key={stage.id}
                          className={`stepper-node ${
                            isCompleted
                              ? 'stepper-node--completed'
                              : isCurrent
                              ? 'stepper-node--current'
                              : 'stepper-node--future'
                          }`}
                        >
                          <div className="stepper-node__circle">
                            {isCompleted ? '✓' : stage.order}
                          </div>
                          <span className="stepper-node__label">{stage.name}</span>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Stage History & Feedback Log */}
              {app.stageHistories && app.stageHistories.length > 0 && (
                <div className="history-section">
                  <h4>Histórico &amp; Atualizações</h4>
                  <div className="history-list">
                    {app.stageHistories.map((hist) => (
                      <div key={hist.id} className="history-item">
                        <span className="history-dot" />
                        <div className="history-content">
                          <strong>{hist.stage.name}</strong>
                          <p>{hist.note || 'Movimentação registrada pelo time de recrutamento.'}</p>
                          <small>{new Date(hist.changedAt).toLocaleDateString('pt-BR')}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
