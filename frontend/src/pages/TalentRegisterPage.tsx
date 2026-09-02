import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { Button } from '../components/Button';
import { Brand } from '../components/Brand';

export const TalentRegisterPage: React.FC = () => {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [seniority, setSeniority] = useState('MID');
  const [expectedSalary, setExpectedSalary] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [bio, setBio] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    setSubmitting(true);
    try {
      await api.submitPublicApplication({
        jobId: 'talent-pool-general',
        name,
        email,
        phone,
        seniority,
        expectedSalary: expectedSalary ? Number(expectedSalary) : undefined,
        linkedin,
        portfolio,
        resumeUrl: resumeUrl || 'https://pointmedia.com/uploads/curriculo.pdf',
      });
      setSuccess(true);
    } catch {
      alert('Erro ao enviar dados. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="talent-register-page page-container">
      <div className="talent-register-card">
        <Brand />
        <p className="eyebrow">BANCO DE TALENTOS POINT MEDIA</p>
        <h1>cadastre seu perfil profissional</h1>
        <p className="auth-subtitle">
          Junte-se à nossa comunidade de especialistas em marketing digital, CRM, mídia de performance e criação.
        </p>

        {success ? (
          <div className="submission-feedback success">
            <div className="feedback-icon">✓</div>
            <h2>Perfil Cadastrado com Sucesso!</h2>
            <p>
              Seus dados foram integrados com sucesso ao Banco de Talentos da Point Media. Quando surgir uma oportunidade aderente às suas competências, nosso time de recrutamento entrará em contato.
            </p>
            <div className="feedback-actions" style={{ marginTop: '24px' }}>
              <Link to="/" className="button button--primary">
                Ver Vagas Abertas
              </Link>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="button button--secondary"
              >
                Ir para Login
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="talent-register-form">
            <div className="form-group">
              <label htmlFor="name">Nome Completo *</label>
              <input
                id="name"
                type="text"
                required
                placeholder="Ex: Rodrigo Mendonça"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">E-mail de Contato *</label>
              <input
                id="email"
                type="email"
                required
                placeholder="rodrigo@exemplo.com"
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
                  placeholder="(11) 98888-7777"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="seniority">Senioridade Atual</label>
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

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="salary">Pretensão Salarial Mensal (R$)</label>
                <input
                  id="salary"
                  type="number"
                  placeholder="Ex: 9000"
                  value={expectedSalary}
                  onChange={(e) => setExpectedSalary(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="resume">Link do Currículo (PDF)</label>
                <input
                  id="resume"
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={resumeUrl}
                  onChange={(e) => setResumeUrl(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="linkedin">LinkedIn (URL)</label>
                <input
                  id="linkedin"
                  type="url"
                  placeholder="https://linkedin.com/in/..."
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="portfolio">Portfólio / GitHub</label>
                <input
                  id="portfolio"
                  type="url"
                  placeholder="https://behance.net/..."
                  value={portfolio}
                  onChange={(e) => setPortfolio(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="bio">Resumo Profissional / Especialidades</label>
              <textarea
                id="bio"
                rows={3}
                placeholder="Conte sobre suas principais experiências, ferramentas que domina e projetos que já liderou..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              isLoading={submitting}
              size="lg"
            >
              Cadastrar no Banco de Talentos
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};
