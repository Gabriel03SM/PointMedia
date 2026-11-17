import type { ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api, ApiFailure } from '../lib/api';
import { useSession } from '../features/auth/session';
import { AccountLayout } from './AccountLayout';
import { Feedback } from './Feedback';

export function AccountShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  const { data: user } = useSession();
  const cache = useQueryClient();
  const navigate = useNavigate();
  const logout = useMutation({
    mutationFn: async () => {
      try {
        await api.logout();
      } catch (error) {
        if (!(error instanceof ApiFailure) || error.status !== 401) throw error;
      }
    },
    onSuccess: async () => {
      await cache.cancelQueries();
      cache.clear();
      navigate('/entrar', { replace: true });
    },
  });
  if (!user) return null;
  return (
    <AccountLayout
      user={user}
      wide={wide}
      onLogout={() => logout.mutate()}
      loggingOut={logout.isPending}
    >
      <Feedback message={logout.error?.message} error />
      {children}
    </AccountLayout>
  );
}
