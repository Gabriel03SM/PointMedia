import { Injectable } from '@nestjs/common';
import { UserRole } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';

type Actor = { sub: string; role: UserRole };

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(actor: Actor) {
    const jobScope = actor.role === UserRole.ADMIN ? {} : { createdById: actor.sub };
    const applicationScope = actor.role === UserRole.ADMIN ? {} : { job: jobScope };
    const [openJobs, applications, applicationsByStatus, stages, recentApplications] = await Promise.all([
      this.prisma.job.count({ where: { ...jobScope, status: 'OPEN' } }),
      this.prisma.application.count({ where: applicationScope }),
      this.prisma.application.groupBy({ by: ['status'], where: applicationScope, _count: { _all: true } }),
      this.prisma.selectionStage.findMany({
        where: actor.role === UserRole.ADMIN ? {} : { job: jobScope },
        select: { id: true, name: true, job: { select: { id: true, title: true } }, _count: { select: { currentApplications: { where: applicationScope } } } },
        orderBy: [{ jobId: 'asc' }, { position: 'asc' }],
      }),
      this.prisma.application.findMany({
        where: applicationScope,
        orderBy: { appliedAt: 'desc' },
        take: 8,
        include: { candidate: { select: { fullName: true } }, job: { select: { title: true } }, stage: { select: { name: true } } },
      }),
    ]);

    return {
      openJobs,
      totalApplications: applications,
      candidatesByStatus: applicationsByStatus.map((item) => ({ status: item.status, total: item._count._all })),
      candidatesByStage: stages.map((stage) => ({ stageId: stage.id, stage: stage.name, job: stage.job, total: stage._count.currentApplications })),
      recentApplications,
    };
  }
}
