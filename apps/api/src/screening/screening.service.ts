import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import {
  DEFAULT_SCREENING_SETTINGS,
  SCREENING_ALGORITHM_VERSION,
  type ScreeningConfiguration as PublicConfiguration,
  type ScreeningRanking,
  type ScreeningEvaluation,
  type ScreeningRunInfo,
  type CompatibilityMetrics,
} from '@pointmedia/shared';
import { PrismaService } from '../database/prisma.service';
import { Prisma, type ScreeningConfiguration, type ScreeningRun } from '../generated/prisma/client';
import type { PageQuery } from '../common/domain';
import { ScreeningConfigurationDto, ScreeningRunDto } from './dto';
import { evaluate } from './evaluate';

const profileSelect = {
  userId: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  headline: true,
  seniority: true,
  expectedSalary: true,
  skills: { include: { skill: true } },
};
const applicationInclude = {
  user: { select: { id: true, name: true, candidateProfile: { select: profileSelect } } },
};
type SourceApplication = Prisma.ApplicationGetPayload<{ include: typeof applicationInclude }>;
const jobInclude = { requirements: { orderBy: { positionIndex: 'asc' as const } } };
const activeUser = { active: true, role: 'CANDIDATE' as const };
const availableResults = {
  application: { user: { ...activeUser, candidateProfile: { isNot: null } } },
};

function configuration(row: ScreeningConfiguration): PublicConfiguration {
  return {
    id: row.id,
    jobId: row.jobId,
    version: row.version,
    algorithmVersion: row.algorithmVersion,
    createdAt: row.createdAt.toISOString(),
    skillsWeight: row.skillsWeight,
    seniorityWeight: row.seniorityWeight,
    salaryWeight: row.salaryWeight,
    mandatorySkillsShare: row.mandatorySkillsShare,
    requireCompleteData: row.requireCompleteData,
  };
}
function signature(jobVersion: number, configurationId: string, applications: SourceApplication[]) {
  const inputs = applications
    .map((row) => ({
      id: row.id,
      profile: row.user.candidateProfile
        ? {
            version: row.user.candidateProfile.version,
            createdAt: row.user.candidateProfile.createdAt.toISOString(),
            updatedAt: row.user.candidateProfile.updatedAt.toISOString(),
          }
        : null,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  return createHash('sha256')
    .update(JSON.stringify({ jobVersion, configurationId, inputs }))
    .digest('hex');
}

@Injectable()
export class ScreeningService {
  constructor(private readonly db: PrismaService) {}

  private async job(tx: Prisma.TransactionClient, id: string) {
    const row = await tx.jobOpening.findUnique({ where: { id }, include: jobInclude });
    if (!row) throw new NotFoundException('Vaga não encontrada.');
    return row;
  }
  private latest(tx: Prisma.TransactionClient, jobId: string) {
    return tx.screeningConfiguration.findFirst({ where: { jobId }, orderBy: { version: 'desc' } });
  }
  async metrics(
    tx: Prisma.TransactionClient,
    jobId: string,
    cohort: Prisma.ApplicationWhereInput,
  ): Promise<CompatibilityMetrics | null> {
    const job = await this.job(tx, jobId);
    const config = await this.latest(tx, jobId);
    const run = await tx.screeningRun.findFirst({
      where: { jobId },
      orderBy: { sequence: 'desc' },
    });
    if (!run) return null;
    const stale =
      !config ||
      run.configurationId !== config.id ||
      run.sourceHash !== signature(job.version, config.id, await this.applications(tx, jobId));
    const base = {
      runId: run.id,
      generatedAt: run.createdAt.toISOString(),
      stale,
      averageScore: null,
      total: 0,
      withoutScore: 0,
      bands: [],
    };
    if (stale) return base;
    const where = { runId: run.id, application: { AND: [cohort, availableResults.application] } };
    const aggregate = await tx.screeningResult.aggregate({
      where,
      _avg: { score: true },
      _count: { _all: true, score: true },
    });
    const bands = [];
    for (const [label, min, max] of [
      ['Abaixo de 60', 0, 60],
      ['60 a 74,99', 60, 75],
      ['75 a 89,99', 75, 90],
      ['90 a 100', 90, 101],
    ] as const) {
      bands.push({
        label,
        count: await tx.screeningResult.count({
          where: { ...where, score: { gte: min, lt: max } },
        }),
      });
    }
    return {
      ...base,
      averageScore: aggregate._avg.score ? Number(aggregate._avg.score.toFixed(2)) : null,
      total: aggregate._count._all,
      withoutScore: aggregate._count._all - aggregate._count.score,
      bands,
    };
  }
  async getConfiguration(id: string) {
    return this.db.$transaction(async (tx) => {
      const job = await this.job(tx, id);
      const current = await this.latest(tx, id);
      return {
        configuration: current ? configuration(current) : null,
        defaults: DEFAULT_SCREENING_SETTINGS,
        jobVersion: job.version,
      };
    });
  }
  async saveConfiguration(id: string, dto: ScreeningConfigurationDto, actorId: string) {
    if (dto.skillsWeight + dto.seniorityWeight + dto.salaryWeight !== 100)
      throw new BadRequestException(
        'A soma dos pesos de tecnologias, senioridade e salário deve ser 100.',
      );
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "JobOpening" WHERE "id" = ${id}::uuid FOR UPDATE`;
      const job = await this.job(tx, id);
      const current = await this.latest(tx, id);
      if ((current?.version ?? 0) !== dto.version)
        throw new ConflictException('A configuração foi alterada. Atualize antes de salvar.');
      const saved = await tx.screeningConfiguration.create({
        data: {
          jobId: id,
          version: dto.version + 1,
          skillsWeight: dto.skillsWeight,
          seniorityWeight: dto.seniorityWeight,
          salaryWeight: dto.salaryWeight,
          mandatorySkillsShare: dto.mandatorySkillsShare,
          requireCompleteData: dto.requireCompleteData,
          algorithmVersion: SCREENING_ALGORITHM_VERSION,
          createdById: actorId,
        },
      });
      await tx.auditLog.create({
        data: { actorId, action: 'SCREENING_CONFIGURATION_SAVED', entityId: saved.id },
      });
      return {
        configuration: configuration(saved),
        defaults: DEFAULT_SCREENING_SETTINGS,
        jobVersion: job.version,
      };
    });
  }
  private applications(tx: Prisma.TransactionClient, jobId: string) {
    return tx.application.findMany({
      where: { jobId, user: activeUser },
      include: applicationInclude,
      orderBy: { id: 'asc' },
    });
  }
  private async runInfo(
    tx: Prisma.TransactionClient,
    run: ScreeningRun,
    config: ScreeningConfiguration,
  ): Promise<ScreeningRunInfo> {
    const where = { runId: run.id, ...availableResults };
    const evaluatedCount = await tx.screeningResult.count({ where });
    const reviewRequiredCount = await tx.screeningResult.count({
      where: { ...where, reviewRequired: true },
    });
    const withoutScoreCount = await tx.screeningResult.count({ where: { ...where, score: null } });
    return {
      id: run.id,
      sequence: run.sequence,
      configurationVersion: config.version,
      algorithmVersion: config.algorithmVersion,
      jobVersion: run.jobVersion,
      createdAt: run.createdAt.toISOString(),
      evaluatedCount,
      reviewRequiredCount,
      withoutScoreCount,
    };
  }
  async generate(id: string, dto: ScreeningRunDto, actorId: string) {
    try {
      return await this.db.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT "id" FROM "JobOpening" WHERE "id" = ${id}::uuid FOR UPDATE`;
          const job = await this.job(tx, id);
          const config = await this.latest(tx, id);
          if (!config)
            throw new ConflictException('Salve os pesos e critérios antes de gerar o ranking.');
          if (config.version !== dto.configurationVersion || job.version !== dto.jobVersion)
            throw new ConflictException(
              'A vaga ou os critérios foram alterados. Atualize antes de gerar.',
            );
          if (config.algorithmVersion !== SCREENING_ALGORITHM_VERSION)
            throw new ConflictException('Salve uma configuração com a versão atual do algoritmo.');
          const applications = await this.applications(tx, id);
          const previousRun = await tx.screeningRun.findFirst({
            where: { jobId: id },
            orderBy: { sequence: 'desc' },
            select: { sequence: true },
          });
          const run = await tx.screeningRun.create({
            data: {
              jobId: id,
              configurationId: config.id,
              jobVersion: job.version,
              sequence: (previousRun?.sequence ?? 0) + 1,
              sourceHash: signature(job.version, config.id, applications),
              createdById: actorId,
            },
          });
          const jobInput = {
            requiredSkills: job.requirements
              .filter((item) => item.mandatory)
              .map((item) => item.name),
            desiredSkills: job.requirements
              .filter((item) => !item.mandatory)
              .map((item) => item.name),
            seniority: job.seniority,
            salaryMax: job.salaryMax?.toFixed(2) ?? null,
          };
          const values: Prisma.ScreeningResultCreateManyInput[] = [];
          for (const application of applications) {
            const profile = application.user.candidateProfile;
            if (!profile) continue;
            const evaluation = evaluate(
              jobInput,
              {
                skills: profile.skills.map((item) => item.skill.name),
                seniority: profile.seniority,
                expectedSalary: profile.expectedSalary?.toFixed(2) ?? null,
              },
              config,
            );
            values.push({
              runId: run.id,
              applicationId: application.id,
              profileVersion: profile.version,
              score: evaluation.score,
              coverage: evaluation.coverage,
              reviewRequired: evaluation.reviewRequired,
              evaluation: JSON.parse(JSON.stringify(evaluation)) as Prisma.InputJsonObject,
            });
          }
          for (let offset = 0; offset < values.length; offset += 500)
            await tx.screeningResult.createMany({ data: values.slice(offset, offset + 500) });
          await tx.auditLog.create({
            data: { actorId, action: 'SCREENING_RUN_CREATED', entityId: run.id },
          });
          return this.runInfo(tx, run, config);
        },
        { isolationLevel: 'RepeatableRead', timeout: 30000 },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ['P2034', 'P2002'].includes(error.code)
      )
        throw new ConflictException(
          'Os dados foram alterados durante o processamento. Atualize e tente novamente.',
        );
      throw error;
    }
  }
  async ranking(id: string, query: PageQuery): Promise<ScreeningRanking> {
    return this.db.$transaction(
      async (tx) => {
        const job = await this.job(tx, id);
        const current = await this.latest(tx, id);
        const applications = await this.applications(tx, id);
        const latest = await tx.screeningRun.findFirst({
          where: { jobId: id },
          orderBy: { sequence: 'desc' },
          include: { configuration: true },
        });
        const base = {
          configuration: current ? configuration(current) : null,
          run: null,
          stale: false,
          applicationsCount: applications.length,
          unavailableProfiles: applications.filter((row) => !row.user.candidateProfile).length,
          items: [],
          total: 0,
          page: query.page,
          pageSize: query.pageSize,
        };
        if (!latest) return base;
        const stale =
          !current ||
          latest.configurationId !== current.id ||
          latest.sourceHash !== signature(job.version, current.id, applications);
        const where: Prisma.ScreeningResultWhereInput = {
          runId: latest.id,
          ...availableResults,
          ...(query.q
            ? {
                application: {
                  user: {
                    ...activeUser,
                    candidateProfile: { isNot: null },
                    OR: [
                      { name: { contains: query.q, mode: 'insensitive' } },
                      {
                        candidateProfile: { headline: { contains: query.q, mode: 'insensitive' } },
                      },
                    ],
                  },
                },
              }
            : {}),
        };
        const total = await tx.screeningResult.count({ where });
        const rows = await tx.screeningResult.findMany({
          where,
          include: { application: { include: applicationInclude } },
          orderBy: [
            { score: { sort: 'desc', nulls: 'last' } },
            { coverage: 'desc' },
            { application: { submittedAt: 'asc' } },
            { applicationId: 'asc' },
          ],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        });
        return {
          ...base,
          stale,
          run: await this.runInfo(tx, latest, latest.configuration),
          total,
          items: rows.map((row) => ({
            ...(row.evaluation as unknown as ScreeningEvaluation),
            applicationId: row.applicationId,
            submittedAt: row.application.submittedAt.toISOString(),
            profileVersion: row.profileVersion,
            candidate: {
              userId: row.application.user.id,
              name: row.application.user.name,
              headline: row.application.user.candidateProfile!.headline,
            },
          })),
        };
      },
      { isolationLevel: 'RepeatableRead', timeout: 15000 },
    );
  }
}
