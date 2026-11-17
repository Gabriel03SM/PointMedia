import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { dateLabel } from '../../lib/format';
import { Feedback } from '../../components/Feedback';

export function TalentMembershipPanel() {
  const cache = useQueryClient();
  const membership = useQuery({
    queryKey: ['talent-membership'],
    queryFn: ({ signal }) => api.talentMembership(signal),
    staleTime: 0,
  });
  const leave = useMutation({
    mutationFn: api.leaveTalentPool,
    onSuccess: () => cache.invalidateQueries({ queryKey: ['talent-membership'] }),
  });
  return (
    <section className="membership-panel" id="banco-de-talentos">
      <h2>Banco de talentos</h2>
      {membership.isPending ? (
        <p>Carregando participação…</p>
      ) : membership.isError ? (
        <>
          <Feedback message={membership.error.message} error />
          <button className="button secondary" onClick={() => void membership.refetch()}>
            Tentar novamente
          </button>
        </>
      ) : membership.data.active ? (
        <>
          <p>
            Você participa do banco de talentos até {dateLabel(membership.data.consent!.expiresAt)}.
            O RH pode consultar seu perfil e currículo para futuras oportunidades.
          </p>
          <button
            className="button secondary"
            disabled={leave.isPending}
            onClick={() => leave.mutate()}
          >
            {leave.isPending ? 'Saindo…' : 'Sair do banco de talentos'}
          </button>
        </>
      ) : (
        <>
          <p>
            Você não participa do banco de talentos. A adesão é voluntária e vale por{' '}
            {membership.data.retentionDays} dias.
          </p>
          <Link className="button secondary" to="/banco-de-talentos">
            Participar ou renovar consentimento
          </Link>
        </>
      )}
      <Feedback message={leave.error?.message} error />
      {leave.isSuccess && (
        <Feedback message="Saída confirmada. Seu perfil deixou de aparecer no banco de talentos do RH." />
      )}
    </section>
  );
}
