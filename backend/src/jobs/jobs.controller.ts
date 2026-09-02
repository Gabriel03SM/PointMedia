import { Body, Controller, Get, Param, Patch, Post, Put, Req } from '@nestjs/common';
import { UserRole } from '../generated/prisma/enums.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Public } from '../auth/decorators/public.decorator.js';
import type { AuthenticatedRequest } from '../auth/guards/jwt-auth.guard.js';
import { CreateJobDto } from './dto/create-job.dto.js';
import { ReplaceJobSkillsDto } from './dto/replace-job-skills.dto.js';
import { ReplaceRequirementsDto } from './dto/replace-requirements.dto.js';
import { ReplaceStagesDto } from './dto/replace-stages.dto.js';
import { UpdateJobDto } from './dto/update-job.dto.js';
import { JobsService } from './jobs.service.js';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Public()
  @Get('open')
  findOpen() { return this.jobsService.findOpen(); }

  @Public()
  @Get('open/:id')
  findOneForPublic(@Param('id') id: string) { return this.jobsService.findOneForPublic(id); }

  @Roles(UserRole.RECRUITER, UserRole.ADMIN)
  @Get()
  findAll() { return this.jobsService.findAll(); }

  @Roles(UserRole.RECRUITER, UserRole.ADMIN)
  @Post()
  create(@Req() request: AuthenticatedRequest, @Body() dto: CreateJobDto) {
    return this.jobsService.create(request.user, dto);
  }

  @Roles(UserRole.RECRUITER, UserRole.ADMIN)
  @Get(':id')
  findOne(@Param('id') id: string) { return this.jobsService.findOne(id); }

  @Roles(UserRole.RECRUITER, UserRole.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Req() request: AuthenticatedRequest, @Body() dto: UpdateJobDto) {
    return this.jobsService.update(id, request.user, dto);
  }

  @Roles(UserRole.RECRUITER, UserRole.ADMIN)
  @Post(':id/publish')
  publish(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.jobsService.publish(id, request.user);
  }

  @Roles(UserRole.RECRUITER, UserRole.ADMIN)
  @Post(':id/close')
  close(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.jobsService.close(id, request.user);
  }

  @Roles(UserRole.RECRUITER, UserRole.ADMIN)
  @Put(':id/requirements')
  replaceRequirements(@Param('id') id: string, @Req() request: AuthenticatedRequest, @Body() dto: ReplaceRequirementsDto) {
    return this.jobsService.replaceRequirements(id, request.user, dto);
  }

  @Roles(UserRole.RECRUITER, UserRole.ADMIN)
  @Put(':id/skills')
  replaceSkills(@Param('id') id: string, @Req() request: AuthenticatedRequest, @Body() dto: ReplaceJobSkillsDto) {
    return this.jobsService.replaceSkills(id, request.user, dto);
  }

  @Roles(UserRole.RECRUITER, UserRole.ADMIN)
  @Put(':id/stages')
  replaceStages(@Param('id') id: string, @Req() request: AuthenticatedRequest, @Body() dto: ReplaceStagesDto) {
    return this.jobsService.replaceStages(id, request.user, dto);
  }
}
