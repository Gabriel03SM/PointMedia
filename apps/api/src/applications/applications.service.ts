import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  TALENT_CONSENT_VERSION,
  type ApplicationInfo,
  type ApplicationResult,
} from '@pointmedia/shared';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { effectiveStatus } from '../jobs/jobs.service';
import { TalentPoolService } from '../talent-pool/talent-pool.service';
import { ProfilesService } from '../candidates/profiles.service';
import { ResumesService } from '../candidates/resumes.service';
import type { ApplicationDto, ApplicationsQuery } from './dto';

const include = {
  job: true,
  user: { select: { id: true, name: true, candidateProfile: { select: { headline: true } } } },
};
type LoadedApplication = Prisma.ApplicationGetPayload<{ include: typeof include }>;
function present(row: LoadedApplication): ApplicationInfo {
  return {
    id: row.id,
    status: row.status,
    version: row.version,
    submittedAt: row.submittedAt.toISOString(),
    job: {
      id: row.job.id,
      title: row.job.title,
      effectiveStatus: effectiveStatus(row.job),
      workMode: row.job.workMode,
    },
  };
}

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly db: PrismaService,
    private readonly talents: TalentPoolService,
    private readonly profiles: ProfilesService,
    private readonly resumes: ResumesService,
  ) {}

  async submit(
    userId: string,
    dto: ApplicationDto,
    transaction?: Prisma.TransactionClient,
  ): Promise<ApplicationResult> {
    if (!dto.processConsent)
      throw new BadRequestException('Autorize a participação nesta vaga antes de enviar.');
    if (dto.talentPoolConsent && dto.talentConsentVersion !== TALENT_CONSENT_VERSION)
      throw new BadRequestException('Revise a autorização atual do banco de talentos.');
    const persist = async (tx: Prisma.TransactionClient): Promise<ApplicationResult> => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId}::uuid FOR UPDATE`;
      await tx.$queryRaw`SELECT "id" FROM "JobOpening" WHERE "id" = ${dto.jobId}::uuid FOR UPDATE`;
      const previous = await tx.application.findUnique({
        where: { userId_jobId: { userId, jobId: dto.jobId } },
        include,
      });
      if (previous)
        return { outcome: 'APPLICATION', application: present(previous), talentConsent: null };
      const job = await tx.jobOpening.findUnique({ where: { id: dto.jobId } });
      if (!job || !['PUBLISHED', 'CLOSED'].includes(job.status))
        throw new NotFoundException('Vaga não encontrada.');
      const profile = await tx.candidateProfile.findUnique({ where: { userId } });
      if (!profile)
        throw new BadRequestException('Salve seu perfil profissional antes de se candidatar.');
      const id = randomUUID();
      // Um mesmo instante determina o prazo e submittedAt; nunca usar now() da transação,
      // pois ela pode ter começado antes de esperar o lock de candidato/vaga.
      const accepted = await tx.$queryRaw<{ id: string }[]>`
        WITH acceptance AS MATERIALIZED (SELECT clock_timestamp()::timestamptz(3) AS at)
        INSERT INTO "Application" ("id", "userId", "jobId", "status", "submittedAt", "authorizationVersion", "profileVersion")
        SELECT ${id}::uuid, ${userId}::uuid, j."id", 'RECEIVED'::"ApplicationStatus", a.at, ${dto.processConsentVersion}, ${profile.version}
        FROM "JobOpening" j CROSS JOIN acceptance a
        WHERE j."id" = ${dto.jobId}::uuid AND j."status" = 'PUBLISHED' AND j."closesAt" > a.at
        RETURNING "id"`;
      if (!accepted.length) {
        if (!dto.talentPoolConsent)
          throw new ConflictException(
            'As inscrições estão encerradas. Você pode optar pelo banco de talentos para futuras oportunidades.',
          );
        return {
          outcome: 'TALENT_POOL',
          application: null,
          talentConsent: await this.talents.grant(tx, userId),
        };
      }
      const talentConsent = dto.talentPoolConsent ? await this.talents.grant(tx, userId) : null;
      const received = await tx.application.findUniqueOrThrow({ where: { id }, include });
      await tx.applicationStageHistory.create({
        data: {
          applicationId: id,
          toStatus: 'RECEIVED',
          version: 1,
          actorId: userId,
          createdAt: received.submittedAt,
        },
      });
      await tx.auditLog.create({
        data: { actorId: userId, action: 'APPLICATION_RECEIVED', entityId: id },
      });
      return {
        outcome: 'APPLICATION',
        application: present(received),
        talentConsent,
      };
    };
    return transaction ? persist(transaction) : this.db.$transaction(persist, { timeout: 15000 });
  }

  async own(userId: string, id: string) {
    const row = await this.db.application.findFirst({ where: { id, userId }, include });
    if (!row) throw new NotFoundException('Candidatura não encontrada.');
    return present(row);
  }

  async list(query: ApplicationsQuery, userId?: string) {
    const where: Prisma.ApplicationWhereInput = {
      ...(userId ? { userId } : { user: { active: true, role: 'CANDIDATE' } }),
      ...(query.jobId ? { jobId: query.jobId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? {
            OR: [
              { job: { title: { contains: query.q, mode: 'insensitive' } } },
              ...(!userId
                ? [{ user: { name: { contains: query.q, mode: 'insensitive' as const } } }]
                : []),
            ],
          }
        : {}),
    };
    const [total, rows] = await this.db.$transaction([
      this.db.application.count({ where }),
      this.db.application.findMany({
        where,
        include,
        orderBy: [{ submittedAt: 'desc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return {
      items: rows.map((row) =>
        userId
          ? present(row)
          : {
              ...present(row),
              candidate: {
                userId: row.user.id,
                name: row.user.name,
                headline: row.user.candidateProfile?.headline ?? null,
              },
            },
      ),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  private async candidate(id: string) {
    const row = await this.db.application.findUnique({ where: { id }, select: { userId: true } });
    if (!row) throw new NotFoundException('Candidatura não encontrada.');
    return row.userId;
  }
  async profile(id: string) {
    return this.profiles.shared(await this.candidate(id), { applicationId: id });
  }
  async resume(id: string, actorId: string) {
    return this.resumes.download(await this.candidate(id), actorId, { applicationId: id });
  }
}
