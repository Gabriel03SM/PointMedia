import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { APPLICATION_STATUS_LABELS } from '@pointmedia/shared';
import { api } from '../../lib/api';
import { dateTimeLabel } from '../../lib/format';
import { Feedback } from '../../components/Feedback';
import './applications.css';

export function ProcessPagination({
  page,
  total,
  onChange,
  label,
}: {
  page: number;
  total: number;
  onChange: (page: number) => void;
  label: string;
}) {
  if (total <= 10) return null;
  return (
    <nav className="pagination" aria-label={label}>
      <button className="button secondary" disabled={page === 1} onClick={() => onChange(page - 1)}>
        Anterior
      </button>
      <span>Página {page}</span>
      <button
        className="button secondary"
        disabled={page * 10 >= total}
        onClick={() => onChange(page + 1)}
      >
        Próxima
      </button>
    </nav>
  );
}

export function ApplicationHistory({ id, internal = false }: { id: string; internal?: boolean }) {
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const history = useQuery({
    queryKey: ['application-history', id, internal, page],
    queryFn: ({ signal }) =>
      api.applicationHistory(id, `page=${page}&pageSize=10`, internal, signal),
    enabled: open,
    staleTime: 0,
  });
  return (
    <details
      className="application-history"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>Histórico e mensagens{internal ? ' — uso interno' : ''}</summary>
      {open &&
        (history.isPending ? (
          <p role="status">Carregando histórico…</p>
        ) : history.isError ? (
          <>
            <Feedback message={history.error.message} error />
            <button className="button secondary" onClick={() => void history.refetch()}>
              Tentar novamente
            </button>
          </>
        ) : (
          <>
            {!history.data.items.length && <p>Nenhuma etapa registrada.</p>}
            <ol className="process-events">
              {history.data.items.map((event) => (
                <li key={event.id}>
                  <strong>
                    {event.fromStatus ? `${APPLICATION_STATUS_LABELS[event.fromStatus]} → ` : ''}
                    {APPLICATION_STATUS_LABELS[event.toStatus]}
                  </strong>
                  <p>
                    {dateTimeLabel(event.createdAt)} · registro {event.version}
                  </p>
                  {event.publicMessage && (
                    <p className="process-text">
                      <strong>Mensagem ao candidato: </strong>
                      {event.publicMessage}
                    </p>
                  )}
                  {internal && 'internalReason' in event && (
                    <>
                      {event.internalReason && (
                        <p className="process-text">
                          <strong>Justificativa interna: </strong>
                          {event.internalReason}
                        </p>
                      )}
                      <p>Registrado por {event.actor?.name ?? 'Usuário indisponível'}</p>
                    </>
                  )}
                </li>
              ))}
            </ol>
            <ProcessPagination
              page={page}
              total={history.data.total}
              onChange={setPage}
              label="Páginas do histórico"
            />
          </>
        ))}
    </details>
  );
}
