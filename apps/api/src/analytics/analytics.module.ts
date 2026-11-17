import { Module } from '@nestjs/common';
import { ScreeningModule } from '../screening/screening.module';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
@Module({
  imports: [ScreeningModule],
  providers: [AnalyticsService],
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}
