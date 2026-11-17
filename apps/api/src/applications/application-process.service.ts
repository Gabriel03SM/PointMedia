import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { APPLICATION_TRANSITIONS, type ApplicationProcess } from '@pointmedia/shared';
import { PrismaService } from '../database/prisma.service';
import type { Prisma } from '../generated/prisma/client';
import { effectiveStatus } from '../jobs/jobs.service';
import type { PageQuery } from '../common/domain';
import type { ApplicationTransitionDto, RecruiterNoteDto } from './dto';

const include = {
  job: true,
  user: { select: { id: true, name: true, candidateProfile: { select: { headline: true } } } },
};
const actorSelect = { id: true, name: true };
type Client = Prisma.TransactionClient;
type Loaded = Prisma.ApplicationGetPayload<{ include: typeof include }>;

function present(row: Loaded): ApplicationProcess {
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
    candidate: {
      userId: row.user.id,
      name: row.user.name,
      headline: row.user.candidateProfile?.headline ?? null,
    },
    allowedTransitions: APPLICATION_TRANSITIONS[row.status],
  };
}

@Injectable()
export class ApplicationProcessService {
  constructor(private readonly db: PrismaService) {}

  private async available(tx: Client, id: string, userId?: string) {
    const row = await tx.application.findFirst({
      where: { id, ...(userId ? { userId } : { user: { active: true, role: 'CANDIDATE' } }) },
      include,
    });
    if (!row) throw new NotFoundException('Candidatura não encontrada.');
    return row;
  }

  async get(id: string) {
    return present(await this.available(this.db, id));
  }

  async transition(id: string, actorId: string, dto: ApplicationTransitionDto) {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Application" WHERE "id" = ${id}::uuid FOR UPDATE`;
      const row = await this.available(tx, id);
      if (row.version !== dto.version)
        throw new ConflictException(
          'A candidatura foi atualizada. Recarregue antes de decidir novamente.',
        );
      if (!APPLICATION_TRANSITIONS[row.status].includes(dto.status))
        throw new BadRequestException('Transição de etapa não permitida.');
      const updated = await tx.application.update({
        where: { id },
        data: { status: dto.status, version: { increment: 1 } },
        include,
      });
      await tx.applicationStageHistory.create({
        data: {
          applicationId: id,
          fromStatus: row.status,
          toStatus: dto.status,
          version: updated.version,
          internalReason: dto.internalReason,
          publicMessage: dto.publicMessage || null,
          actorId,
        },
      });
      await tx.auditLog.create({
        data: { actorId, action: 'APPLICATION_STAGE_CHANGED', entityId: id },
      });
      return present(updated);
    });
  }

  async history(id: string, query: PageQuery, userId?: string) {
    // Projeções distintas: informações internas nunca são carregadas no fluxo do candidato.
    const select = {
      id: true,
      fromStatus: true,
      toStatus: true,
      version: true,
      createdAt: true,
      publicMessage: true,
      ...(!userId ? { internalReason: true, actor: { select: actorSelect } } : {}),
    };
    return this.db.$transaction(
      async (tx) => {
        await this.available(tx, id, userId);
        const where = { applicationId: id };
        const total = await tx.applicationStageHistory.count({ where });
        const items = await tx.applicationStageHistory.findMany({
          where,
          select,
          orderBy: { version: 'desc' },
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        });
        return { items, total, page: query.page, pageSize: query.pageSize };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }

  async notes(id: string, query: PageQuery) {
    return this.db.$transaction(
      async (tx) => {
        await this.available(tx, id);
        const where = { applicationId: id };
        const total = await tx.recruiterNote.count({ where });
        const items = await tx.recruiterNote.findMany({
          where,
          select: { id: true, body: true, createdAt: true, actor: { select: actorSelect } },
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        });
        return { items, total, page: query.page, pageSize: query.pageSize };
      },
      { isolationLevel: 'RepeatableRead' },
    );
  }

  async addNote(id: string, actorId: string, dto: RecruiterNoteDto) {
    return this.db.$transaction(async (tx) => {
      await this.available(tx, id);
      const note = await tx.recruiterNote.create({
        data: { applicationId: id, actorId, body: dto.body },
        select: { id: true, body: true, createdAt: true, actor: { select: actorSelect } },
      });
      await tx.auditLog.create({
        data: { actorId, action: 'APPLICATION_NOTE_ADDED', entityId: id },
      });
      return note;
    });
  }
}
