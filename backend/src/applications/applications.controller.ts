import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import type { AuthenticatedRequest } from '../auth/guards/jwt-auth.guard.js';
import { UserRole } from '../generated/prisma/enums.js';
import { ApplicationsService } from './applications.service.js';
import { CreatePublicApplicationDto } from './dto/create-public-application.dto.js';
import { MoveApplicationStageDto } from './dto/move-application-stage.dto.js';
import { CreateEvaluationDto } from './dto/create-evaluation.dto.js';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto.js';

@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Public()
  @Post('public')
  createPublic(@Body() dto: CreatePublicApplicationDto) {
    return this.applicationsService.createPublic(dto);
  }

  @Roles(UserRole.CANDIDATE)
  @Post('me')
  createForCurrentCandidate(@Req() request: AuthenticatedRequest, @Body('jobId') jobId: string) {
    return this.applicationsService.createForCurrentCandidate(request.user.sub, jobId);
  }

  @Get(':id')
  getDetails(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.applicationsService.getDetails(id, request.user);
  }

  @Roles(UserRole.RECRUITER, UserRole.ADMIN)
  @Patch(':id/stage')
  moveStage(@Param('id') id: string, @Req() request: AuthenticatedRequest, @Body() dto: MoveApplicationStageDto) {
    return this.applicationsService.moveStage(id, request.user, dto);
  }

  @Roles(UserRole.RECRUITER, UserRole.ADMIN)
  @Post(':id/evaluations')
  evaluate(@Param('id') id: string, @Req() request: AuthenticatedRequest, @Body() dto: CreateEvaluationDto) {
    return this.applicationsService.evaluate(id, request.user, dto);
  }

  @Roles(UserRole.RECRUITER, UserRole.ADMIN)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Req() request: AuthenticatedRequest, @Body() dto: UpdateApplicationStatusDto) {
    return this.applicationsService.updateStatus(id, request.user, dto);
  }
}
