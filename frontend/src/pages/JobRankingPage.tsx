import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { Job, RankingCandidate } from '../types';
import { api } from '../services/api';
import { Badge } from '../components/Badge';
import { ScoreGauge } from '../components/ScoreGauge';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';

export const JobRankingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [candidates, setCandidates] = useState<RankingCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState<RankingCandidate | null>(null);
  const [isEvalModalOpen, setIsEvalModalOpen] = useState(false);
  const [evalNotes, setEvalNotes] = useState('');
  const [evalDecision, setEvalDecision] = useState('APPROVE');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    const [jobData, rankingData] = await Promise.all([
      api.getOpenJobById(id),
      api.getJobRanking(id),
    ]);
    setJob(jobData);
    setCandidates(rankingData);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleAdvanceStage = async (candidate: RankingCandidate) => {
    if (!job?.stages) return;
    const currentOrder = candidate.currentStage?.order || 1;
    const nextStage = job.stages.find((s) => s.order === currentOrder + 1);

    if (!nextStage) {
      alert('O candidato já se encontra na última etapa!');
      return;
    }

    await api.moveApplicationStage(candidate.applicationId, nextStage.id, `Avançado para ${nextStage.name}`);
    
    // update local state
    setCandidates((prev) =>
      prev.map((c) =>
        c.applicationId === candidate.applicationId
          ? {
              ...c,
              currentStage: {
                id: nextStage.id,
                name: nextStage.name,
                order: nextStage.order,
              },
            }
          : c
      )
    );

    setActionSuccessMsg(`Candidato(a) ${candidate.candidateName} avançou para: ${nextStage.name}`);
    setTimeout(() => setActionSuccessMsg(''), 4000);
  };

  const handleOpenEvaluation = (cand: RankingCandidate) => {
    setSelectedCandidate(cand);
    setEvalNotes('');
    setEvalDecision('APPROVE');
    setIsEvalModalOpen(true);
  };

  const handleSaveEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) return;

    await api.evaluateApplication(selectedCandidate.applicationId, evalDecision, evalNotes);
    if (evalDecision === 'REJECT') {
      await api.updateApplicationStatus(selectedCandidate.applicationId, 'REJECTED');
    } else if (evalDecision === 'APPROVE') {
      await api.updateApplicationStatus(selectedCandidate.applicationId, 'APPROVED');
    }

    setIsEvalModalOpen(false);
    setActionSuccessMsg(`Avaliação registrada com sucesso para ${selectedCandidate.candidateName}!`);
    setTimeout(() => setActionSuccessMsg(''), 4000);
  };

  if (loading) {
    return (
      <div className="page-container loading-container">
        <div className="spinner" />
        <p>Carregando ranking e aderência de candidatos...</p>
      </div>
    );
  }

  return (
    <div className="ranking-page page-container">
      {/* Page Header */}
      <div className="ranking-header">
        <div>
          <Link to="/recruiter/jobs" className="back-link">
            ← Voltar para Gestão de Vagas
          </Link>
          <p className="eyebrow">RANKING &amp; TRIAGEM AUTOMATIZADA</p>
          <h1>Triagem e decisões</h1>
          <p className="ranking-subtitle">
            {job?.department} • {job?.location} • Prazo:{' '}
            {job?.deadline ? new Date(job.deadline).toLocaleDateString('pt-BR') : '-'}
          </p>
        </div>

        <div className="ranking-header__badges">
          <div className="score-summary-pill">
            <span>Fórmula de Score Ativa</span>
            <strong>Tech ({job?.skillsWeight}%) + Sen ({job?.seniorityWeight}%) + Sal ({job?.salaryWeight}%) + Dif ({job?.differentialsWeight}%)</strong>
          </div>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="toast-banner">
          <span>✓ {actionSuccessMsg}</span>
        </div>
      )}

      {/* Candidates Ranking Table */}
      <div className="ranking-table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>Pos.</th>
              <th>Candidato(a)</th>
              <th>Senioridade</th>
              <th>Pretensão</th>
              <th>Score de Compatibilidade</th>
              <th>Etapa Atual</th>
              <th style={{ textAlign: 'right' }}>Ações de Triagem</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((cand, index) => (
              <tr key={cand.applicationId} className={!cand.requiredCriteriaMet ? 'row--unmet' : ''}>
                <td>
                  <span className="ranking-position">#{index + 1}</span>
                </td>
                <td>
                  <div className="candidate-cell">
                    <strong className="candidate-cell__name">{cand.candidateName}</strong>
                    <span className="candidate-cell__email">{cand.candidateEmail}</span>
                    {!cand.requiredCriteriaMet && (
                      <Badge variant="warning" size="sm">
                        Requisito Obrigatório Pendente
                      </Badge>
                    )}
                  </div>
                </td>
                <td>
                  <Badge variant="ink" size="sm">
                    {cand.seniority || 'Pleno'}
                  </Badge>
                </td>
                <td>
                  {cand.expectedSalary ? (
                    <span className="salary-val">
                      R$ {cand.expectedSalary.toLocaleString('pt-BR')}
                    </span>
                  ) : (
                    <span className="text-muted">A combinar</span>
                  )}
                </td>
                <td>
                  <div className="score-cell">
                    <ScoreGauge
                      score={cand.score}
                      size="sm"
                      showLabel={false}
                      requiredCriteriaMet={cand.requiredCriteriaMet}
                    />
                    <div className="score-breakdown-mini">
                      <strong>{cand.score}%</strong>
                      {cand.breakdown && (
                        <span className="score-breakdown-details">
                          Tech {cand.breakdown.skillsScore}% • Sen {cand.breakdown.seniorityScore}%
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td>
                  <Badge variant="pink" size="sm">
                    {cand.currentStage?.name || 'Inscrição'}
                  </Badge>
                </td>
                <td>
                  <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedCandidate(cand)}
                    >
                      Ver Detalhes
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleAdvanceStage(cand)}
                    >
                      Avançar Etapa →
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEvaluation(cand)}
                      title="Registrar Avaliação"
                    >
                      📝
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Candidate Profile Modal */}
      {selectedCandidate && !isEvalModalOpen && (
        <Modal
          isOpen={!!selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
          title={`Triagem: ${selectedCandidate.candidateName}`}
          subtitle={selectedCandidate.candidateEmail}
          maxWidth="lg"
        >
          <div className="ranking-modal-content">
            <div className="modal-score-banner">
              <ScoreGauge
                score={selectedCandidate.score}
                size="lg"
                requiredCriteriaMet={selectedCandidate.requiredCriteriaMet}
              />
              <div className="modal-score-info">
                <h3>Aderência de {selectedCandidate.score}% para esta vaga</h3>
                <p>
                  {selectedCandidate.requiredCriteriaMet
                    ? 'O candidato atende aos requisitos indispensáveis cadastrados para a vaga.'
                    : 'Atenção: Um ou mais requisitos obrigatórios não foram declarados pelo candidato.'}
                </p>
                {selectedCandidate.breakdown && (
                  <div className="breakdown-grid">
                    <div className="breakdown-item">
                      <span>Tecnologias:</span>
                      <strong>{selectedCandidate.breakdown.skillsScore}%</strong>
                    </div>
                    <div className="breakdown-item">
                      <span>Senioridade:</span>
                      <strong>{selectedCandidate.breakdown.seniorityScore}%</strong>
                    </div>
                    <div className="breakdown-item">
                      <span>Fit Salarial:</span>
                      <strong>{selectedCandidate.breakdown.salaryScore}%</strong>
                    </div>
                    <div className="breakdown-item">
                      <span>Diferenciais:</span>
                      <strong>{selectedCandidate.breakdown.differentialsScore}%</strong>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="candidate-modal-section">
              <h4>Dados de Contato &amp; Links</h4>
              <div className="modal-info-grid">
                <div>
                  <strong>Telefone:</strong> {selectedCandidate.phone || 'Não informado'}
                </div>
                <div>
                  <strong>Pretensão Salarial:</strong>{' '}
                  {selectedCandidate.expectedSalary
                    ? `R$ ${selectedCandidate.expectedSalary.toLocaleString('pt-BR')}`
                    : 'A combinar'}
                </div>
                <div>
                  <strong>Data de Inscrição:</strong>{' '}
                  {new Date(selectedCandidate.appliedAt).toLocaleDateString('pt-BR')}
                </div>
              </div>

              <div className="links-row" style={{ marginTop: '16px' }}>
                {selectedCandidate.linkedin && (
                  <a
                    href={selectedCandidate.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="button button--secondary button--sm"
                  >
                    LinkedIn
                  </a>
                )}
                {selectedCandidate.portfolio && (
                  <a
                    href={selectedCandidate.portfolio}
                    target="_blank"
                    rel="noreferrer"
                    className="button button--secondary button--sm"
                  >
                    Portfólio
                  </a>
                )}
                {selectedCandidate.resumeUrl && (
                  <a
                    href={selectedCandidate.resumeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="button button--primary button--sm"
                  >
                    Currículo PDF
                  </a>
                )}
              </div>
            </div>

            <div className="modal-actions">
              <Button
                variant="outline"
                onClick={() => setSelectedCandidate(null)}
              >
                Fechar
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  handleAdvanceStage(selectedCandidate);
                  setSelectedCandidate(null);
                }}
              >
                Avançar para Próxima Etapa
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Evaluation Modal */}
      {isEvalModalOpen && selectedCandidate && (
        <Modal
          isOpen={isEvalModalOpen}
          onClose={() => setIsEvalModalOpen(false)}
          title={`Avaliação: ${selectedCandidate.candidateName}`}
          subtitle="Parecer do RH e Tomada de Decisão"
          maxWidth="md"
        >
          <form onSubmit={handleSaveEvaluation} className="eval-form">
            <div className="form-group">
              <label>Decisão do Recrutador</label>
              <select
                value={evalDecision}
                onChange={(e) => setEvalDecision(e.target.value)}
              >
                <option value="APPROVE">Aprovar / Recomendado para Contratação</option>
                <option value="HOLD">Manter em Standby</option>
                <option value="REJECT">Reprovar / Enviar Feedback</option>
              </select>
            </div>

            <div className="form-group">
              <label>Parecer / Anotações Internas</label>
              <textarea
                rows={4}
                required
                placeholder="Insira observações sobre a entrevista, fit cultural, alinhamento técnico ou pontos de atenção..."
                value={evalNotes}
                onChange={(e) => setEvalNotes(e.target.value)}
              />
            </div>

            <div className="modal-actions">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEvalModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="primary">
                Salvar Avaliação
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
