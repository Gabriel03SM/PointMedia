import { Controller, Get, Header, Query } from '@nestjs/common';
import { Roles } from '../auth/access';
import { AnalyticsService } from './analytics.service';
import { MetricPeriodQuery, RecruitmentMetricsQuery } from './dto';

@Roles('RECRUITER', 'ADMIN')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}
  @Get('recruitment') recruitment(@Query() query: RecruitmentMetricsQuery) {
    return this.analytics.recruitment(query);
  }
  @Get('recruitment/export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="pointmedia-indicadores.csv"')
  export(@Query() query: RecruitmentMetricsQuery) {
    return this.analytics.csv(query);
  }
  @Roles('ADMIN') @Get('administration') administration(@Query() query: MetricPeriodQuery) {
    return this.analytics.administration(query);
  }
}
