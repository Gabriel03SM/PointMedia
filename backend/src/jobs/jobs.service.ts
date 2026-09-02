import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { JobStatus, UserRole } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateJobDto } from './dto/create-job.dto.js';
import { ReplaceJobSkillsDto } from './dto/replace-job-skills.dto.js';
import { ReplaceRequirementsDto } from './dto/replace-requirements.dto.js';
import { ReplaceStagesDto } from './dto/replace-stages.dto.js';
import { UpdateJobDto } from './dto/update-job.dto.js';

type Actor = { sub: string; role: UserRole };

const jobDetails = {
  requirements: true,
  skills: { include: { skill: true } },
  stages: { orderBy: { position: 'asc' as const } },
};

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(actor: Actor, dto: CreateJobDto) {
    this.validateWeights(dto);
    this.validateSalaryRange(dto.salaryMin, dto.salaryMax);

    return this.prisma.job.create({
      data: { ...dto, applicationDeadline: new Date(dto.applicationDeadline), createdById: actor.sub },
      include: jobDetails,
    });
  }

  findOpen() {
    return this.prisma.job.findMany({
      where: { status: JobStatus.OPEN, applicationDeadline: { gte: new Date() } },
      orderBy: { applicationDeadline: 'asc' },
      include: jobDetails,
    });
  }

  async findAll() {
    return this.prisma.job.findMany({
      orderBy: { updatedAt: 'desc' },
      include: jobDetails,
    });
  }

  async findOneForPublic(id: string) {
    const job = await this.prisma.job.findFirst({
      where: { id, status: JobStatus.OPEN },
      include: jobDetails,
    });
    if (!job) throw new NotFoundException('Vaga não encontrada.');
    return job;
  }

  async findOne(id: string) {
    const job = await this.prisma.job.findUnique({ where: { id }, include: jobDetails });
    if (!job) throw new NotFoundException('Vaga não encontrada.');
    return job;
  }

  async update(id: string, actor: Actor, dto: UpdateJobDto) {
    await this.ensureCanManage(id, actor);
    this.validateWeights(dto);
    this.validateSalaryRange(dto.salaryMin, dto.salaryMax);

    return this.prisma.job.update({
      where: { id },
      data: { ...dto, applicationDeadline: dto.applicationDeadline ? new Date(dto.applicationDeadline) : undefined },
      include: jobDetails,
    });
  }

  async publish(id: string, actor: Actor) {
    const job = await this.ensureCanManage(id, actor);
    if (job.applicationDeadline <= new Date()) {
      throw new BadRequestException('O prazo de inscrição deve ser futuro para publicar uma vaga.');
    }
    if (!job.stages.length) {
      throw new BadRequestException('Cadastre ao menos uma etapa antes de publicar a vaga.');
    }
    return this.prisma.job.update({ where: { id }, data: { status: JobStatus.OPEN }, include: jobDetails });
  }

  async close(id: string, actor: Actor) {
    await this.ensureCanManage(id, actor);
    return this.prisma.job.update({ where: { id }, data: { status: JobStatus.CLOSED }, include: jobDetails });
  }

  async replaceRequirements(id: string, actor: Actor, dto: ReplaceRequirementsDto) {
    await this.ensureCanManage(id, actor);
    return this.prisma.$transaction(async (transaction) => {
      await transaction.jobRequirement.deleteMany({ where: { jobId: id } });
      await transaction.jobRequirement.createMany({
        data: dto.requirements.map((requirement) => ({ ...requirement, description: requirement.description.trim(), jobId: id })),
      });
      return transaction.job.findUniqueOrThrow({ where: { id }, include: jobDetails });
    });
  }

  async replaceSkills(id: string, actor: Actor, dto: ReplaceJobSkillsDto) {
    await this.ensureCanManage(id, actor);
    const normalizedSkills = new Map(dto.skills.map((skill) => [skill.name.trim().toLocaleLowerCase(), skill]));
    if (normalizedSkills.size !== dto.skills.length) {
      throw new BadRequestException('Não informe uma competência mais de uma vez.');
    }

    return this.prisma.$transaction(async (transaction) => {
      await transaction.jobSkill.deleteMany({ where: { jobId: id } });
      for (const skill of normalizedSkills.values()) {
        const name = skill.name.trim();
        const savedSkill = await transaction.skill.upsert({
          where: { name },
          create: { name },
          update: {},
        });
        await transaction.jobSkill.create({
          data: { jobId: id, skillId: savedSkill.id, isRequired: skill.isRequired, weight: skill.weight },
        });
      }
      return transaction.job.findUniqueOrThrow({ where: { id }, include: jobDetails });
    });
  }

  async replaceStages(id: string, actor: Actor, dto: ReplaceStagesDto) {
    await this.ensureCanManage(id, actor);
    const positions = new Set(dto.stages.map((stage) => stage.position));
    if (positions.size !== dto.stages.length || dto.stages.filter((stage) => stage.isFinal).length > 1) {
      throw new BadRequestException('As etapas devem ter posições únicas e no máximo uma etapa final.');
    }

    return this.prisma.$transaction(async (transaction) => {
      await transaction.selectionStage.deleteMany({ where: { jobId: id } });
      await transaction.selectionStage.createMany({ data: dto.stages.map((stage) => ({ ...stage, name: stage.name.trim(), jobId: id })) });
      return transaction.job.findUniqueOrThrow({ where: { id }, include: jobDetails });
    });
  }

  private async ensureCanManage(id: string, actor: Actor) {
    const job = await this.findOne(id);
    if (actor.role !== UserRole.ADMIN && job.createdById !== actor.sub) {
      throw new ForbiddenException('Você não pode gerenciar esta vaga.');
    }
    return job;
  }

  private validateWeights(dto: Pick<CreateJobDto, 'technologyWeight' | 'seniorityWeight' | 'salaryWeight' | 'differentialWeight'>) {
    const weights = [dto.technologyWeight, dto.seniorityWeight, dto.salaryWeight, dto.differentialWeight];
    if (weights.every((weight) => weight === undefined)) return;
    if (weights.some((weight) => weight === undefined) || weights.reduce<number>((sum, weight) => sum + (weight ?? 0), 0) !== 100) {
      throw new BadRequestException('Os quatro pesos devem ser informados e totalizar 100.');
    }
  }

  private validateSalaryRange(salaryMin?: number, salaryMax?: number) {
    if (salaryMin !== undefined && salaryMax !== undefined && salaryMin > salaryMax) {
      throw new BadRequestException('O salário mínimo não pode ser maior que o máximo.');
    }
  }
}
