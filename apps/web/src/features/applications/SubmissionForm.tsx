import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  PROCESS_CONSENT_TEXT,
  PROCESS_CONSENT_VERSION,
  TALENT_CONSENT_TEXT,
  TALENT_CONSENT_VERSION,
  type Job,
  type RegistrationResult,
  type ProfessionalInput,
} from '@pointmedia/shared';
import { api, ApiFailure } from '../../lib/api';
import { Feedback } from '../../components/Feedback';
import { useSession, sessionKey } from '../auth/session';
import { authSearch } from '../auth/destination';
import { ProfessionalForm, profileKey, type Notice } from '../candidates/ProfessionalForm';
import { TalentMembershipPanel } from './TalentMembershipPanel';
import './applications.css';

export function SubmissionForm({ job }: { job?: Job }) {
  const session = useSession();
  const cache = useQueryClient();
  const navigate = useNavigate();
  const [processConsent, setProcessConsent] = useState(false);
  const [talentConsent, setTalentConsent] = useState(false);
  const [notice, setNotice] = useState<Notice>();
  const [registrationComplete, setRegistrationComplete] = useState<RegistrationResult>();
  const candidate = session.data?.role === 'CANDIDATE';
  const closed = job?.effectiveStatus === 'CLOSED';
  const bankOnly = !job || closed;
  const profile = useQuery({
    queryKey: profileKey,
    queryFn: ({ signal }) => api.profile(signal),
    enabled: candidate,
  });
  const policy = useQuery({
    queryKey: ['talent-policy'],
    queryFn: ({ signal }) => api.talentPolicy(signal),
  });
  const previous = useQuery({
    queryKey: ['my-applications', job?.id],
    queryFn: ({ signal }) => api.applications(`jobId=${job!.id}`, signal),
    enabled: candidate && Boolean(job),
  });
  const validateConsents = () =>
    !bankOnly && !processConsent
      ? 'Autorize a participação nesta vaga.'
      : bankOnly && !talentConsent
        ? 'Marque a autorização para entrar no banco de talentos.'
        : undefined;
  const consentFields = (
    <>
      {!bankOnly && (
        <label className="professional-consent">
          <input
            type="checkbox"
            checked={processConsent}
            onChange={(event) => setProcessConsent(event.target.checked)}
          />
          {PROCESS_CONSENT_TEXT}
        </label>
      )}
      <label className="professional-consent">
        <input
          type="checkbox"
          checked={talentConsent}
          onChange={(event) => setTalentConsent(event.target.checked)}
        />
        {TALENT_CONSENT_TEXT}
        {!bankOnly && ' (Opcional)'}
      </label>
      <p className="hint">
        Participação no banco por {policy.data?.retentionDays} dias. A saída bloqueia o acesso pelo
        banco; autorizações independentes de candidaturas e compartilhamento geral continuam
        separadas.
      </p>
    </>
  );
  const registerAndSubmit = async (
    professional: ProfessionalInput,
    email: string,
    password: string,
    file?: File,
  ) => {
    const registered = await api.register(
      {
        name: professional.name,
        email,
        password,
        profile: professional,
        ...(bankOnly
          ? { talentConsentVersion: TALENT_CONSENT_VERSION }
          : {
              application: {
                jobId: job!.id,
                processConsent,
                processConsentVersion: PROCESS_CONSENT_VERSION,
                talentPoolConsent: talentConsent,
                ...(talentConsent ? { talentConsentVersion: TALENT_CONSENT_VERSION } : {}),
              },
            }),
      },
      file,
    );
    setRegistrationComplete(registered);
    let user;
    try {
      user = await api.login({ email, password });
    } catch {
      setNotice({
        text: 'Inscrição concluída e conta criada. Entre com seu e-mail e senha para acompanhar.',
      });
      return;
    }
    await cache.cancelQueries({ queryKey: sessionKey });
    cache.setQueryData(sessionKey, user);
    await cache.invalidateQueries({ queryKey: profileKey });
    await cache.invalidateQueries({ queryKey: ['my-applications'] });
    await cache.invalidateQueries({ queryKey: ['talent-membership'] });
    if (registered.result.application)
      navigate(`/candidaturas/${registered.result.application.id}/confirmacao`);
    else
      setNotice({
        text: job
          ? 'Cadastro no banco de talentos confirmado. Nenhuma candidatura foi criada para uma vaga encerrada.'
          : 'Cadastro no banco de talentos confirmado.',
      });
  };
  const submit = useMutation({
    mutationFn: async () => {
      if (bankOnly) {
        await api.joinTalentPool(TALENT_CONSENT_VERSION);
        return null;
      }
      return api.apply({
        jobId: job.id,
        processConsent,
        processConsentVersion: PROCESS_CONSENT_VERSION,
        talentPoolConsent: talentConsent,
        ...(talentConsent ? { talentConsentVersion: TALENT_CONSENT_VERSION } : {}),
      });
    },
    onSuccess: async (result) => {
      await cache.invalidateQueries({ queryKey: ['my-applications'] });
      await cache.invalidateQueries({ queryKey: ['talent-membership'] });
      if (result?.application) navigate(`/candidaturas/${result.application.id}/confirmacao`);
      else
        setNotice({
          text: job
            ? 'Cadastro no banco de talentos confirmado. Nenhuma candidatura foi criada para uma vaga encerrada.'
            : 'Cadastro no banco de talentos confirmado.',
        });
    },
  });
  if (session.isPending) return <p role="status">Carregando sua conta…</p>;
  if (session.isError && !(session.error instanceof ApiFailure && session.error.status === 401))
    return (
      <div>
        <Feedback message={session.error.message} error />
        <button className="button" onClick={() => void session.refetch()}>
          Tentar novamente
        </button>
      </div>
    );
  if (!session.data) {
    const search = authSearch(job ? `/vagas/${job.id}` : '/banco-de-talentos');
    if (registrationComplete)
      return (
        <section className="public-job-preparation">
          <h2>Inscrição concluída</h2>
          <Feedback message={notice?.text ?? 'Conta e inscrição registradas com sucesso.'} />
          <Link
            className="button"
            to={`/entrar${authSearch(registrationComplete.result.application ? `/candidaturas/${registrationComplete.result.application.id}/confirmacao` : '/banco-de-talentos')}`}
          >
            Entrar na minha conta
          </Link>
        </section>
      );
    if (policy.isPending) return <p role="status">Carregando formulário…</p>;
    if (policy.isError)
      return (
        <div>
          <Feedback message={policy.error.message} error />
          <button className="button" onClick={() => void policy.refetch()}>
            Tentar novamente
          </button>
        </div>
      );
    return (
      <section className="submission-section">
        {closed && (
          <div className="public-job-information">
            <h2>Inscrições encerradas</h2>
            <p>
              Esta vaga não recebe candidaturas. Você pode autorizar sua participação no banco de
              talentos para futuras oportunidades.
            </p>
          </div>
        )}
        <p>
          Já possui conta? <Link to={`/entrar${search}`}>Entrar para continuar a inscrição</Link>
        </p>
        <ProfessionalForm
          profile={null}
          heading="Formulário"
          showSharing={false}
          submitLabel={bankOnly ? 'Entrar no banco de talentos' : 'Enviar candidatura'}
          onRegister={registerAndSubmit}
          validateExtra={validateConsents}
          extraFields={consentFields}
        />
      </section>
    );
  }
  if (!candidate)
    return (
      <section className="public-job-preparation">
        <p>Para participar, entre com uma conta de candidato.</p>
        <Link to="/perfil">Minha conta</Link>
      </section>
    );
  if (profile.isPending || policy.isPending || (job && previous.isPending))
    return <p role="status">Carregando formulário…</p>;
  const failure = profile.error ?? policy.error ?? (job ? previous.error : null);
  if (failure)
    return (
      <div>
        <Feedback message={failure.message} error />
        <button
          className="button"
          onClick={() => {
            void profile.refetch();
            void policy.refetch();
            if (job) void previous.refetch();
          }}
        >
          Tentar novamente
        </button>
      </div>
    );
  const existing = previous.data?.items[0];
  if (existing)
    return (
      <section className="public-job-preparation">
        <h2>Candidatura recebida</h2>
        <p>Sua inscrição já está registrada para esta vaga.</p>
        <Link className="button" to={`/candidaturas/${existing.id}/confirmacao`}>
          Ver comprovante
        </Link>
      </section>
    );
  return (
    <section className="submission-section">
      {closed && (
        <div className="public-job-information">
          <h2>Inscrições encerradas</h2>
          <p>
            Esta vaga não recebe novas candidaturas. Se desejar, participe do banco de talentos para
            futuras oportunidades.
          </p>
        </div>
      )}
      <Feedback message={notice?.text} error={notice?.error} />
      <Feedback message={submit.error?.message} error />
      {(submit.isSuccess && !submit.data?.application) ||
      registrationComplete?.result.outcome === 'TALENT_POOL' ? (
        <TalentMembershipPanel />
      ) : (
        <ProfessionalForm
          key={`${session.data.id}:${profile.data?.version ?? 0}`}
          profile={profile.data ?? null}
          user={session.data}
          busy={submit.isPending}
          showSharing={false}
          heading="Formulário"
          submitLabel={bankOnly ? 'Entrar no banco de talentos' : 'Enviar candidatura'}
          validateExtra={validateConsents}
          extraFields={consentFields}
          onSaved={(saved, message) => {
            cache.setQueryData(profileKey, saved);
            void cache.invalidateQueries({ queryKey: sessionKey });
            setNotice(message.error ? message : undefined);
          }}
          onSubmitSaved={() => submit.mutate()}
        />
      )}
    </section>
  );
}
