import type { CurrentUser } from '@pointmedia/shared';
import type { User } from '../generated/prisma/client';

export function publicUser(user: User): CurrentUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    jobTitle: user.jobTitle,
    role: user.role,
    passwordChangedAt: user.passwordChangedAt.toISOString(),
  };
}
