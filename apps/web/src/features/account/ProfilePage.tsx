import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { CurrentUser } from '@pointmedia/shared';
import { api, ApiFailure } from '../../lib/api';
import { sessionKey, useSession } from '../auth/session';
import { AccountShell } from '../../components/AccountShell';
import { Feedback } from '../../components/Feedback';
import { ChangePasswordForm } from './ChangePasswordForm';

const roleLabels = { CANDIDATE: 'Candidato', RECRUITER: 'Recrutador', ADMIN: 'Administrador' };
const schema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome.').max(120),
  email: z.string().trim().toLowerCase().email('Informe um e-mail válido.').max(254),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[\d+()\s.-]*$/, 'Informe um telefone válido.'),
});

function AccountForm({ user }: { user: CurrentUser }) {
  const cache = useQueryClient();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: user.name, email: user.email, phone: user.phone ?? '' },
  });
  const update = useMutation({
    mutationFn: api.updateAccount,
    onSuccess: (data) => {
      cache.setQueryData(sessionKey, data);
      setSaved(true);
    },
    onError: (error) => {
      if (error instanceof ApiFailure && error.status === 401) {
        cache.clear();
        navigate('/entrar', { replace: true });
      }
    },
  });
  const initials = user.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  return (
    <>
      <h1>Meu perfil</h1>
      <header className="profile-heading">
        <span className="avatar" aria-hidden="true">
          {initials}
        </span>
        <div>
          <h2>{user.name}</h2>
          <p>Conta de {roleLabels[user.role].toLowerCase()}</p>
        </div>
      </header>
      <form
        onSubmit={handleSubmit((values) => {
          setSaved(false);
          update.mutate(values);
        })}
        noValidate
      >
        <div className="profile-fields">
          <div className="field">
            <label htmlFor="name">Nome</label>
            <input
              id="name"
              autoComplete="name"
              {...register('name')}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'account-name-error' : undefined}
            />
            {errors.name && (
              <p id="account-name-error" className="field-error" role="alert">
                {errors.name.message}
              </p>
            )}
          </div>
          <div className="field">
            <label htmlFor="account-email">Email</label>
            <input
              id="account-email"
              type="email"
              autoComplete="email"
              {...register('email')}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'account-email-error' : undefined}
            />
            {errors.email && (
              <p id="account-email-error" className="field-error" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>
          <div className="field">
            <label htmlFor="phone">Telefone</label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              {...register('phone')}
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? 'account-phone-error' : undefined}
            />
            {errors.phone && (
              <p id="account-phone-error" className="field-error" role="alert">
                {errors.phone.message}
              </p>
            )}
          </div>
          <div className="field">
            <label htmlFor="job-title">Cargo</label>
            <input id="job-title" value={user.jobTitle ?? 'Não informado'} readOnly />
          </div>
          <div className="field">
            <label htmlFor="company">Empresa</label>
            <input
              id="company"
              value={user.role === 'CANDIDATE' ? 'Não se aplica' : 'Point Media'}
              readOnly
            />
          </div>
          <div className="field">
            <label htmlFor="role">Permissão</label>
            <input id="role" value={roleLabels[user.role]} readOnly />
          </div>
        </div>
        <section className="account-security" aria-labelledby="security-heading">
          <h2 id="security-heading">Segurança da conta</h2>
          <div className="security-row">
            <p>
              Senha atualizada em{' '}
              {new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(
                new Date(user.passwordChangedAt),
              )}
              .
            </p>
            <button
              className="button secondary"
              type="button"
              onClick={() => setChangingPassword(!changingPassword)}
              aria-expanded={changingPassword}
            >
              Alterar senha
            </button>
          </div>
        </section>
        <Feedback message={update.error?.message} error />
        <Feedback message={saved ? 'Alterações salvas.' : undefined} />
        <button className="button save-account" type="submit" disabled={update.isPending}>
          {update.isPending ? 'Salvando…' : 'Salvar alterações'}
        </button>
      </form>
      {changingPassword && <ChangePasswordForm onCancel={() => setChangingPassword(false)} />}
    </>
  );
}

export function ProfilePage() {
  const { data: user } = useSession();
  if (!user) return null;
  return (
    <AccountShell>
      <AccountForm key={user.id} user={user} />
    </AccountShell>
  );
}
