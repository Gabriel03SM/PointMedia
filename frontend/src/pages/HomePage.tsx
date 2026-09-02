import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Job } from '../types';
import { api } from '../services/api';
import pointLogoLight from '../assets/point-logo-light.png';

export const HomePage: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  useEffect(() => { api.getOpenJobs().then(setJobs); }, []);

  return (
    <div className="figma-home">
      <section className="figma-home__hero">
        <div className="figma-home__intro">
          <img className="wordmark" src={pointLogoLight} alt="Point" />
          <h1>Conecte seu talento<br />à comunicação do futuro</h1>
          <i />
          <p>Veja vagas, envie seu perfil e acompanhe cada etapa com uma experiência simples, transparente e digital.</p>
          <div className="figma-home__actions"><a href="#vagas">Ver vagas abertas</a><Link to="/talentos/cadastro">Banco de talentos</Link></div>
        </div>
        <aside className="figma-process">
          <h2>Processo seletivo digital</h2><p>Do envio do perfil ao acompanhamento das etapas, tudo fica centralizado.</p>
          <div><b>01</b><span><strong>Candidate-se</strong>Escolha uma vaga e envie seus dados em poucos minutos.</span></div>
          <div><b>02</b><span><strong>Acompanhe</strong>Veja o andamento das etapas e mantenha seu perfil atualizado.</span></div>
          <div><b>03</b><span><strong>Conecte-se</strong>Receba o retorno da equipe e avance para entrevistas.</span></div>
        </aside>
        <div className="figma-home__stats"><article><strong>+20</strong><span>vagas ativas</span></article><article><strong>+300</strong><span>perfis cadastrados</span></article><article><strong>100%</strong><span>processo digital</span></article><article><strong>48h</strong><span>retorno médio</span></article></div>
      </section>
      <section className="figma-home__jobs" id="vagas">
        <h2>Vagas disponíveis</h2><p>Explore oportunidades abertas e encontre a vaga que mais combina com seu perfil profissional.</p>
        <div className="figma-job-list">{jobs.slice(0, 2).map((job) => <article key={job.id}><div><span>Novo</span><em>{job.seniority === 'MID' ? 'Pleno' : job.seniority === 'JUNIOR' ? 'Junior' : 'Sênior'}</em><h3>{job.title}</h3></div><div><Link to={`/vagas/${job.id}`}>Candidatar-se</Link><small>Inscrições até {new Date(job.deadline).toLocaleDateString('pt-BR')}</small></div></article>)}</div>
      </section>
      <section className="figma-home__why"><h2>Por que criar seu perfil?</h2><p>O banco de talentos mantém suas informações organizadas para novas oportunidades e facilita o contato com a equipe.</p><div><article><b>01</b><h3>Perfil sempre visível</h3><span>Suas informações ficam disponíveis para futuras vagas da Point Media.</span></article><article><b>02</b><h3>Vagas compatíveis</h3><span>Acompanhe oportunidades abertas e encontre posições alinhadas ao seu momento.</span></article><article><b>03</b><h3>Retorno centralizado</h3><span>Receba atualizações do processo seletivo em um fluxo mais claro.</span></article></div></section>
      <section className="figma-home__banner"><div><h2>Não encontrou uma vaga ideal?</h2><p>Cadastre-se mesmo assim no nosso Banco de Talentos. Caso uma vaga seja encerrada ou surjam novas oportunidades compatíveis com seu perfil, suas informações poderão ser analisadas pela equipe de RH para futuras seleções.</p></div><Link to="/talentos/cadastro">Cadastrar</Link></section>
    </div>
  );
};
