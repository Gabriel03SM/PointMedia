import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SENIORITIES } from '@pointmedia/shared';
import { api } from '../../lib/api';
import { seniorityLabels } from '../../lib/format';
import { AccountShell } from '../../components/AccountShell';
import { Feedback } from '../../components/Feedback';
import './candidates.css';

import { CandidateModal } from './CandidateModal';
import { Link, useSearchParams } from 'react-router-dom';
import { ManagementApplications } from '../applications/ManagementApplications';

export function CandidatesPage({ talent = false }: { talent?: boolean }) {
  const [parameters] = useSearchParams();
  return (
    <AccountShell wide>
      <h1>{talent ? 'Banco de talentos' : 'Candidatos'}</h1>
      {!talent && (
        <nav className="candidate-tabs" aria-label="Consultas de candidatos">
          <Link className="button secondary" to="/gestao/candidatos">
            Perfis compartilhados
          </Link>
          <Link className="button secondary" to="/gestao/candidatos?aba=candidaturas">
            Candidaturas
          </Link>
        </nav>
      )}
      {!talent && (parameters.get('aba') === 'candidaturas' || parameters.has('vaga')) ? (
        <ManagementApplications jobId={parameters.get('vaga') ?? undefined} />
      ) : (
        <ProfilesList key={talent ? 'talent' : 'shared'} talent={talent} />
      )}
    </AccountShell>
  );
}
function ProfilesList({ talent }: { talent: boolean }) {
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [level, setLevel] = useState('');
  const [skill, setSkill] = useState('');
  const [sort, setSort] = useState('recent');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string>();
  const [location, setLocation] = useState('');
  const [education, setEducation] = useState('');
  const [experience, setExperience] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const query = new URLSearchParams({
    page: String(page),
    pageSize: '20',
    sort,
    ...(q ? { q } : {}),
    ...(level ? { seniority: level } : {}),
    ...(skill ? { skill } : {}),
    ...(talent && location ? { location } : {}),
    ...(talent && education ? { education } : {}),
    ...(talent && experience ? { experience } : {}),
    ...(talent && salaryMax ? { salaryMax } : {}),
  }).toString();
  const profiles = useQuery({
    queryKey: [talent ? 'talents' : 'candidates', query],
    queryFn: ({ signal }) => (talent ? api.talents(query, signal) : api.candidates(query, signal)),
  });
  return (
    <>
      <div className="candidates-top">
        <form
          className="candidate-search"
          onSubmit={(event) => {
            event.preventDefault();
            setQ(search);
            setPage(1);
          }}
        >
          <input
            aria-label="Buscar candidatos"
            placeholder="Buscar por nome, área ou localização…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <button className="button secondary">Buscar</button>
        </form>
        <div className="candidate-stat">
          <h2>{talent ? 'talentos disponíveis' : 'candidatos ativos'}</h2>
          <p>{profiles.data ? `${profiles.data.total} perfis` : '—'}</p>
        </div>
      </div>
      <div className="candidate-filters">
        {talent && (
          <>
            <input
              aria-label="Filtrar localização"
              placeholder="Localização"
              value={location}
              onChange={(event) => {
                setLocation(event.target.value);
                setPage(1);
              }}
            />
            <input
              aria-label="Filtrar formação"
              placeholder="Formação ou instituição"
              value={education}
              onChange={(event) => {
                setEducation(event.target.value);
                setPage(1);
              }}
            />
            <input
              aria-label="Filtrar experiência"
              placeholder="Experiência ou empresa"
              value={experience}
              onChange={(event) => {
                setExperience(event.target.value);
                setPage(1);
              }}
            />
            <input
              aria-label="Pretensão máxima"
              placeholder="Pretensão máxima (ex.: 5000.00)"
              inputMode="decimal"
              value={salaryMax}
              onChange={(event) => {
                setSalaryMax(event.target.value);
                setPage(1);
              }}
            />
          </>
        )}
        <select
          aria-label="Filtrar senioridade"
          value={level}
          onChange={(event) => {
            setLevel(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Senioridade: todas</option>
          {SENIORITIES.map((item) => (
            <option value={item} key={item}>
              {seniorityLabels[item]}
            </option>
          ))}
        </select>
        <input
          aria-label="Filtrar competência"
          placeholder="Competência"
          value={skill}
          onChange={(event) => {
            setSkill(event.target.value);
            setPage(1);
          }}
        />
        <select
          aria-label="Ordenar candidatos"
          value={sort}
          onChange={(event) => {
            setSort(event.target.value);
            setPage(1);
          }}
        >
          <option value="recent">Mais recentes</option>
          <option value="name">Nome</option>
        </select>
      </div>
      {profiles.isPending ? (
        <p role="status">Carregando candidatos…</p>
      ) : profiles.isError ? (
        <div>
          <Feedback message={profiles.error.message} error />
          <button className="button" onClick={() => void profiles.refetch()}>
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          {!profiles.data.items.length && (
            <div className="empty-state">
              {talent
                ? 'Nenhum talento com consentimento ativo encontrado.'
                : 'Nenhum perfil compartilhado encontrado.'}{' '}
              Ajuste os filtros ou aguarde novos cadastros.
            </div>
          )}
          <div className="candidate-list">
            {profiles.data.items.map((item) => (
              <article className="candidate-row" key={item.userId}>
                <div>
                  <h2>{item.name}</h2>
                  <p>{item.headline}</p>
                </div>
                <div>
                  <h3>
                    {talent
                      ? item.skills.join(', ') || 'Competências não se aplicam'
                      : item.seniority
                        ? seniorityLabels[item.seniority]
                        : 'Senioridade não se aplica'}
                  </h3>
                  <p>{item.location ?? 'Localização não se aplica'}</p>
                </div>
                <span className="candidate-shared">
                  {talent ? 'Consentimento ativo' : 'Perfil compartilhado'}
                </span>
                <button className="button secondary" onClick={() => setSelected(item.userId)}>
                  Ver perfil
                </button>
              </article>
            ))}
          </div>
          {profiles.data.total > 20 && (
            <nav className="pagination" aria-label="Páginas de candidatos">
              <button
                className="button secondary"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Anterior
              </button>
              <span>Página {page}</span>
              <button
                className="button secondary"
                disabled={page * 20 >= profiles.data.total}
                onClick={() => setPage(page + 1)}
              >
                Próxima
              </button>
            </nav>
          )}
        </>
      )}
      {selected && (
        <CandidateModal
          id={selected}
          source={talent ? 'talent' : 'shared'}
          onClose={() => setSelected(undefined)}
        />
      )}
    </>
  );
}
