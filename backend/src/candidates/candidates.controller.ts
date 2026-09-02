import { Body, Controller, Get, Patch, Req } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator.js';
import type { AuthenticatedRequest } from '../auth/guards/jwt-auth.guard.js';
import { UserRole } from '../generated/prisma/enums.js';
import { UpdateCandidateDto } from './dto/update-candidate.dto.js';
import { CandidatesService } from './candidates.service.js';

@Controller('candidates')
@Roles(UserRole.CANDIDATE)
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  @Get('me')
  getCurrent(@Req() request: AuthenticatedRequest) {
    return this.candidatesService.getCurrent(request.user.sub);
  }

  @Patch('me')
  updateCurrent(@Req() request: AuthenticatedRequest, @Body() dto: UpdateCandidateDto) {
    return this.candidatesService.updateCurrent(request.user.sub, dto);
  }
}
