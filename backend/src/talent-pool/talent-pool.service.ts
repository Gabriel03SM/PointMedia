import { Injectable } from '@nestjs/common';
import { Seniority } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';

type TalentPoolFilters = {
  search?: string;
  skill?: string;
  seniority?: Seniority;
  page?: number;
  limit?: number;
};

@Injectable()
export class TalentPoolService {
  constructor(private readonly prisma: PrismaService) {}

  async search(filters: TalentPoolFilters) {
    const page = Math.max(filters.page ?? 1, 1);
    const limit = Math.min(Math.max(filters.limit ?? 20, 1), 100);
    const search = filters.search?.trim();
    const skill = filters.skill?.trim();
    const where = {
      ...(filters.seniority ? { seniority: filters.seniority } : {}),
      ...(search ? {
        OR: [
          { fullName: { contains: search } },
          { email: { contains: search } },
          { city: { contains: search } },
        ],
      } : {}),
      ...(skill ? { skills: { some: { skill: { name: { contains: skill } } } } } : {}),
    };
    const [total, candidates] = await this.prisma.$transaction([
      this.prisma.candidate.count({ where }),
      this.prisma.candidate.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          skills: { include: { skill: true } },
          applications: { include: { job: { select: { id: true, title: true } }, stage: { select: { name: true } } }, orderBy: { appliedAt: 'desc' } },
        },
      }),
    ]);
    return { page, limit, total, candidates };
  }
}
