import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { authDestination } from './destination';
import { api } from '../../lib/api';
import { Brand } from '../../components/Brand';
import { BackLink } from '../../components/BackLink';
import { PasswordInput } from '../../components/PasswordInput';
import { Feedback } from '../../components/Feedback';
import { sessionKey, useSession } from './session';

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Informe um e-mail válido.').max(254),
  password: z.string().min(1, 'Informe sua senha.').max(128, 'Use até 128 caracteres.'),
});

export function LoginPage() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const queryClient = useQueryClient();
  const session = useSession();
  const help = useRef<HTMLDialogElement>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) });
  const login = useMutation({
    mutationFn: api.login,
    onSuccess: async (user) => {
      await queryClient.cancelQueries({ queryKey: sessionKey });
      queryClient.setQueryData(sessionKey, user);
      navigate(authDestination(search, user.role), { replace: true });
    },
  });
  if (session.data) return <Navigate to={authDestination(search, session.data.role)} replace />;
  const destination = authDestination(search, 'CANDIDATE');
  const backTo =
    /^\/vagas\//.test(destination) || destination === '/banco-de-talentos' ? destination : '/';
  return (
    <main className="login-page">
      <BackLink className="login-back" to={backTo}>
        {backTo.startsWith('/vagas/')
          ? 'Voltar à vaga'
          : backTo === '/banco-de-talentos'
            ? 'Voltar ao banco de talentos'
            : 'Voltar para a página inicial'}
      </BackLink>
      <div className="login-content">
        <Brand tone="light" />
        <h1>realizar login</h1>
        <p className="login-intro">insira seus dados para acessar o sistema</p>
        <form
          className="login-card"
          onSubmit={handleSubmit((values) => login.mutate(values))}
          noValidate
        >
          <div className="field">
            <label htmlFor="email">e-mail</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="digite seu e-mail"
              {...register('email')}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {errors.email && (
              <p id="email-error" className="field-error" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>
          <div className="field login-password">
            <label htmlFor="password">senha</label>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              placeholder="digite sua senha"
              {...register('password')}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'password-error' : undefined}
            />
            {errors.password && (
              <p id="password-error" className="field-error" role="alert">
                {errors.password.message}
              </p>
            )}
            <button type="button" className="help-link" onClick={() => help.current?.showModal()}>
              esqueceu a senha?
            </button>
          </div>
          <Feedback message={login.error?.message} error />
          <button className="button login-submit" type="submit" disabled={login.isPending}>
            {login.isPending ? 'entrando…' : 'entrar'}
          </button>
          <p className="auth-alternative">
            Primeiro acesso? Inscreva-se em uma <Link to="/vagas">vaga</Link> ou no{' '}
            <Link to="/banco-de-talentos">banco de talentos</Link> para criar sua conta.
          </p>
        </form>
      </div>
      <dialog ref={help} className="help-dialog" aria-labelledby="help-title">
        <h2 id="help-title">Acesso à conta</h2>
        <p>
          A recuperação de senha por e-mail ainda não está disponível nesta etapa. Solicite
          orientação ao administrador da Point Media.
        </p>
        <form method="dialog">
          <button className="button" autoFocus>
            Entendi
          </button>
        </form>
      </dialog>
    </main>
  );
}
