import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { money, seniorityLabels, workModeLabels } from '../../lib/format';
import type { WorkMode } from '@pointmedia/shared';
import { Feedback } from '../../components/Feedback';
import { ApplicationProcessPanel } from '../applications/ApplicationProcessPanel';
import { useModalDialog } from '../../components/useModalDialog';
export function CandidateModal({
  id,
  onClose,
  source = 'shared',
  workMode,
}: {
  id: string;
  onClose: () => void;
  source?: 'shared' | 'talent' | { applicationId: string };
  workMode?: WorkMode;
}) {
  const dialog = useModalDialog();
  const profile = useQuery({
    queryKey: ['candidate-detail', id, source],
    queryFn: ({ signal }) =>
      typeof source === 'object'
        ? api.applicationProfile(source.applicationId, signal)
        : source === 'talent'
          ? api.talent(id, signal)
          : api.candidate(id, signal),
    staleTime: 0,
  });
  const data = profile.data;
  return (
    <dialog
      className="candidate-modal"
      ref={dialog}
      aria-labelledby="candidate-modal-title"
      onCancel={onClose}
    >
      <header className="modal-heading">
        <h2 id="candidate-modal-title">Perfil do candidato</h2>
        <button className="modal-close" aria-label="Fechar perfil" onClick={onClose}>
          ×
        </button>
      </header>
      {profile.isPending ? (
        <p role="status">Carregando perfil…</p>
      ) : profile.isError ? (
        <Feedback message={profile.error.message} error />
      ) : (
        data && (
          <>
            <div className="candidate-identity">
              <span className="avatar" aria-hidden="true">
                {data.name
                  .trim()
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join('')}
              </span>
              <div>
                <h3>{data.name}</h3>
                <p>{data.headline}</p>
              </div>
            </div>
            <div className="candidate-facts">
              <div className="field">
                <label htmlFor="candidate-location">Localização</label>
                <input id="candidate-location" value={data.location ?? 'Não se aplica'} readOnly />
              </div>
              <div className="field">
                <label htmlFor="candidate-level">Senioridade</label>
                <input
                  id="candidate-level"
                  value={data.seniority ? seniorityLabels[data.seniority] : 'Não se aplica'}
                  readOnly
                />
              </div>
              <div className="field">
                <label htmlFor="candidate-mode">Modalidade</label>
                <input
                  id="candidate-mode"
                  value={workMode ? workModeLabels[workMode] : 'Não informado'}
                  readOnly
                />
              </div>
            </div>
            <div className="field candidate-salary">
              <label htmlFor="candidate-salary">Pretensão</label>
              <input
                id="candidate-salary"
                value={data.expectedSalary ? money(data.expectedSalary) : 'Não se aplica'}
                readOnly
              />
            </div>
            <div className="candidate-details-columns">
              <section>
                <h3>Sobre o candidato</h3>
                <p className="candidate-about">{data.about}</p>
              </section>
              <section>
                <h3>Competências declaradas</h3>
                <div className="skill-tags desirable">
                  {data.skills.map((skill) => (
                    <span key={skill}>{skill}</span>
                  ))}
                  {!data.skills.length && <p>Não se aplica</p>}
                </div>
              </section>
            </div>
            <div className="candidate-details-columns">
              <section>
                <h3>Experiência</h3>
                {data.experience.length ? (
                  data.experience.map((item, index) => (
                    <div className="candidate-history" key={index}>
                      <strong>
                        {item.position} — {item.company}
                      </strong>
                      <p>
                        {item.startedMonth} a {item.endedMonth ?? 'atual'}
                      </p>
                      <p>{item.description}</p>
                    </div>
                  ))
                ) : (
                  <p>Não se aplica</p>
                )}
              </section>
              <section>
                <h3>Formação</h3>
                {data.education.length ? (
                  data.education.map((item, index) => (
                    <div className="candidate-history" key={index}>
                      <strong>{item.course}</strong>
                      <p>{item.institution}</p>
                      <p>
                        {item.startedYear} a {item.finishedYear ?? 'em andamento'}
                      </p>
                    </div>
                  ))
                ) : (
                  <p>Não se aplica</p>
                )}
              </section>
            </div>
            <section className="candidate-contact">
              <h3>Contato e links</h3>
              <p>
                {data.email}
                {data.phone ? ` · ${data.phone}` : ''}
              </p>
              <div className="actions">
                {data.linkedin && (
                  <a href={data.linkedin} target="_blank" rel="noopener noreferrer">
                    LinkedIn
                  </a>
                )}
                {data.portfolio && (
                  <a href={data.portfolio} target="_blank" rel="noopener noreferrer">
                    Portfólio
                  </a>
                )}
              </div>
            </section>
            {data.resume && (
              <a
                className="button"
                href={
                  typeof source === 'object'
                    ? `/api/management/applications/${source.applicationId}/resume`
                    : source === 'talent'
                      ? `/api/talent-pool/${data.userId}/resume`
                      : `/api/candidates/${data.userId}/resume`
                }
              >
                Baixar currículo
              </a>
            )}
          </>
        )
      )}
      {typeof source === 'object' && <ApplicationProcessPanel id={source.applicationId} />}
    </dialog>
  );
}
