import type { Prisma } from '../generated/prisma/client';

export type RecruitmentScope = { applicationId: string } | 'talent' | 'shared';

export function recruitmentAccess(scope: RecruitmentScope): Prisma.CandidateProfileWhereInput {
  const user: Prisma.UserWhereInput = { active: true, role: 'CANDIDATE' };
  if (scope === 'shared') return { user, recruitmentConsentAt: { not: null } };
  if (scope === 'talent')
    return {
      user: {
        ...user,
        talentConsents: { some: { revokedAt: null, expiresAt: { gt: new Date() } } },
      },
    };
  return { user: { ...user, applications: { some: { id: scope.applicationId } } } };
}
