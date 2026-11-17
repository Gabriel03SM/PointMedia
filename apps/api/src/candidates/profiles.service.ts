import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ProfessionalProfile, PageResult, ProfileField } from '@pointmedia/shared';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { normalizeName, uniqueNames, valueOrNotApplicable } from '../common/domain';
import type { CandidatesQuery, ProfessionalDto } from './dto';
import { ResumesService, resumeInfo } from './resumes.service';
import { recruitmentAccess, type RecruitmentScope } from './recruitment-access';

const include = {
  user: { include: { resume: true } },
  skills: { include: { skill: true } },
  experience: { orderBy: { positionIndex: 'asc' as const } },
  education: { orderBy: { positionIndex: 'asc' as const } },
};
type LoadedProfile = Prisma.CandidateProfileGetPayload<{ include: typeof include }>;

function present(profile: LoadedProfile): ProfessionalProfile {
  return {
    userId: profile.userId,
    name: profile.user.name,
    email: profile.user.email,
    phone: profile.user.phone,
    version: profile.version,
    headline: profile.headline,
    location: profile.location,
    seniority: profile.seniority,
    expectedSalary: profile.expectedSalary?.toFixed(2) ?? null,
    linkedin: profile.linkedin,
    portfolio: profile.portfolio,
    about: profile.about,
    notApplicable: profile.notApplicable,
    shareWithRecruiters: Boolean(profile.recruitmentConsentAt),
    skills: profile.skills
      .map(({ skill }) => skill.name)
      .sort((a, b) => a.localeCompare(b, 'pt-BR')),
    experience: profile.experience.map(
      ({ company, position, startedMonth, endedMonth, description }) => ({
        company,
        position,
        startedMonth,
        endedMonth,
        description,
      }),
    ),
    education: profile.education.map(({ institution, course, startedYear, finishedYear }) => ({
      institution,
      course,
      startedYear,
      finishedYear,
    })),
    resume: profile.user.resume ? resumeInfo(profile.user.resume) : null,
    updatedAt: profile.updatedAt.toISOString(),
  };
}
function validate(dto: ProfessionalDto) {
  const absent = (field: ProfileField) => dto.notApplicable.includes(field);
  for (const [field, hasValue] of [
    ['LOCATION', Boolean(dto.location)],
    ['SENIORITY', dto.seniority != null],
    ['SALARY', dto.expectedSalary != null],
    ['LINKEDIN', Boolean(dto.linkedin)],
    ['PORTFOLIO', Boolean(dto.portfolio)],
    ['SKILLS', dto.skills.length > 0],
    ['EXPERIENCE', dto.experience.length > 0],
    ['EDUCATION', dto.education.length > 0],
  ] as const)
    valueOrNotApplicable(field, absent(field), hasValue);
  if (dto.linkedin && !/^(www\.)?linkedin\.com$/i.test(new URL(dto.linkedin).hostname))
    throw new BadRequestException('Informe um endereço do LinkedIn.');
  uniqueNames(dto.skills);
  for (const item of dto.experience) {
    if (item.endedMonth && item.endedMonth < item.startedMonth)
      throw new BadRequestException('O fim da experiência não pode anteceder o início.');
  }
  for (const item of dto.education) {
    if (item.finishedYear != null && item.finishedYear < item.startedYear)
      throw new BadRequestException('O fim da formação não pode anteceder o início.');
  }
}

@Injectable()
export class ProfilesService {
  constructor(
    private readonly db: PrismaService,
    private readonly resumes: ResumesService,
  ) {}

  async own(userId: string) {
    const row = await this.db.candidateProfile.findUnique({ where: { userId }, include });
    return row ? present(row) : null;
  }
  async shared(userId: string, scope: RecruitmentScope = 'shared') {
    const row = await this.db.candidateProfile.findFirst({
      where: { userId, ...recruitmentAccess(scope) },
      include,
    });
    if (!row) throw new NotFoundException('Perfil não disponível para recrutamento.');
    return present(row);
  }
  async list(query: CandidatesQuery): Promise<PageResult<ProfessionalProfile>> {
    const where: Prisma.CandidateProfileWhereInput = {
      recruitmentConsentAt: { not: null },
      user: { active: true },
      ...(query.seniority ? { seniority: query.seniority } : {}),
      ...(query.skill
        ? { skills: { some: { skill: { normalizedName: normalizeName(query.skill) } } } }
        : {}),
      ...(query.q
        ? {
            OR: [
              { user: { name: { contains: query.q, mode: 'insensitive' } } },
              { headline: { contains: query.q, mode: 'insensitive' } },
              { location: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    return this.search(where, query);
  }
  async search(
    where: Prisma.CandidateProfileWhereInput,
    query: CandidatesQuery,
  ): Promise<PageResult<ProfessionalProfile>> {
    const [total, rows] = await this.db.$transaction([
      this.db.candidateProfile.count({ where }),
      this.db.candidateProfile.findMany({
        where,
        include,
        orderBy:
          query.sort === 'name'
            ? [{ user: { name: 'asc' } }, { userId: 'asc' }]
            : [{ updatedAt: 'desc' }, { userId: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return { items: rows.map(present), total, page: query.page, pageSize: query.pageSize };
  }
  async save(userId: string, dto: ProfessionalDto, transaction?: Prisma.TransactionClient) {
    validate(dto);
    const persist = async (tx: Prisma.TransactionClient) => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId}::uuid FOR UPDATE`;
      const previous = await tx.candidateProfile.findUnique({ where: { userId } });
      if ((previous?.version ?? 0) !== dto.version)
        throw new ConflictException('O perfil foi alterado. Atualize antes de salvar.');
      const data = {
        headline: dto.headline,
        location: dto.location ?? null,
        seniority: dto.seniority ?? null,
        expectedSalary: dto.expectedSalary == null ? null : new Prisma.Decimal(dto.expectedSalary),
        linkedin: dto.linkedin ?? null,
        portfolio: dto.portfolio ?? null,
        about: dto.about,
        notApplicable: dto.notApplicable,
        recruitmentConsentAt: dto.shareWithRecruiters
          ? (previous?.recruitmentConsentAt ?? new Date())
          : null,
        version: dto.version + 1,
      };
      await tx.user.update({
        where: { id: userId },
        data: { name: dto.name, phone: dto.phone || null },
      });
      await tx.candidateProfile.upsert({
        where: { userId },
        create: { ...data, userId },
        update: data,
      });
      await tx.candidateSkill.deleteMany({ where: { userId } });
      for (const name of dto.skills) {
        const skill = await tx.skill.upsert({
          where: { normalizedName: normalizeName(name) },
          create: { name, normalizedName: normalizeName(name) },
          update: {},
        });
        await tx.candidateSkill.create({ data: { userId, skillId: skill.id } });
      }
      await tx.professionalExperience.deleteMany({ where: { userId } });
      await tx.education.deleteMany({ where: { userId } });
      await tx.professionalExperience.createMany({
        data: dto.experience.map((item, positionIndex) => ({ ...item, userId, positionIndex })),
      });
      await tx.education.createMany({
        data: dto.education.map((item, positionIndex) => ({ ...item, userId, positionIndex })),
      });
      await tx.auditLog.create({
        data: { actorId: userId, action: 'PROFESSIONAL_PROFILE_SAVED', entityId: userId },
      });
      return present(await tx.candidateProfile.findUniqueOrThrow({ where: { userId }, include }));
    };
    return transaction ? persist(transaction) : this.db.$transaction(persist, { timeout: 15000 });
  }

  async remove(userId: string, version: number) {
    const file = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId}::uuid FOR UPDATE`;
      const row = await tx.candidateProfile.findUnique({ where: { userId } });
      if (!row) throw new NotFoundException('Perfil não encontrado.');
      if (row.version !== version)
        throw new ConflictException('O perfil foi alterado. Atualize antes de remover.');
      const resume = await tx.resumeFile.findUnique({ where: { userId } });
      await tx.resumeFile.deleteMany({ where: { userId } });
      const revoked = await tx.talentConsent.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (revoked.count)
        await tx.auditLog.create({
          data: { actorId: userId, action: 'TALENT_CONSENT_REVOKED', entityId: userId },
        });
      await tx.candidateProfile.delete({ where: { userId } });
      await tx.auditLog.create({
        data: { actorId: userId, action: 'PROFESSIONAL_PROFILE_REMOVED', entityId: userId },
      });
      return resume?.storageKey;
    });
    if (file) await this.resumes.removeStored(file);
  }
}
