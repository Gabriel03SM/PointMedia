import React, { useEffect, useState } from 'react';
import type { Candidate } from '../types';
import { api } from '../services/api';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';

export const TalentPoolPage: React.FC = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [seniority, setSeniority] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  const fetchPool = async () => {
    setLoading(true);
    const data = await api.searchTalentPool({
      search: search || undefined,
      seniority: seniority || undefined,
    });
    setCandidates(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchPool();
  }, [seniority]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPool();
  };

  return (
    <div className="talent-pool-page page-container">
      <div className="page-header">
        <div>
          <p className="eyebrow">BANCO DE TALENTOS POINT MEDIA</p>
          <h1>Banco de talentos</h1>
        </div>
        <p className="page-subtitle">
          Base unificada e pesquisável de talentos para novos projetos e oportunidades em CRM, Mídia e Design.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <form onSubmit={handleSearchSubmit} className="talent-search-bar">
        <div className="search-input-wrap">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Buscar por nome, e-mail ou tecnologia..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          value={seniority}
          onChange={(e) => setSeniority(e.target.value)}
          className="talent-select"
        >
          <option value="">Todas as Senioridades</option>
          <option value="INTERN">Estágio</option>
          <option value="JUNIOR">Júnior</option>
          <option value="MID">Pleno</option>
          <option value="SENIOR">Sênior</option>
          <option value="SPECIALIST">Especialista</option>
        </select>

        <button type="submit" className="button button--primary">
          Filtrar Talentos
        </button>
      </form>

      {/* Candidates List / Grid */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Buscando no banco de talentos...</p>
        </div>
      ) : candidates.length === 0 ? (
        <div className="empty-state">
          <h3>Nenhum talento encontrado</h3>
          <p>Tente ajustar os termos de busca ou filtros de senioridade.</p>
        </div>
      ) : (
        <div className="talent-grid">
          {candidates.map((cand) => (
            <div key={cand.id} className="talent-card">
              <div className="talent-card__header">
                <div className="talent-avatar">
                  {cand.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')}
                </div>
                <div>
                  <h3 className="talent-name">{cand.name}</h3>
                  <span className="talent-email">{cand.email}</span>
                </div>
              </div>

              <div className="talent-meta">
                <Badge variant="ink" size="sm">
                  {cand.seniority || 'Pleno'}
                </Badge>
                {cand.expectedSalary && (
                  <Badge variant="blue" size="sm">
                    R$ {cand.expectedSalary.toLocaleString('pt-BR')} / mês
                  </Badge>
                )}
                {cand.phone && <span className="talent-phone">📞 {cand.phone}</span>}
              </div>

              {cand.bio && <p className="talent-bio">{cand.bio}</p>}

              {cand.skills && cand.skills.length > 0 && (
                <div className="talent-skills">
                  {cand.skills.map((s, idx) => (
                    <span key={idx} className="skill-pill">
                      {s.name || s.skill?.name}
                    </span>
                  ))}
                </div>
              )}

              <div className="talent-card__footer">
                <div className="talent-links">
                  {cand.linkedin && (
                    <a
                      href={cand.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-icon"
                      title="LinkedIn"
                    >
                      in
                    </a>
                  )}
                  {cand.portfolio && (
                    <a
                      href={cand.portfolio}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-icon"
                      title="Portfólio"
                    >
                      🎨
                    </a>
                  )}
                </div>
                <button
                  onClick={() => setSelectedCandidate(cand)}
                  className="button button--secondary button--sm"
                >
                  Ver Perfil Completo
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Candidate Profile Modal */}
      {selectedCandidate && (
        <Modal
          isOpen={!!selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
          title={selectedCandidate.name}
          subtitle={selectedCandidate.email}
          maxWidth="md"
        >
          <div className="candidate-modal-content">
            <div className="candidate-modal-section">
              <h4>Informações Profissionais</h4>
              <div className="modal-info-grid">
                <div>
                  <strong>Senioridade:</strong> {selectedCandidate.seniority || 'Não informada'}
                </div>
                <div>
                  <strong>Pretensão Salarial:</strong>{' '}
                  {selectedCandidate.expectedSalary
                    ? `R$ ${selectedCandidate.expectedSalary.toLocaleString('pt-BR')}`
                    : 'A combinar'}
                </div>
                <div>
                  <strong>Telefone:</strong> {selectedCandidate.phone || 'Não informado'}
                </div>
              </div>
            </div>

            {selectedCandidate.bio && (
              <div className="candidate-modal-section">
                <h4>Resumo / Apresentação</h4>
                <p>{selectedCandidate.bio}</p>
              </div>
            )}

            {selectedCandidate.skills && selectedCandidate.skills.length > 0 && (
              <div className="candidate-modal-section">
                <h4>Competências e Nível</h4>
                <div className="skills-grid">
                  {selectedCandidate.skills.map((sk, idx) => (
                    <div key={idx} className="skill-card">
                      <span className="skill-card__name">{sk.name || sk.skill?.name}</span>
                      <span className="skill-card__type">{sk.level || 'Dominado'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="candidate-modal-section">
              <h4>Links e Documentos</h4>
              <div className="links-row">
                {selectedCandidate.linkedin && (
                  <a
                    href={selectedCandidate.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="button button--secondary button--sm"
                  >
                    Abrir LinkedIn
                  </a>
                )}
                {selectedCandidate.portfolio && (
                  <a
                    href={selectedCandidate.portfolio}
                    target="_blank"
                    rel="noreferrer"
                    className="button button--secondary button--sm"
                  >
                    Ver Portfólio
                  </a>
                )}
                {selectedCandidate.resumeUrl && (
                  <a
                    href={selectedCandidate.resumeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="button button--primary button--sm"
                  >
                    Baixar Currículo PDF
                  </a>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
