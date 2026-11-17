import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import type { AuthRequest } from '../common/http';
import { Public, Roles } from '../auth/access';
import { VersionDto } from '../common/domain';
import { JobDto, UpdateJobDto, JobStatusDto, ManagementJobsQuery, PublicJobsQuery } from './dto';
import { JobsService } from './jobs.service';

@Public()
@Controller('jobs')
export class PublicJobsController {
  constructor(private readonly jobs: JobsService) {}
  @Get() list(@Query() query: PublicJobsQuery) {
    return this.jobs.list(query);
  }
  @Get(':id') get(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobs.get(id);
  }
}

@Roles('RECRUITER', 'ADMIN')
@Controller('management/jobs')
export class ManagementJobsController {
  constructor(private readonly jobs: JobsService) {}
  @Get() list(@Query() query: ManagementJobsQuery) {
    return this.jobs.list(query, true);
  }
  @Get(':id') get(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobs.get(id, true);
  }
  @Post() create(@Body() dto: JobDto, @Req() req: AuthRequest) {
    return this.jobs.create(dto, req.currentUser.id);
  }
  @Put(':id') update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateJobDto,
    @Req() req: AuthRequest,
  ) {
    return this.jobs.update(id, dto, req.currentUser.id);
  }
  @Patch(':id/status') status(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: JobStatusDto,
    @Req() req: AuthRequest,
  ) {
    return this.jobs.changeStatus(id, dto.version, dto.status, req.currentUser.id);
  }
  @Delete(':id') cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VersionDto,
    @Req() req: AuthRequest,
  ) {
    return this.jobs.changeStatus(id, dto.version, 'CANCELLED', req.currentUser.id);
  }
}
