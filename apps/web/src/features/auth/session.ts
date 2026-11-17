import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const sessionKey = ['session'] as const;
export function useSession() {
  return useQuery({ queryKey: sessionKey, queryFn: ({ signal }) => api.me(signal), retry: false });
}
