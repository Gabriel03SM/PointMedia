import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query, Req } from '@nestjs/common';
import { Roles } from '../auth/access';
import type { AuthRequest } from '../common/http';
import { PageQuery } from '../common/domain';
import { ScreeningConfigurationDto, ScreeningRunDto } from './dto';
import { ScreeningService } from './screening.service';

@Roles('RECRUITER', 'ADMIN')
@Controller('screening/jobs')
export class ScreeningController {
  constructor(private readonly screening: ScreeningService) {}
  @Get(':id/configuration') configuration(@Param('id', ParseUUIDPipe) id: string) {
    return this.screening.getConfiguration(id);
  }
  @Put(':id/configuration') save(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ScreeningConfigurationDto,
    @Req() req: AuthRequest,
  ) {
    return this.screening.saveConfiguration(id, dto, req.currentUser.id);
  }
  @Post(':id/runs') generate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ScreeningRunDto,
    @Req() req: AuthRequest,
  ) {
    return this.screening.generate(id, dto, req.currentUser.id);
  }
  @Get(':id/ranking') ranking(@Param('id', ParseUUIDPipe) id: string, @Query() query: PageQuery) {
    return this.screening.ranking(id, query);
  }
}
