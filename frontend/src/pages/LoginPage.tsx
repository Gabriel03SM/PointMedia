import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import pointLogoLight from '../assets/point-logo-light.png';

export const LoginPage: React.FC = () => {
  const { login, quickLoginAs } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor preencha e-mail e senha.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await login(email, password);
      if (email.includes('recruiter') || email.includes('admin')) {
        navigate('/recruiter/dashboard');
      } else {
        navigate('/candidato/painel');
      }
    } catch {
      setError('Credenciais inválidas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <img className="auth-logo" src={pointLogoLight} alt="Point" />
        <p className="eyebrow">ACESSO AO SISTEMA POINT MEDIA</p>
        <h1>realizar login</h1>
        <p className="auth-subtitle">
          insira seus dados para acessar o sistema
        </p>

        {/* Quick Demo Access Switchers */}
        <div className="demo-login-box">
          <span>Acesso Rápido para Demonstração:</span>
          <div className="demo-buttons-row">
            <button
              type="button"
              onClick={() => {
                quickLoginAs('RECRUITER');
                navigate('/recruiter/dashboard');
              }}
              className="button button--secondary button--sm"
            >
              👩‍💼 Entrar como RH / Recrutador
            </button>
            <button
              type="button"
              onClick={() => {
                quickLoginAs('CANDIDATE');
                navigate('/candidato/painel');
              }}
              className="button button--secondary button--sm"
            >
              👨‍💻 Entrar como Candidato
            </button>
          </div>
        </div>

        <div className="auth-divider">
          <span>ou entre com suas credenciais</span>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="email">E-mail Profissional</label>
            <input
              id="email"
              type="email"
              placeholder="seuemail@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="form-message" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" fullWidth isLoading={loading} size="lg">
            entrar
          </Button>
        </form>

        <p className="auth-footer">
          Ainda não tem cadastro? <Link to="/talentos/cadastro">cadastre-se no banco de talentos</Link>
        </p>
      </section>
    </main>
  );
};
