import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { Public, Roles } from '../auth/access';
import type { AuthRequest } from '../common/http';
import { ResumesService } from '../candidates/resumes.service';
import { TalentConsentDto, TalentQuery } from './dto';
import { TalentPoolService } from './talent-pool.service';

@Controller('talent-pool')
export class TalentPoolController {
  constructor(
    private readonly talents: TalentPoolService,
    private readonly resumes: ResumesService,
  ) {}
  @Public() @Get('policy') policy() {
    return this.talents.policy();
  }
  @Roles('CANDIDATE') @Get('me') own(@Req() req: AuthRequest) {
    return this.talents.membership(req.currentUser.id);
  }
  @Roles('CANDIDATE') @Put('me') join(@Req() req: AuthRequest, @Body() dto: TalentConsentDto) {
    return this.talents.join(req.currentUser.id, dto);
  }
  @Roles('CANDIDATE') @HttpCode(204) @Delete('me') revoke(@Req() req: AuthRequest) {
    return this.talents.revoke(req.currentUser.id);
  }
  @Roles('RECRUITER', 'ADMIN') @Get() list(@Query() query: TalentQuery) {
    return this.talents.list(query);
  }
  @Roles('RECRUITER', 'ADMIN') @Get(':id/profile') profile(@Param('id', ParseUUIDPipe) id: string) {
    return this.talents.profile(id);
  }
  @Roles('RECRUITER', 'ADMIN') @Get(':id/resume') resume(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthRequest,
  ) {
    return this.resumes.download(id, req.currentUser.id, 'talent');
  }
}
