import { Controller, Get, ParseEnumPipe, ParseIntPipe, Query } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Seniority, UserRole } from '../generated/prisma/enums.js';
import { TalentPoolService } from './talent-pool.service.js';

@Controller('talent-pool')
@Roles(UserRole.RECRUITER, UserRole.ADMIN)
export class TalentPoolController {
  constructor(private readonly talentPoolService: TalentPoolService) {}

  @Get()
  search(
    @Query('search') search?: string,
    @Query('skill') skill?: string,
    @Query('seniority', new ParseEnumPipe(Seniority, { optional: true })) seniority?: Seniority,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.talentPoolService.search({ search, skill, seniority, page, limit });
  }
}
