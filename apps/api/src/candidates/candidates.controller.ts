import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../auth/access';
import type { AuthRequest } from '../common/http';
import { VersionDto } from '../common/domain';
import { CandidatesQuery, ProfessionalDto } from './dto';
import { ProfilesService } from './profiles.service';
import { ResumesService } from './resumes.service';
import { MAX_RESUME_SIZE, type UploadedResume } from './resume-validation';

@Controller('candidates')
export class CandidatesController {
  constructor(
    private readonly profiles: ProfilesService,
    private readonly resumes: ResumesService,
  ) {}
  @Roles('CANDIDATE') @Get('me/profile') async own(@Req() req: AuthRequest) {
    return { profile: await this.profiles.own(req.currentUser.id) };
  }
  @Roles('CANDIDATE') @Put('me/profile') save(
    @Req() req: AuthRequest,
    @Body() dto: ProfessionalDto,
  ) {
    return this.profiles.save(req.currentUser.id, dto);
  }
  @Roles('CANDIDATE') @HttpCode(204) @Delete('me/profile') removeProfile(
    @Req() req: AuthRequest,
    @Body() dto: VersionDto,
  ) {
    return this.profiles.remove(req.currentUser.id, dto.version);
  }
  @Roles('CANDIDATE')
  @Post('me/resume')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_RESUME_SIZE, files: 1, fields: 0, parts: 2 },
    }),
  )
  upload(@Req() req: AuthRequest, @UploadedFile() file?: UploadedResume) {
    return this.resumes.upload(req.currentUser.id, file);
  }
  @Roles('CANDIDATE') @Get('me/resume') download(@Req() req: AuthRequest) {
    return this.resumes.download(req.currentUser.id);
  }
  @Roles('CANDIDATE') @HttpCode(204) @Delete('me/resume') removeResume(@Req() req: AuthRequest) {
    return this.resumes.remove(req.currentUser.id);
  }
  @Roles('RECRUITER', 'ADMIN') @Get() list(@Query() query: CandidatesQuery) {
    return this.profiles.list(query);
  }
  @Roles('RECRUITER', 'ADMIN') @Get(':id/profile') shared(@Param('id', ParseUUIDPipe) id: string) {
    return this.profiles.shared(id);
  }
  @Roles('RECRUITER', 'ADMIN') @Get(':id/resume') staffDownload(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
  ) {
    return this.resumes.download(id, req.currentUser.id, true);
  }
}
