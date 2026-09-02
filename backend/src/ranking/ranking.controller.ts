import { Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../generated/prisma/enums.js';
import { RankingService } from './ranking.service.js';

@Controller('jobs/:jobId/ranking')
@Roles(UserRole.RECRUITER, UserRole.ADMIN)
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  @Post('recalculate')
  recalculate(@Param('jobId') jobId: string) {
    return this.rankingService.recalculateForJob(jobId);
  }

  @Get()
  getRanking(
    @Param('jobId') jobId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.rankingService.getRanking(jobId, page, limit);
  }
}
