import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { AccountShell } from '../../components/AccountShell';
import { Feedback } from '../../components/Feedback';
import { sessionKey, useSession } from '../auth/session';
import { ProfessionalForm, profileKey, type Notice } from './ProfessionalForm';
import './candidates.css';
import { MyApplications } from '../applications/MyApplications';
import { TalentMembershipPanel } from '../applications/TalentMembershipPanel';

export function CandidatePortal() {
  const { data: user } = useSession();
  const cache = useQueryClient();
  const [notice, setNotice] = useState<Notice>();
  const [removing, setRemoving] = useState(false);
  const confirmation = useRef<HTMLDialogElement>(null);
  const profile = useQuery({
    queryKey: profileKey,
    queryFn: ({ signal }) => api.profile(signal),
    enabled: Boolean(user),
  });
  if (!user) return null;
  return (
    <AccountShell>
      <h1>Portal do candidato</h1>
      <p className="portal-intro">Mantenha seus dados profissionais e currículo atualizados.</p>
      <MyApplications />
      <TalentMembershipPanel />
      <Feedback message={notice?.text} error={notice?.error} />
      {profile.isPending ? (
        <p role="status">Carregando seu perfil…</p>
      ) : profile.isError ? (
        <div>
          <Feedback message={profile.error.message} error />
          <button className="button" onClick={() => void profile.refetch()}>
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          <ProfessionalForm
            key={`${user.id}:${profile.data?.version ?? 0}`}
            profile={profile.data}
            user={user}
            onSaved={(saved, message) => {
              cache.setQueryData(profileKey, saved);
              void cache.invalidateQueries({ queryKey: sessionKey });
              setNotice(message);
            }}
          />
          {profile.data && (
            <button
              className="button secondary profile-remove"
              onClick={() => confirmation.current?.showModal()}
            >
              Remover perfil profissional
            </button>
          )}
        </>
      )}
      <dialog className="help-dialog" ref={confirmation} aria-labelledby="remove-profile-title">
        <h2 id="remove-profile-title">Remover perfil profissional?</h2>
        <p>
          Seu perfil e currículo serão removidos e sua participação no banco de talentos será
          revogada. Sua conta, senha e comprovantes de candidaturas continuarão disponíveis.
        </p>
        <div className="actions">
          <button
            className="button secondary"
            disabled={removing}
            onClick={() => confirmation.current?.close()}
          >
            Cancelar
          </button>
          <button
            className="button"
            disabled={removing}
            onClick={async () => {
              if (!profile.data) return;
              setRemoving(true);
              try {
                await api.removeProfile(profile.data.version);
                cache.setQueryData(profileKey, null);
                void cache.invalidateQueries({ queryKey: ['talent-membership'] });
                confirmation.current?.close();
                setNotice({ text: 'Perfil profissional e currículo removidos.' });
              } catch (failure) {
                setNotice({
                  text: failure instanceof Error ? failure.message : 'Falha ao remover perfil.',
                  error: true,
                });
                confirmation.current?.close();
              } finally {
                setRemoving(false);
              }
            }}
          >
            {removing ? 'Removendo…' : 'Confirmar remoção'}
          </button>
        </div>
      </dialog>
    </AccountShell>
  );
}
