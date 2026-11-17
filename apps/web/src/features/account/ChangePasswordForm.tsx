import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '../../lib/api';
import { PasswordInput } from '../../components/PasswordInput';
import { Feedback } from '../../components/Feedback';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual.').max(128),
    newPassword: z.string().min(12, 'Use pelo menos 12 caracteres.').max(128),
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    path: ['newPassword'],
    message: 'Escolha uma senha diferente da atual.',
  });

export function ChangePasswordForm({ onCancel }: { onCancel: () => void }) {
  const cache = useQueryClient();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });
  const change = useMutation({
    mutationFn: api.changePassword,
    onSuccess: async () => {
      await cache.cancelQueries();
      cache.clear();
      navigate('/entrar', { replace: true });
    },
  });
  return (
    <form
      className="change-password-form"
      onSubmit={handleSubmit((values) => {
        if (window.confirm('Alterar a senha e encerrar todas as sessões?')) change.mutate(values);
      })}
      noValidate
    >
      <div className="field">
        <label htmlFor="current-password">Senha atual</label>
        <PasswordInput
          id="current-password"
          autoComplete="current-password"
          {...register('currentPassword')}
          aria-invalid={Boolean(errors.currentPassword)}
          aria-describedby={errors.currentPassword ? 'current-password-error' : undefined}
        />
        {errors.currentPassword && (
          <p id="current-password-error" className="field-error" role="alert">
            {errors.currentPassword.message}
          </p>
        )}
      </div>
      <div className="field">
        <label htmlFor="new-password">Nova senha</label>
        <PasswordInput
          id="new-password"
          autoComplete="new-password"
          {...register('newPassword')}
          aria-describedby={`password-requirement${errors.newPassword ? ' new-password-error' : ''}`}
          aria-invalid={Boolean(errors.newPassword)}
        />
        <p id="password-requirement" className="hint">
          De 12 a 128 caracteres. Você pode usar uma frase.
        </p>
        {errors.newPassword && (
          <p id="new-password-error" className="field-error" role="alert">
            {errors.newPassword.message}
          </p>
        )}
      </div>
      <Feedback message={change.error?.message} error />
      <div className="actions">
        <button className="button" disabled={change.isPending}>
          {change.isPending ? 'Alterando…' : 'Confirmar alteração'}
        </button>
        <button className="button secondary" type="button" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
