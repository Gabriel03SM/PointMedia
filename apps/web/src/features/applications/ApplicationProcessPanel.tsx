import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  APPLICATION_STATUS_LABELS,
  type ApplicationStatus,
  type ApplicationTransitionInput,
} from '@pointmedia/shared';
import { api, ApiFailure } from '../../lib/api';
import { Feedback } from '../../components/Feedback';
import { ApplicationHistory, ProcessPagination } from './ApplicationHistory';
import { dateTimeLabel } from '../../lib/format';
import './applications.css';

function ApplicationNotes({ id }: { id: string }) {
  const cache = useQueryClient();
  const [page, setPage] = useState(1);
  const [body, setBody] = useState('');
  const notes = useQuery({
    queryKey: ['application-notes', id, page],
    queryFn: ({ signal }) => api.applicationNotes(id, `page=${page}&pageSize=10`, signal),
    staleTime: 0,
  });
  const save = useMutation({
    mutationFn: () => api.addApplicationNote(id, body.trim()),
    onSuccess: () => {
      setBody('');
      setPage(1);
      void cache.invalidateQueries({ queryKey: ['application-notes', id] });
    },
  });
  return (
    <section className="application-notes">
      <h3>Notas internas do recrutamento</h3>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        <div className="field">
          <label htmlFor="recruiter-note">Nota do recrutador</label>
          <textarea
            id="recruiter-note"
            required
            maxLength={2000}
            value={body}
            disabled={save.isPending}
            onChange={(event) => {
              setBody(event.target.value);
              save.reset();
            }}
            aria-describedby="note-visibility"
          />
          <p id="note-visibility" className="hint">
            Visível somente para RH/admin. Notas salvas são preservadas no histórico interno.
          </p>
        </div>
        <button className="button" disabled={save.isPending || !body.trim()}>
          {save.isPending ? 'Salvando…' : 'Salvar nota'}
        </button>
        {save.isError && <Feedback message={save.error.message} error />}
        {save.isSuccess && <Feedback message="Nota interna salva." />}
      </form>
      {notes.isPending ? (
        <p role="status">Carregando notas…</p>
      ) : notes.isError ? (
        <>
          <Feedback message={notes.error.message} error />
          <button className="button secondary" onClick={() => void notes.refetch()}>
            Tentar novamente
          </button>
        </>
      ) : (
        <>
          {!notes.data.items.length && <p>Nenhuma nota interna registrada.</p>}
          <ul className="process-events">
            {notes.data.items.map((note) => (
              <li key={note.id}>
                <p className="process-text">{note.body}</p>
                <p>
                  {note.actor?.name ?? 'Usuário indisponível'} · {dateTimeLabel(note.createdAt)}
                </p>
              </li>
            ))}
          </ul>
          <ProcessPagination
            page={page}
            total={notes.data.total}
            onChange={setPage}
            label="Páginas de notas internas"
          />
        </>
      )}
    </section>
  );
}

export function ApplicationProcessPanel({ id }: { id: string }) {
  const cache = useQueryClient();
  const [status, setStatus] = useState<ApplicationStatus | ''>('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [confirmation, setConfirmation] = useState<ApplicationTransitionInput>();
  const process = useQuery({
    queryKey: ['application-process', id],
    queryFn: ({ signal }) => api.applicationProcess(id, signal),
    staleTime: 0,
  });
  const change = useMutation({
    mutationFn: (input: ApplicationTransitionInput) => api.transitionApplication(id, input),
    onSuccess: (updated) => {
      cache.setQueryData(['application-process', id], updated);
      void cache.invalidateQueries({ queryKey: ['management-applications'] });
      void cache.invalidateQueries({ queryKey: ['application-history', id] });
      setStatus('');
      setReason('');
      setMessage('');
      setConfirmation(undefined);
    },
    onError: (error) => {
      setConfirmation(undefined);
      if (error instanceof ApiFailure && error.status === 409) {
        void cache.invalidateQueries({ queryKey: ['application-process', id] });
        void cache.invalidateQueries({ queryKey: ['application-history', id] });
      }
    },
  });
  if (process.isPending) return <p role="status">Carregando processo seletivo…</p>;
  if (process.isError)
    return (
      <>
        <Feedback message={process.error.message} error />
        <button className="button secondary" onClick={() => void process.refetch()}>
          Recarregar processo
        </button>
      </>
    );
  const data = process.data;
  return (
    <section className="application-process" aria-label="Processo seletivo">
      <h3>Processo seletivo — {data.job.title}</h3>
      <p>
        Etapa atual: <strong>{APPLICATION_STATUS_LABELS[data.status]}</strong> · versão{' '}
        {data.version}
      </p>
      <p className="hint">Decisões são humanas. O ranking não altera a etapa.</p>
      {data.allowedTransitions.length > 0 ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            change.reset();
            if (status && reason.trim())
              setConfirmation({
                version: data.version,
                status,
                internalReason: reason.trim(),
                publicMessage: message.trim(),
              });
          }}
        >
          <fieldset disabled={change.isPending || !!confirmation || process.isFetching}>
            <div className="field">
              <label htmlFor="application-stage">Próxima etapa</label>
              <select
                id="application-stage"
                required
                value={status}
                onChange={(event) => setStatus(event.target.value as ApplicationStatus | '')}
              >
                <option value="">Selecione uma etapa</option>
                {data.allowedTransitions.map((value) => (
                  <option key={value} value={value}>
                    {APPLICATION_STATUS_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
            <div className="candidate-details-columns">
              <div className="field">
                <label htmlFor="stage-reason">Justificativa interna</label>
                <textarea
                  id="stage-reason"
                  required
                  maxLength={2000}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  aria-describedby="reason-visibility"
                />
                <p className="hint" id="reason-visibility">
                  Somente RH/admin poderão ler esta justificativa.
                </p>
              </div>
              <div className="field">
                <label htmlFor="stage-message">Mensagem ao candidato (opcional)</label>
                <textarea
                  id="stage-message"
                  maxLength={2000}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  aria-describedby="message-visibility"
                />
                <p className="hint" id="message-visibility">
                  Será exibida ao candidato no portal. Sem envio de e-mail.
                </p>
              </div>
            </div>
            <button
              className="button"
              disabled={!status || !data.allowedTransitions.includes(status) || !reason.trim()}
            >
              Revisar mudança de etapa
            </button>
          </fieldset>
          {confirmation && (
            <div
              className="process-confirmation"
              role="group"
              aria-label="Confirmar mudança de etapa"
            >
              <p>
                Alterar de <strong>{APPLICATION_STATUS_LABELS[data.status]}</strong> para{' '}
                <strong>{APPLICATION_STATUS_LABELS[confirmation.status]}</strong>?
              </p>
              <p>
                O candidato verá a nova etapa
                {confirmation.publicMessage
                  ? ' e a mensagem abaixo.'
                  : '. Nenhuma mensagem adicional será publicada.'}
              </p>
              {confirmation.publicMessage && (
                <p className="process-text">{confirmation.publicMessage}</p>
              )}
              <p className="process-text">Justificativa interna: {confirmation.internalReason}</p>
              {['APPROVED', 'REJECTED'].includes(confirmation.status) && (
                <p>Esta decisão encerra a candidatura e não poderá ser reaberta.</p>
              )}
              <div className="actions">
                <button
                  type="button"
                  className={`button${confirmation.status === 'REJECTED' ? ' danger' : ''}`}
                  disabled={change.isPending || process.isFetching}
                  onClick={() => change.mutate(confirmation)}
                >
                  {change.isPending ? 'Registrando…' : 'Confirmar mudança'}
                </button>
                <button
                  type="button"
                  className="button secondary"
                  disabled={change.isPending}
                  onClick={() => setConfirmation(undefined)}
                >
                  Voltar à edição
                </button>
              </div>
            </div>
          )}
        </form>
      ) : (
        <p>Decisão final registrada. Esta candidatura está encerrada.</p>
      )}
      {change.isError && <Feedback message={change.error.message} error />}
      {change.isSuccess && <Feedback message="Etapa atualizada e histórico registrado." />}
      <ApplicationHistory id={id} internal />
      <ApplicationNotes id={id} />
    </section>
  );
}
