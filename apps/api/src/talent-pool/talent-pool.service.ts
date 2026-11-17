import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  TALENT_CONSENT_TEXT,
  TALENT_CONSENT_VERSION,
  type TalentConsentInfo,
  type TalentMembership,
  type PageResult,
  type ProfessionalProfile,
} from '@pointmedia/shared';
import { APP_CONFIG, type AppConfig } from '../config';
import { PrismaService } from '../database/prisma.service';
import { Prisma, type TalentConsent } from '../generated/prisma/client';
import { normalizeName } from '../common/domain';
import { ProfilesService } from '../candidates/profiles.service';
import type { TalentConsentDto, TalentQuery } from './dto';

export function consentInfo(row: TalentConsent): TalentConsentInfo {
  return {
    id: row.id,
    consentVersion: row.consentVersion,
    grantedAt: row.grantedAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    revokedAt: row.revokedAt?.toISOString() ?? null,
  };
}

@Injectable()
export class TalentPoolService {
  constructor(
    private readonly db: PrismaService,
    private readonly profiles: ProfilesService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  policy() {
    return {
      consentVersion: TALENT_CONSENT_VERSION,
      text: TALENT_CONSENT_TEXT,
      retentionDays: this.config.TALENT_RETENTION_DAYS,
    };
  }

  async membership(userId: string): Promise<TalentMembership> {
    const consent = await this.db.talentConsent.findFirst({
      where: { userId },
      orderBy: [
        { revokedAt: { sort: 'desc', nulls: 'first' } },
        { grantedAt: 'desc' },
        { id: 'desc' },
      ],
    });
    return {
      active: Boolean(consent && !consent.revokedAt && consent.expiresAt > new Date()),
      consent: consent ? consentInfo(consent) : null,
      retentionDays: this.config.TALENT_RETENTION_DAYS,
    };
  }

  // Chamador mantém o lock do User; compartilhado com o envio de candidatura.
  async grant(tx: Prisma.TransactionClient, userId: string) {
    const days = this.config.TALENT_RETENTION_DAYS;
    const clock = await tx.$queryRaw<
      { now: Date }[]
    >`SELECT clock_timestamp()::timestamptz(3) AS now`;
    const now = clock[0]!.now;
    const valid = await tx.talentConsent.findFirst({
      where: { userId, revokedAt: null, expiresAt: { gt: now! } },
    });
    if (valid) return consentInfo(valid);
    if (!(await tx.candidateProfile.findUnique({ where: { userId } })))
      throw new BadRequestException(
        'Salve seu perfil profissional antes de entrar no banco de talentos.',
      );
    await tx.talentConsent.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now! },
    });
    const row = await tx.talentConsent.create({
      data: {
        userId,
        consentVersion: TALENT_CONSENT_VERSION,
        grantedAt: now!,
        expiresAt: new Date(now!.getTime() + days * 86400000),
      },
    });
    await tx.auditLog.create({
      data: { actorId: userId, action: 'TALENT_CONSENT_GRANTED', entityId: row.id },
    });
    return consentInfo(row);
  }

  async join(userId: string, dto: TalentConsentDto) {
    if (!dto.consent)
      throw new BadRequestException('Marque a autorização para entrar no banco de talentos.');
    await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId}::uuid FOR UPDATE`;
      await this.grant(tx, userId);
    });
    return this.membership(userId);
  }

  async revoke(userId: string) {
    await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId}::uuid FOR UPDATE`;
      const changed = await tx.talentConsent.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (changed.count)
        await tx.auditLog.create({
          data: { actorId: userId, action: 'TALENT_CONSENT_REVOKED', entityId: userId },
        });
    });
  }

  async list(query: TalentQuery): Promise<PageResult<ProfessionalProfile>> {
    const min = query.salaryMin == null ? undefined : new Prisma.Decimal(query.salaryMin);
    const max = query.salaryMax == null ? undefined : new Prisma.Decimal(query.salaryMax);
    if (min && max && min.gt(max))
      throw new BadRequestException('A pretensão mínima não pode superar a máxima.');
    const where: Prisma.CandidateProfileWhereInput = {
      user: {
        active: true,
        role: 'CANDIDATE',
        talentConsents: { some: { revokedAt: null, expiresAt: { gt: new Date() } } },
      },
      ...(query.seniority ? { seniority: query.seniority } : {}),
      ...(query.location ? { location: { contains: query.location, mode: 'insensitive' } } : {}),
      ...(query.skill
        ? { skills: { some: { skill: { normalizedName: normalizeName(query.skill) } } } }
        : {}),
      ...(query.education
        ? {
            education: {
              some: {
                OR: [
                  { course: { contains: query.education, mode: 'insensitive' } },
                  { institution: { contains: query.education, mode: 'insensitive' } },
                ],
              },
            },
          }
        : {}),
      ...(query.experience
        ? {
            experience: {
              some: {
                OR: [
                  { position: { contains: query.experience, mode: 'insensitive' } },
                  { company: { contains: query.experience, mode: 'insensitive' } },
                  { description: { contains: query.experience, mode: 'insensitive' } },
                ],
              },
            },
          }
        : {}),
      ...(min || max ? { expectedSalary: { gte: min, lte: max } } : {}),
      ...(query.q
        ? {
            OR: [
              { user: { name: { contains: query.q, mode: 'insensitive' } } },
              { headline: { contains: query.q, mode: 'insensitive' } },
              { location: { contains: query.q, mode: 'insensitive' } },
              { skills: { some: { skill: { name: { contains: query.q, mode: 'insensitive' } } } } },
            ],
          }
        : {}),
    };
    return this.profiles.search(where, query);
  }

  async profile(userId: string) {
    return this.profiles.shared(userId, 'talent');
  }
}
