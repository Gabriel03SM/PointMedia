import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Job } from '../types';
import { api } from '../services/api';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';

export const JobsManagementPage: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Job Form State
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('CRM & Growth');
  const [location, setLocation] = useState('São Paulo, SP (Híbrido)');
  const [type, setType] = useState('CLT - Full Time');
  const [seniority, setSeniority] = useState<Job['seniority']>('MID');
  const [description, setDescription] = useState('');
  const [salaryMin, setSalaryMin] = useState('6000');
  const [salaryMax, setSalaryMax] = useState('9000');
  const [deadlineDays, setDeadlineDays] = useState('30');
  
  // Weights (Total = 100)
  const [skillsWeight, setSkillsWeight] = useState(40);
  const [seniorityWeight, setSeniorityWeight] = useState(30);
  const [salaryWeight, setSalaryWeight] = useState(15);
  const [differentialsWeight, setDifferentialsWeight] = useState(15);

  const [saving, setSaving] = useState(false);

  const fetchJobs = async () => {
    setLoading(true);
    const data = await api.getRecruiterJobs();
    setJobs(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    setSaving(true);
    try {
      const deadlineDate = new Date(Date.now() + Number(deadlineDays) * 86400000).toISOString();
      await api.createJob({
        title,
        department,
        location,
        type,
        seniority,
        description,
        salaryMin: Number(salaryMin),
        salaryMax: Number(salaryMax),
        deadline: deadlineDate,
        status: 'OPEN',
        skillsWeight,
        seniorityWeight,
        salaryWeight,
        differentialsWeight,
      });

      setIsModalOpen(false);
      // reset
      setTitle('');
      setDescription('');
      fetchJobs();
    } catch {
      alert('Erro ao salvar vaga');
    } finally {
      setSaving(false);
    }
  };

  const totalWeights = skillsWeight + seniorityWeight + salaryWeight + differentialsWeight;

  return (
    <div className="jobs-mgmt-page page-container">
      <div className="page-header">
        <div>
          <p className="eyebrow">GESTÃO DE VAGAS &amp; CRITÉRIOS</p>
          <h1>Gestão de vagas</h1>
        </div>
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          Criar vaga
        </Button>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Carregando vagas...</p>
        </div>
      ) : (
        <div className="jobs-mgmt-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Vaga / Posição</th>
                <th>Área &amp; Formato</th>
                <th>Senioridade</th>
                <th>Status</th>
                <th>Pesos do Score</th>
                <th>Inscrições</th>
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
                    <div className="cell-stack">
                      <span>{job.department}</span>
                      <small>{job.type}</small>
                    </div>
                  </td>
                  <td>
                    <Badge variant="ink" size="sm">
                      {job.seniority}
                    </Badge>
                  </td>
                  <td>
                    <Badge variant={job.status === 'OPEN' ? 'pink' : 'gray'} size="sm">
                      {job.status === 'OPEN' ? 'Aberta' : 'Encerrada'}
                    </Badge>
                  </td>
                  <td>
                    <div className="weights-pills">
                      <span title="Tecnologias">Tech: {job.skillsWeight}%</span>
                      <span title="Senioridade">Sen: {job.seniorityWeight}%</span>
                      <span title="Salário">Sal: {job.salaryWeight}%</span>
                      <span title="Diferenciais">Dif: {job.differentialsWeight}%</span>
                    </div>
                  </td>
                  <td>
                    <span className="count-badge">{job._count?.applications || 0} candidatos</span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <Link
                        to={`/recruiter/jobs/${job.id}/ranking`}
                        className="button button--primary button--sm"
                      >
                        Ranking / Triagem
                      </Link>
                      <Link
                        to={`/vagas/${job.id}`}
                        target="_blank"
                        className="button button--ghost button--sm"
                        title="Ver página pública"
                      >
                        ↗
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Job Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Cadastrar Nova Vaga"
        subtitle="Defina os requisitos, pesos de cálculo de score e detalhes da oportunidade"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateJob} className="new-job-form">
          <div className="form-group">
            <label>Título da Posição *</label>
            <input
              type="text"
              required
              placeholder="Ex: Especialista em CRM &amp; Automação Salesforce"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Área / Departamento</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Senioridade Mínima</label>
              <select
                value={seniority}
                onChange={(e) => setSeniority(e.target.value as Job['seniority'])}
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
              <label>Localidade</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Contratação</label>
              <input type="text" value={type} onChange={(e) => setType(e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Salário Mínimo (R$)</label>
              <input
                type="number"
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Salário Máximo (R$)</label>
              <input
                type="number"
                value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Prazo de Inscrição (Dias)</label>
              <input
                type="number"
                value={deadlineDays}
                onChange={(e) => setDeadlineDays(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Descrição Completa da Vaga *</label>
            <textarea
              rows={4}
              required
              placeholder="Descreva as responsabilidades, o dia a dia e os objetivos da posição..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Scoring Weights Section */}
          <div className="scoring-weights-box">
            <div className="scoring-weights-box__header">
              <h4>Configuração dos Pesos de Ranking (Total deve ser 100%)</h4>
              <span className={`weights-total-badge ${totalWeights === 100 ? 'valid' : 'invalid'}`}>
                Total: {totalWeights}%
              </span>
            </div>

            <div className="weights-inputs-grid">
              <div className="weight-control">
                <label>Tecnologias / Skills ({skillsWeight}%)</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={skillsWeight}
                  onChange={(e) => setSkillsWeight(Number(e.target.value))}
                />
              </div>

              <div className="weight-control">
                <label>Senioridade ({seniorityWeight}%)</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={seniorityWeight}
                  onChange={(e) => setSeniorityWeight(Number(e.target.value))}
                />
              </div>

              <div className="weight-control">
                <label>Compatibilidade Salarial ({salaryWeight}%)</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={salaryWeight}
                  onChange={(e) => setSalaryWeight(Number(e.target.value))}
                />
              </div>

              <div className="weight-control">
                <label>Diferenciais / Extras ({differentialsWeight}%)</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={differentialsWeight}
                  onChange={(e) => setDifferentialsWeight(Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={saving}
              disabled={totalWeights !== 100}
            >
              Publicar Vaga
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
