import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ApplicationStatus, EvaluationDecision, JobStatus, UserRole } from '../generated/prisma/enums.js';
import { CandidatesService } from '../candidates/candidates.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePublicApplicationDto } from './dto/create-public-application.dto.js';
import { RankingService } from '../ranking/ranking.service.js';
import { MoveApplicationStageDto } from './dto/move-application-stage.dto.js';
import { CreateEvaluationDto } from './dto/create-evaluation.dto.js';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto.js';

type Actor = { sub: string; role: UserRole };

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly candidatesService: CandidatesService,
    private readonly rankingService: RankingService,
  ) {}

  async createPublic(dto: CreatePublicApplicationDto) {
    const email = dto.email.trim().toLowerCase();
    const existingCandidate = await this.prisma.candidate.findUnique({ where: { email } });
    if (existingCandidate?.userId) {
      throw new ConflictException('Este e-mail já possui uma conta. Faça login para se candidatar.');
    }

    const candidate = existingCandidate ?? await this.prisma.candidate.create({
      data: {
        email,
        fullName: dto.fullName.trim(),
        phone: dto.phone?.trim(),
        city: dto.city?.trim(),
        state: dto.state?.trim(),
        linkedinUrl: dto.linkedinUrl?.trim(),
        portfolioUrl: dto.portfolioUrl?.trim(),
        professionalBio: dto.professionalBio?.trim(),
        salaryExpectation: dto.salaryExpectation,
        seniority: dto.seniority,
      },
    });

    if (!existingCandidate && dto.skills) await this.candidatesService.replaceSkills(candidate.id, dto.skills);
    return this.createForCandidate(candidate.id, dto.jobId);
  }

  async createForCurrentCandidate(userId: string, jobId: string) {
    const candidate = await this.prisma.candidate.findUnique({ where: { userId } });
    if (!candidate) throw new NotFoundException('Perfil de candidato não encontrado.');
    return this.createForCandidate(candidate.id, jobId);
  }

  async getDetails(id: string, actor: Actor) {
    const application = await this.prisma.application.findUnique({
      where: { id },
      include: {
        candidate: { include: { skills: { include: { skill: true } } } },
        job: true,
        stage: true,
        stageHistory: { include: { stage: true }, orderBy: { changedAt: 'desc' } },
        evaluations: { include: { author: { select: { id: true, email: true, role: true } } }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!application) throw new NotFoundException('Candidatura não encontrada.');

    if (actor.role === UserRole.CANDIDATE && application.candidate.userId !== actor.sub) {
      throw new ConflictException('Você não pode acessar esta candidatura.');
    }
    if (actor.role !== UserRole.CANDIDATE) this.ensureRecruiterCanManage(application.job.createdById, actor);
    return application;
  }

  async moveStage(id: string, actor: Actor, dto: MoveApplicationStageDto) {
    const application = await this.getRecruiterApplication(id, actor);
    if (application.status !== ApplicationStatus.ACTIVE) {
      throw new BadRequestException('Não é possível mover uma candidatura encerrada.');
    }
    const stage = await this.prisma.selectionStage.findFirst({ where: { id: dto.stageId, jobId: application.jobId } });
    if (!stage) throw new BadRequestException('A etapa informada não pertence a esta vaga.');

    return this.prisma.application.update({
      where: { id },
      data: {
        stageId: stage.id,
        stageHistory: { create: { stageId: stage.id, note: dto.note?.trim() } },
      },
      include: { candidate: true, job: true, stage: true },
    });
  }

  async evaluate(id: string, actor: Actor, dto: CreateEvaluationDto) {
    await this.getRecruiterApplication(id, actor);
    return this.prisma.evaluation.create({
      data: { applicationId: id, authorId: actor.sub, decision: dto.decision, note: dto.note?.trim() },
      include: { author: { select: { id: true, email: true, role: true } } },
    });
  }

  async updateStatus(id: string, actor: Actor, dto: UpdateApplicationStatusDto) {
    await this.getRecruiterApplication(id, actor);
    return this.prisma.application.update({ where: { id }, data: { status: dto.status }, include: { candidate: true, job: true, stage: true } });
  }

  private async createForCandidate(candidateId: string, jobId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: { stages: { orderBy: { position: 'asc' } } },
    });
    if (!job) throw new NotFoundException('Vaga não encontrada.');

    if (job.status !== JobStatus.OPEN || job.applicationDeadline < new Date()) {
      return { submitted: false, inTalentPool: true, message: 'Seu perfil foi mantido no banco de talentos para futuras oportunidades.' };
    }
    const firstStage = job.stages[0];
    if (!firstStage) throw new BadRequestException('A vaga não possui etapas configuradas.');

    const exists = await this.prisma.application.findUnique({ where: { candidateId_jobId: { candidateId, jobId } } });
    if (exists) throw new ConflictException('Você já possui uma candidatura para esta vaga.');

    const application = await this.prisma.application.create({
      data: {
        candidateId,
        jobId,
        stageId: firstStage.id,
        status: ApplicationStatus.ACTIVE,
        score: 0,
        stageHistory: { create: { stageId: firstStage.id, note: 'Candidatura recebida.' } },
      },
      include: { job: true, stage: true },
    });

    await this.rankingService.recalculateForJob(jobId);
    const rankedApplication = await this.prisma.application.findUniqueOrThrow({
      where: { id: application.id },
      include: { job: true, stage: true },
    });
    return { submitted: true, inTalentPool: false, application: rankedApplication };
  }

  private async getRecruiterApplication(id: string, actor: Actor) {
    const application = await this.prisma.application.findUnique({ where: { id }, include: { job: true } });
    if (!application) throw new NotFoundException('Candidatura não encontrada.');
    this.ensureRecruiterCanManage(application.job.createdById, actor);
    return application;
  }

  private ensureRecruiterCanManage(createdById: string, actor: Actor) {
    if (actor.role === UserRole.CANDIDATE || (actor.role !== UserRole.ADMIN && createdById !== actor.sub)) {
      throw new ConflictException('Você não pode gerenciar esta candidatura.');
    }
  }
}
