import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateCandidateDto } from './dto/update-candidate.dto.js';
import { RankingService } from '../ranking/ranking.service.js';

const candidateDetails = {
  skills: { include: { skill: true } },
  applications: { include: { job: true, stage: true }, orderBy: { appliedAt: 'desc' as const } },
};

@Injectable()
export class CandidatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rankingService: RankingService,
  ) {}

  async getCurrent(userId: string) {
    const candidate = await this.prisma.candidate.findUnique({ where: { userId }, include: candidateDetails });
    if (!candidate) throw new NotFoundException('Perfil de candidato não encontrado.');
    return candidate;
  }

  async updateCurrent(userId: string, dto: UpdateCandidateDto) {
    const candidate = await this.getCurrent(userId);
    const { skills, ...profile } = dto;

    if (skills) await this.replaceSkills(candidate.id, skills);

    const updatedCandidate = await this.prisma.candidate.update({
      where: { id: candidate.id },
      data: this.cleanProfile(profile),
      include: candidateDetails,
    });
    await Promise.all(updatedCandidate.applications.map(({ jobId }) => this.rankingService.recalculateForJob(jobId)));
    return updatedCandidate;
  }

  async replaceSkills(candidateId: string, skillNames: string[]) {
    const normalized = [...new Set(skillNames.map((skill) => skill.trim()).filter(Boolean))];
    await this.prisma.$transaction(async (transaction) => {
      await transaction.candidateSkill.deleteMany({ where: { candidateId } });
      for (const name of normalized) {
        const skill = await transaction.skill.upsert({ where: { name }, create: { name }, update: {} });
        await transaction.candidateSkill.create({ data: { candidateId, skillId: skill.id } });
      }
    });
    const applications = await this.prisma.application.findMany({ where: { candidateId }, select: { jobId: true } });
    await Promise.all(applications.map(({ jobId }) => this.rankingService.recalculateForJob(jobId)));
  }

  cleanProfile(dto: Omit<UpdateCandidateDto, 'skills'>) {
    return Object.fromEntries(Object.entries(dto).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]));
  }
}
