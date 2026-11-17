import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Job, JobStatus, PageResult } from '@pointmedia/shared';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { normalizeName, uniqueNames, valueOrNotApplicable } from '../common/domain';
import type { JobDto, UpdateJobDto, PublicJobsQuery, ManagementJobsQuery } from './dto';

const include = { requirements: { orderBy: { positionIndex: 'asc' as const } } };
type LoadedJob = Prisma.JobOpeningGetPayload<{ include: typeof include }>;
export function effectiveStatus(
  job: { status: JobStatus; closesAt: Date },
  now = new Date(),
): JobStatus {
  return job.status === 'PUBLISHED' && job.closesAt <= now ? 'CLOSED' : job.status;
}
function present(job: LoadedJob): Job {
  return {
    id: job.id,
    title: job.title,
    description: job.description,
    department: job.department ?? undefined,
    workMode: job.workMode,
    seniority: job.seniority,
    seniorityNotApplicable: job.seniorityNotApplicable,
    location: job.location,
    locationNotApplicable: job.locationNotApplicable,
    salaryMin: job.salaryMin?.toFixed(2) ?? null,
    salaryMax: job.salaryMax?.toFixed(2) ?? null,
    salaryNotApplicable: job.salaryNotApplicable,
    closesAt: job.closesAt.toISOString(),
    status: job.status,
    effectiveStatus: effectiveStatus(job),
    version: job.version,
    publishedAt: job.publishedAt?.toISOString() ?? null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    requiredSkills: job.requirements.filter((item) => item.mandatory).map((item) => item.name),
    desiredSkills: job.requirements.filter((item) => !item.mandatory).map((item) => item.name),
  };
}

function values(dto: JobDto) {
  valueOrNotApplicable('Senioridade', dto.seniorityNotApplicable, dto.seniority != null);
  valueOrNotApplicable('Localização', dto.locationNotApplicable, Boolean(dto.location));
  const min = dto.salaryMin == null ? null : new Prisma.Decimal(dto.salaryMin);
  const max = dto.salaryMax == null ? null : new Prisma.Decimal(dto.salaryMax);
  valueOrNotApplicable('Faixa salarial', dto.salaryNotApplicable, min != null || max != null);
  if (!dto.salaryNotApplicable && (min == null || max == null || min.gt(max)))
    throw new BadRequestException('Informe os limites da faixa salarial em ordem crescente.');
  uniqueNames([...dto.requiredSkills, ...dto.desiredSkills]);
  return {
    title: dto.title,
    description: dto.description,
    department: dto.department || null,
    workMode: dto.workMode,
    seniority: dto.seniority ?? null,
    seniorityNotApplicable: dto.seniorityNotApplicable,
    location: dto.location ?? null,
    locationNotApplicable: dto.locationNotApplicable,
    salaryMin: min,
    salaryMax: max,
    salaryNotApplicable: dto.salaryNotApplicable,
    closesAt: new Date(dto.closesAt),
  };
}
const requirements = (dto: JobDto) =>
  [
    ...dto.requiredSkills.map((name) => ({
      name,
      normalizedName: normalizeName(name),
      mandatory: true,
    })),
    ...dto.desiredSkills.map((name) => ({
      name,
      normalizedName: normalizeName(name),
      mandatory: false,
    })),
  ].map((item, positionIndex) => ({ ...item, positionIndex }));

@Injectable()
export class JobsService {
  constructor(private readonly db: PrismaService) {}

  async list(
    query: PublicJobsQuery | ManagementJobsQuery,
    management = false,
  ): Promise<PageResult<Job>> {
    const now = new Date();
    const filters: Prisma.JobOpeningWhereInput[] = [];
    if (!management) {
      const publicQuery = query as PublicJobsQuery;
      filters.push({ status: 'PUBLISHED', closesAt: { gt: now } });
      if (publicQuery.seniority) filters.push({ seniority: publicQuery.seniority });
      if (publicQuery.workMode) filters.push({ workMode: publicQuery.workMode });
    } else {
      const { status, department } = query as ManagementJobsQuery;
      if (status === 'CLOSED')
        filters.push({
          OR: [{ status: 'CLOSED' }, { status: 'PUBLISHED', closesAt: { lte: now } }],
        });
      else if (status === 'PUBLISHED') filters.push({ status, closesAt: { gt: now } });
      else if (status) filters.push({ status });
      if (department) filters.push({ department: { equals: department, mode: 'insensitive' } });
    }
    if (query.q)
      filters.push({
        OR: ['title', 'description', 'department'].map((field) => ({
          [field]: { contains: query.q, mode: 'insensitive' },
        })),
      });
    const where: Prisma.JobOpeningWhereInput = { AND: filters };
    const [total, rows] = await this.db.$transaction([
      this.db.jobOpening.count({ where }),
      this.db.jobOpening.findMany({
        where,
        include,
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return { items: rows.map(present), total, page: query.page, pageSize: query.pageSize };
  }

  async get(id: string, management = false) {
    const job = await this.db.jobOpening.findFirst({
      where: { id, ...(management ? {} : { status: { in: ['PUBLISHED', 'CLOSED'] } }) },
      include,
    });
    if (!job) throw new NotFoundException('Vaga não encontrada.');
    return present(job);
  }

  async create(dto: JobDto, actorId: string) {
    const data = values(dto);
    return this.db.$transaction(async (tx) => {
      const row = await tx.jobOpening.create({
        data: { ...data, createdById: actorId, requirements: { create: requirements(dto) } },
        include,
      });
      await tx.auditLog.create({ data: { actorId, action: 'JOB_CREATED', entityId: row.id } });
      return present(row);
    });
  }

  async update(id: string, dto: UpdateJobDto, actorId: string) {
    const data = values(dto);
    return this.db.$transaction(async (tx) => {
      const previous = await tx.jobOpening.findUnique({ where: { id } });
      if (!previous) throw new NotFoundException('Vaga não encontrada.');
      if (['CLOSED', 'CANCELLED'].includes(effectiveStatus(previous)))
        throw new ConflictException('Vagas encerradas ou canceladas não podem ser alteradas.');
      if (previous.status === 'PUBLISHED' && data.closesAt <= new Date())
        throw new BadRequestException('Use Encerrar vaga para finalizar inscrições.');
      const changed = await tx.jobOpening.updateMany({
        where: { id, version: dto.version },
        data: { ...data, version: { increment: 1 } },
      });
      if (!changed.count)
        throw new ConflictException('A vaga foi alterada. Atualize antes de salvar.');
      await tx.jobRequirement.deleteMany({ where: { jobId: id } });
      await tx.jobRequirement.createMany({
        data: requirements(dto).map((item) => ({ ...item, jobId: id })),
      });
      await tx.auditLog.create({ data: { actorId, action: 'JOB_UPDATED', entityId: id } });
      return present(await tx.jobOpening.findUniqueOrThrow({ where: { id }, include }));
    });
  }

  async changeStatus(
    id: string,
    version: number,
    status: Exclude<JobStatus, 'DRAFT'>,
    actorId: string,
  ) {
    return this.db.$transaction(async (tx) => {
      const job = await tx.jobOpening.findUnique({ where: { id } });
      if (!job) throw new NotFoundException('Vaga não encontrada.');
      if (job.version !== version)
        throw new ConflictException('A vaga foi alterada. Atualize antes de continuar.');
      if (job.status === status)
        return present(await tx.jobOpening.findUniqueOrThrow({ where: { id }, include }));
      const now = new Date();
      if (status === 'PUBLISHED' && (job.status !== 'DRAFT' || job.closesAt <= now))
        throw new BadRequestException('Somente um rascunho com prazo futuro pode ser publicado.');
      if (status === 'CLOSED' && job.status !== 'PUBLISHED')
        throw new BadRequestException('Somente vagas publicadas podem ser encerradas.');
      if (job.status === 'CANCELLED') throw new ConflictException('A vaga está cancelada.');
      const changed = await tx.jobOpening.updateMany({
        where: { id, version },
        data: {
          status,
          version: { increment: 1 },
          ...(status === 'PUBLISHED' ? { publishedAt: now } : {}),
        },
      });
      if (!changed.count)
        throw new ConflictException('A vaga foi alterada. Atualize antes de continuar.');
      await tx.auditLog.create({ data: { actorId, action: `JOB_${status}`, entityId: id } });
      return present(await tx.jobOpening.findUniqueOrThrow({ where: { id }, include }));
    });
  }
}
