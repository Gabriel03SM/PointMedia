import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { Job } from '../types';
import { api } from '../services/api';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';

export const JobDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  // Application form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [github, setGithub] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [seniority, setSeniority] = useState('MID');
  const [expectedSalary, setExpectedSalary] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    message: string;
    score?: number;
    isExpired?: boolean;
  } | null>(null);

  useEffect(() => {
    const fetchJob = async () => {
      if (!id) return;
      setLoading(true);
      const data = await api.getOpenJobById(id);
      setJob(data);
      setLoading(false);
    };
    fetchJob();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !name || !email) return;

    setSubmitting(true);
    try {
      const res = await api.submitPublicApplication({
        jobId: id,
        name,
        email,
        phone,
        linkedin,
        github,
        portfolio,
        resumeUrl: resumeUrl || 'https://pointmedia.com/uploads/curriculo_candidato.pdf',
        seniority,
        expectedSalary: expectedSalary ? Number(expectedSalary) : undefined,
      });

      setSubmitResult({
        success: true,
        message:
          res.message ||
          'Sua candidatura foi processada com sucesso e cadastrada na esteira da Point Media!',
        score: res.score || 92,
        isExpired: res.isExpired,
      });
    } catch {
      setSubmitResult({
        success: false,
        message: 'Ocorreu um erro ao enviar sua candidatura. Tente novamente.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container loading-container">
        <div className="spinner" />
        <p>Carregando detalhes da oportunidade...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="page-container not-found">
        <p className="eyebrow">404</p>
        <h1>vaga não encontrada</h1>
        <p>Esta oportunidade pode ter sido encerrada ou não está mais disponível publicamente.</p>
        <Link to="/" className="button button--primary">
          Voltar para Vagas
        </Link>
      </div>
    );
  }

  return (
    <div className="job-details-page">
      {/* Top Banner */}
      <div className="job-details-hero">
        <div className="page-container">
          <Link to="/" className="back-link">
            ← Voltar para todas as vagas
          </Link>
          <div className="job-details-header">
            <div>
              <div className="badges-wrap">
                <Badge variant="blue">{job.department}</Badge>
                <Badge variant="ink">{job.seniority}</Badge>
                <Badge variant="pink">{job.type}</Badge>
                <Badge variant="gray">{job.location}</Badge>
              </div>
              <h1 className="job-details-title">{job.title}</h1>
              <p className="job-details-meta">
                Prazo de inscrição:{' '}
                <strong>{new Date(job.deadline).toLocaleDateString('pt-BR')}</strong>
                {job.salaryMin && job.salaryMax && (
                  <span className="salary-meta">
                    {' '}• Remuneração: R$ {job.salaryMin.toLocaleString('pt-BR')} a R${' '}
                    {job.salaryMax.toLocaleString('pt-BR')}
                  </span>
                )}
              </p>
            </div>
            <a href="#candidatura" className="button button--primary button--lg">
              Candidatar-se Agora
            </a>
          </div>
        </div>
      </div>

      <div className="page-container job-details-layout">
        {/* Left Column: Job Spec */}
        <div className="job-details-content">
          <section className="job-section-card">
            <h2>Sobre a oportunidade</h2>
            <p className="job-description-text">{job.description}</p>
          </section>

          {/* Requirements Breakdown */}
          {job.requirements && job.requirements.length > 0 && (
            <section className="job-section-card">
              <h2>Requisitos e Critérios</h2>
              <div className="requirements-list">
                {job.requirements.map((req) => (
                  <div
                    key={req.id || req.description}
                    className={`requirement-item requirement-item--${req.type.toLowerCase()}`}
                  >
                    <div className="requirement-item__tag">
                      <Badge variant={req.type === 'REQUIRED' ? 'pink' : 'blue'} size="sm">
                        {req.type === 'REQUIRED' ? 'Obrigatório' : 'Diferencial'}
                      </Badge>
                      <span className="requirement-item__weight">Peso: {req.weight}%</span>
                    </div>
                    <p className="requirement-item__text">{req.description}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Skills Required */}
          {job.skills && job.skills.length > 0 && (
            <section className="job-section-card">
              <h2>Competências e Tecnologias</h2>
              <div className="skills-grid">
                {job.skills.map((sk) => (
                  <div key={sk.id || sk.name} className="skill-card">
                    <span className="skill-card__name">{sk.name || sk.skill?.name}</span>
                    <span className="skill-card__type">
                      {sk.isRequired ? 'Exigência' : 'Desejável'} (Peso: {sk.weight}%)
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Selection Process Stages */}
          {job.stages && job.stages.length > 0 && (
            <section className="job-section-card">
              <h2>Etapas do Processo Seletivo</h2>
              <div className="stages-stepper">
                {job.stages
                  .sort((a, b) => a.order - b.order)
                  .map((stg, idx) => (
                    <div key={stg.id || stg.name} className="stage-step">
                      <div className="stage-step__number">{idx + 1}</div>
                      <div className="stage-step__info">
                        <span className="stage-step__name">{stg.name}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          )}
        </div>

        {/* Right Column: Application Form */}
        <div className="job-details-sidebar" id="candidatura">
          <div className="application-form-card">
            <h2>formulário de candidatura</h2>
            <p className="form-helper">
              Preencha seus dados para entrar no ranking e triagem automatizada da Point Media.
            </p>

            {submitResult ? (
              <div className={`submission-feedback ${submitResult.success ? 'success' : 'error'}`}>
                <div className="feedback-icon">{submitResult.success ? '✓' : '⚠'}</div>
                <h3>{submitResult.success ? 'Candidatura Enviada!' : 'Atenção'}</h3>
                <p>{submitResult.message}</p>
                {submitResult.score && (
                  <div className="feedback-score">
                    <span>Pontuação inicial de aderência:</span>
                    <strong className="feedback-score__val">{submitResult.score}%</strong>
                  </div>
                )}
                <div className="feedback-actions">
                  <Link to="/login" className="button button--secondary button--sm">
                    Acompanhar no Painel
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSubmitResult(null);
                    }}
                  >
                    Enviar Nova
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="application-form">
                <div className="form-group">
                  <label htmlFor="name">Nome Completo *</label>
                  <input
                    id="name"
                    type="text"
                    required
                    placeholder="Ex: Camila Silva"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">E-mail Profissional *</label>
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="camila@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="phone">Telefone / WhatsApp</label>
                    <input
                      id="phone"
                      type="tel"
                      placeholder="(11) 99999-9999"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="seniority">Senioridade Declarada</label>
                    <select
                      id="seniority"
                      value={seniority}
                      onChange={(e) => setSeniority(e.target.value)}
                    >
                      <option value="INTERN">Estágio</option>
                      <option value="JUNIOR">Júnior</option>
                      <option value="MID">Pleno</option>
                      <option value="SENIOR">Sênior</option>
                      <option value="SPECIALIST">Especialista / Lead</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="salary">Pretensão Salarial (R$ Mensal)</label>
                  <input
                    id="salary"
                    type="number"
                    placeholder="Ex: 8500"
                    value={expectedSalary}
                    onChange={(e) => setExpectedSalary(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="linkedin">Perfil do LinkedIn (URL)</label>
                  <input
                    id="linkedin"
                    type="url"
                    placeholder="https://linkedin.com/in/seuperfil"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="github">GitHub ou Behance</label>
                    <input
                      id="github"
                      type="url"
                      placeholder="https://github.com/..."
                      value={github}
                      onChange={(e) => setGithub(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="portfolio">Portfólio / Site</label>
                    <input
                      id="portfolio"
                      type="url"
                      placeholder="https://meusite.com"
                      value={portfolio}
                      onChange={(e) => setPortfolio(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="resume">Link do Currículo (PDF / Drive) *</label>
                  <input
                    id="resume"
                    type="url"
                    placeholder="https://drive.google.com/..."
                    value={resumeUrl}
                    onChange={(e) => setResumeUrl(e.target.value)}
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  isLoading={submitting}
                  size="lg"
                >
                  Concluir e Enviar Candidatura
                </Button>

                <p className="form-disclaimer">
                  Ao enviar, seus dados serão avaliados pela esteira automatizada da Point Media em conformidade com as regras de triagem e privacidade.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
