import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Roles } from '../auth/access';
import type { AuthRequest } from '../common/http';
import {
  ApplicationDto,
  ApplicationsQuery,
  ApplicationTransitionDto,
  RecruiterNoteDto,
} from './dto';
import { PageQuery } from '../common/domain';
import { ApplicationProcessService } from './application-process.service';
import { ApplicationsService } from './applications.service';

@Roles('CANDIDATE')
@Controller('applications')
export class ApplicationsController {
  constructor(
    private readonly applications: ApplicationsService,
    private readonly process: ApplicationProcessService,
  ) {}
  @HttpCode(200) @Post() submit(@Req() req: AuthRequest, @Body() dto: ApplicationDto) {
    return this.applications.submit(req.currentUser.id, dto);
  }
  @Get('me') list(@Req() req: AuthRequest, @Query() query: ApplicationsQuery) {
    return this.applications.list(query, req.currentUser.id);
  }
  @Get('me/:id') own(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.applications.own(req.currentUser.id, id);
  }
  @Get('me/:id/history') history(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PageQuery,
  ) {
    return this.process.history(id, query, req.currentUser.id);
  }
}

@Roles('RECRUITER', 'ADMIN')
@Controller('management/applications')
export class ManagementApplicationsController {
  constructor(
    private readonly applications: ApplicationsService,
    private readonly process: ApplicationProcessService,
  ) {}
  @Get() list(@Query() query: ApplicationsQuery) {
    return this.applications.list(query);
  }
  @Get(':id') get(@Param('id', ParseUUIDPipe) id: string) {
    return this.process.get(id);
  }
  @Patch(':id/stage') transition(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
    @Body() dto: ApplicationTransitionDto,
  ) {
    return this.process.transition(id, req.currentUser.id, dto);
  }
  @Get(':id/history') history(@Param('id', ParseUUIDPipe) id: string, @Query() query: PageQuery) {
    return this.process.history(id, query);
  }
  @Get(':id/notes') notes(@Param('id', ParseUUIDPipe) id: string, @Query() query: PageQuery) {
    return this.process.notes(id, query);
  }
  @Post(':id/notes') addNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
    @Body() dto: RecruiterNoteDto,
  ) {
    return this.process.addNote(id, req.currentUser.id, dto);
  }
  @Get(':id/profile') profile(@Param('id', ParseUUIDPipe) id: string) {
    return this.applications.profile(id);
  }
  @Get(':id/resume') resume(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthRequest) {
    return this.applications.resume(id, req.currentUser.id);
  }
}
