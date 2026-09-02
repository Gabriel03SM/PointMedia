import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

const seniorityOrder = ['INTERN', 'JUNIOR', 'MID', 'SENIOR', 'SPECIALIST'];

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

@Injectable()
export class RankingService {
  constructor(private readonly prisma: PrismaService) {}

  async recalculateForJob(jobId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: { skills: { include: { skill: true } }, requirements: true },
    });
    if (!job) throw new NotFoundException('Vaga não encontrada.');

    const applications = await this.prisma.application.findMany({
      where: { jobId },
      include: { candidate: { include: { skills: { include: { skill: true } } } } },
    });

    await this.prisma.$transaction(
      applications.map((application) => {
        const result = this.calculate(job, application.candidate);
        return this.prisma.application.update({
          where: { id: application.id },
          data: { score: result.score, requiredCriteriaMet: result.requiredCriteriaMet },
        });
      }),
    );

    return { recalculated: applications.length };
  }

  async getRanking(jobId: string, page = 1, limit = 20) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId }, select: { id: true, title: true } });
    if (!job) throw new NotFoundException('Vaga não encontrada.');

    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const where = { jobId };
    const [total, applications] = await this.prisma.$transaction([
      this.prisma.application.count({ where }),
      this.prisma.application.findMany({
        where,
        orderBy: [{ requiredCriteriaMet: 'desc' }, { score: 'desc' }, { appliedAt: 'asc' }],
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        include: {
          candidate: { include: { skills: { include: { skill: true } } } },
          stage: true,
        },
      }),
    ]);

    return { job, page: safePage, limit: safeLimit, total, applications };
  }

  private calculate(
    job: {
      seniority: string | null;
      salaryMax: { toNumber(): number } | null;
      technologyWeight: number;
      seniorityWeight: number;
      salaryWeight: number;
      differentialWeight: number;
      skills: { isRequired: boolean; weight: number; skill: { name: string } }[];
      requirements: { description: string; type: 'REQUIRED' | 'DIFFERENTIAL'; weight: number }[];
    },
    candidate: {
      seniority: string | null;
      salaryExpectation: { toNumber(): number } | null;
      professionalBio: string | null;
      skills: { skill: { name: string } }[];
    },
  ) {
    const candidateSkills = new Set(candidate.skills.map(({ skill }) => normalize(skill.name)));
    const evidence = normalize([candidate.professionalBio ?? '', ...candidateSkills].join(' '));
    const weightedSkillScore = this.weightedMatch(job.skills, candidateSkills);
    const differentials = job.requirements.filter(({ type }) => type === 'DIFFERENTIAL');
    const requiredRequirements = job.requirements.filter(({ type }) => type === 'REQUIRED');
    const differentialScore = this.weightedTextMatch(differentials, evidence);

    const missingRequiredSkills = job.skills.filter(({ isRequired, skill }) => isRequired && !candidateSkills.has(normalize(skill.name)));
    const missingRequiredRequirements = requiredRequirements.filter(({ description }) => !evidence.includes(normalize(description)));

    const components: { score: number; weight: number; enabled: boolean }[] = [
      { score: weightedSkillScore, weight: job.technologyWeight, enabled: job.skills.length > 0 },
      { score: this.seniorityScore(job.seniority, candidate.seniority), weight: job.seniorityWeight, enabled: Boolean(job.seniority && candidate.seniority) },
      { score: this.salaryScore(job.salaryMax?.toNumber(), candidate.salaryExpectation?.toNumber()), weight: job.salaryWeight, enabled: Boolean(job.salaryMax && candidate.salaryExpectation) },
      { score: differentialScore, weight: job.differentialWeight, enabled: differentials.length > 0 },
    ];
    const enabledWeight = components.filter(({ enabled }) => enabled).reduce((sum, component) => sum + component.weight, 0);
    const score = enabledWeight
      ? components.filter(({ enabled }) => enabled).reduce((sum, component) => sum + component.score * component.weight, 0) / enabledWeight * 100
      : 0;

    return {
      score: Math.round(score * 100) / 100,
      requiredCriteriaMet: missingRequiredSkills.length === 0 && missingRequiredRequirements.length === 0,
    };
  }

  private weightedMatch(items: { weight: number; skill: { name: string } }[], candidateSkills: Set<string>) {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    if (!totalWeight) return 0;
    return items.filter(({ skill }) => candidateSkills.has(normalize(skill.name))).reduce((sum, item) => sum + item.weight, 0) / totalWeight;
  }

  private weightedTextMatch(items: { description: string; weight: number }[], evidence: string) {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    if (!totalWeight) return 0;
    return items.filter(({ description }) => evidence.includes(normalize(description))).reduce((sum, item) => sum + item.weight, 0) / totalWeight;
  }

  private seniorityScore(jobSeniority: string | null, candidateSeniority: string | null) {
    if (!jobSeniority || !candidateSeniority) return 0;
    const difference = seniorityOrder.indexOf(candidateSeniority) - seniorityOrder.indexOf(jobSeniority);
    if (difference >= 0) return 1;
    return Math.max(0, 1 + difference * 0.5);
  }

  private salaryScore(salaryMax?: number, expectation?: number) {
    if (!salaryMax || expectation === undefined) return 0;
    if (expectation <= salaryMax) return 1;
    return Math.max(0, 1 - (expectation - salaryMax) / salaryMax);
  }
}
