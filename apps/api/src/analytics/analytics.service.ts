import { Injectable, NotFoundException } from '@nestjs/common';
import {
  APPLICATION_STATUSES,
  SENIORITIES,
  type AdministrationMetrics,
  type MetricPeriod,
  type RecruitmentMetrics,
} from '@pointmedia/shared';
import { PrismaService } from '../database/prisma.service';
import type { Prisma } from '../generated/prisma/client';
import { ScreeningService } from '../screening/screening.service';
import type { MetricPeriodQuery, RecruitmentMetricsQuery } from './dto';

type Client = Prisma.TransactionClient;
@Injectable()
export class AnalyticsService {
  constructor(
    private readonly db: PrismaService,
    private readonly screening: ScreeningService,
  ) {}

  private async period(tx: Client, days: number) {
    const [clock] = await tx.$queryRaw<{ until: Date; since: Date; month: Date }[]>`
      WITH clock AS (SELECT clock_timestamp()::timestamptz(3) AS at)
      SELECT at AS until,
        ((date_trunc('day', at AT TIME ZONE 'America/Sao_Paulo') - (${days}::int - 1) * interval '1 day') AT TIME ZONE 'America/Sao_Paulo') AS since,
        (date_trunc('month', at AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo') AS month FROM clock`;
    return {
      since: clock!.since,
      until: clock!.until,
      month: clock!.month,
      info: {
        days,
        since: clock!.since.toISOString(),
        until: clock!.until.toISOString(),
        timeZone: 'America/Sao_Paulo',
      } satisfies MetricPeriod,
    };
  }

  async recruitment(query: RecruitmentMetricsQuery): Promise<RecruitmentMetrics> {
    return this.db.$transaction(
      async (tx) => {
        if (
          query.jobId &&
          !(await tx.jobOpening.findUnique({ where: { id: query.jobId }, select: { id: true } }))
        )
          throw new NotFoundException('Vaga não encontrada.');
        const { since, until, month, info } = await this.period(tx, query.days);
        const user = { active: true, role: 'CANDIDATE' as const };
        const scope = query.jobId ? { jobId: query.jobId } : {};
        const consent = { revokedAt: null, expiresAt: { gt: until } };
        const profiles: Prisma.CandidateProfileWhereInput = {
          user: { ...user, ...(query.jobId ? { applications: { some: scope } } : {}) },
          OR: [
            { recruitmentConsentAt: { not: null } },
            { user: { talentConsents: { some: consent } } },
            { user: { applications: { some: {} } } },
          ],
        };
        const cohort: Prisma.ApplicationWhereInput = {
          ...scope,
          user,
          submittedAt: { gte: since, lte: until },
        };
        const available = await tx.candidateProfile.count({ where: profiles });
        const newProfiles = await tx.candidateProfile.count({
          where: { AND: [profiles, { createdAt: { gte: month, lte: until } }] },
        });
        const talent = await tx.candidateProfile.count({
          where: { AND: [profiles, { user: { talentConsents: { some: consent } } }] },
        });
        const openJobs = await tx.jobOpening.count({
          where: {
            ...(query.jobId ? { id: query.jobId } : {}),
            status: 'PUBLISHED',
            closesAt: { gt: until },
          },
        });
        const applications = await tx.application.count({ where: cohort });
        const levels = await tx.candidateProfile.groupBy({
          by: ['seniority'],
          where: profiles,
          _count: { _all: true },
        });
        const states = await tx.application.groupBy({
          by: ['status'],
          where: cohort,
          _count: { _all: true },
        });
        const reached = await tx.applicationStageHistory.groupBy({
          by: ['toStatus'],
          where: { application: cohort },
          _count: { _all: true },
        });
        const stages = APPLICATION_STATUSES.map((status) => ({
          status,
          count: states.find((row) => row.status === status)?._count._all ?? 0,
        }));
        const funnel = APPLICATION_STATUSES.map((status) => ({
          status,
          count:
            status === 'RECEIVED'
              ? applications
              : (reached.find((row) => row.toStatus === status)?._count._all ?? 0),
        }));
        const daily = await tx.$queryRaw<{ date: string; count: number }[]>`
        WITH days AS (SELECT generate_series((${since}::timestamptz AT TIME ZONE 'America/Sao_Paulo')::date, (${until}::timestamptz AT TIME ZONE 'America/Sao_Paulo')::date, interval '1 day')::date AS day),
        counts AS (SELECT (a."submittedAt" AT TIME ZONE 'America/Sao_Paulo')::date AS day, count(*)::int AS count FROM "Application" a JOIN "User" u ON u.id=a."userId"
          WHERE a."submittedAt">=${since} AND a."submittedAt"<=${until} AND u.active AND u.role='CANDIDATE'
          AND (${query.jobId ?? null}::uuid IS NULL OR a."jobId"=${query.jobId ?? null}::uuid) GROUP BY 1)
        SELECT to_char(d.day,'YYYY-MM-DD') AS date, coalesce(c.count,0)::int AS count FROM days d LEFT JOIN counts c ON c.day=d.day ORDER BY d.day`;
        const [triage] = await tx.$queryRaw<{ averageHours: number | null; sample: number }[]>`
        SELECT avg(extract(epoch FROM (h.at-a."submittedAt"))/3600)::float8 AS "averageHours", count(*)::int AS sample
        FROM "Application" a JOIN "User" u ON u.id=a."userId"
        JOIN LATERAL (SELECT min("createdAt") AS at FROM "ApplicationStageHistory" WHERE "applicationId"=a.id AND "toStatus"='SCREENING') h ON h.at>=a."submittedAt"
        WHERE a."submittedAt">=${since} AND a."submittedAt"<=${until} AND u.active AND u.role='CANDIDATE'
        AND (${query.jobId ?? null}::uuid IS NULL OR a."jobId"=${query.jobId ?? null}::uuid)`;
        return {
          period: info,
          jobId: query.jobId ?? null,
          profiles: { available, month: newProfiles, talent },
          openJobs,
          applications,
          seniority: [...SENIORITIES, null].map((seniority) => ({
            seniority,
            count: levels.find((row) => row.seniority === seniority)?._count._all ?? 0,
          })),
          stages,
          funnel,
          daily,
          conversion: applications
            ? Number(
                (
                  (stages.find((row) => row.status === 'APPROVED')!.count / applications) *
                  100
                ).toFixed(2),
              )
            : null,
          triage: triage!,
          compatibility: query.jobId ? await this.screening.metrics(tx, query.jobId, cohort) : null,
        };
      },
      { isolationLevel: 'RepeatableRead', timeout: 30000 },
    );
  }

  async administration(query: MetricPeriodQuery): Promise<AdministrationMetrics> {
    return this.db.$transaction(
      async (tx) => {
        const { since, until, info } = await this.period(tx, query.days);
        const createdAt = { gte: since, lte: until };
        const activeUsers = await tx.user.count({ where: { active: true } });
        const newUsers = await tx.user.count({ where: { createdAt } });
        const trackedJobs = await tx.jobOpening.count();
        const auditEvents = await tx.auditLog.count({ where: { createdAt } });
        const groups = await tx.user.groupBy({ by: ['role', 'active'], _count: { _all: true } });
        const actions = await tx.auditLog.groupBy({
          by: ['action'],
          where: { createdAt },
          _count: { _all: true },
          orderBy: [{ _count: { action: 'desc' } }, { action: 'asc' }],
          take: 10,
        });
        const daily = await tx.$queryRaw<{ date: string; count: number }[]>`
        WITH days AS (SELECT generate_series((${since}::timestamptz AT TIME ZONE 'America/Sao_Paulo')::date, (${until}::timestamptz AT TIME ZONE 'America/Sao_Paulo')::date, interval '1 day')::date AS day),
        counts AS (SELECT ("createdAt" AT TIME ZONE 'America/Sao_Paulo')::date AS day, count(*)::int AS count FROM "AuditLog" WHERE "createdAt">=${since} AND "createdAt"<=${until} GROUP BY 1)
        SELECT to_char(d.day,'YYYY-MM-DD') AS date, coalesce(c.count,0)::int AS count FROM days d LEFT JOIN counts c ON c.day=d.day ORDER BY d.day`;
        return {
          period: info,
          activeUsers,
          newUsers,
          trackedJobs,
          auditEvents,
          daily,
          roles: (['CANDIDATE', 'RECRUITER', 'ADMIN'] as const).map((role) => ({
            role,
            total: groups
              .filter((row) => row.role === role)
              .reduce((sum, row) => sum + row._count._all, 0),
            active: groups.find((row) => row.role === role && row.active)?._count._all ?? 0,
          })),
          actions: actions.map((row) => ({ action: row.action, count: row._count._all })),
        };
      },
      { isolationLevel: 'RepeatableRead', timeout: 30000 },
    );
  }

  async csv(query: RecruitmentMetricsQuery) {
    const data = await this.recruitment(query);
    const rows: (string | number | null)[][] = [
      ['metric', 'value'],
      ['period_since', data.period.since],
      ['period_until', data.period.until],
      ['job_id', data.jobId],
      ['applications', data.applications],
      ['open_jobs', data.openJobs],
      ['accessible_profiles', data.profiles.available],
      ['active_talents', data.profiles.talent],
      ['profiles_this_month', data.profiles.month],
      ['conversion_percent', data.conversion],
      ['triage_average_hours', data.triage.averageHours],
      ['triage_sample', data.triage.sample],
      ['compatibility_average', data.compatibility?.averageScore ?? null],
      ['compatibility_stale', data.compatibility?.stale ? 1 : 0],
      ['compatibility_available', data.compatibility && !data.compatibility.stale ? 1 : 0],
      ['compatibility_total', data.compatibility?.total ?? null],
      ['compatibility_without_score', data.compatibility?.withoutScore ?? null],
      ...data.seniority.map((row) => [`seniority_${row.seniority ?? 'NOT_INFORMED'}`, row.count]),
      ...(data.compatibility?.bands ?? []).map((row, index) => [
        `compatibility_band_${index}`,
        row.count,
      ]),
      ...data.stages.map((row) => [`stage_${row.status}`, row.count]),
      ...data.funnel.map((row) => [`reached_${row.status}`, row.count]),
      ...data.daily.map((row) => [`applications_${row.date}`, row.count]),
    ];
    return (
      '\uFEFF' +
      rows
        .map((row) =>
          row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(','),
        )
        .join('\r\n') +
      '\r\n'
    );
  }
}
