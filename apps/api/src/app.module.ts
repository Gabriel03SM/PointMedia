import { DynamicModule, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import type { AppConfig } from './config';
import { DatabaseModule } from './database/database.module';
import { SessionGuard, RolesGuard } from './auth/access';
import { AuthModule } from './auth/auth.module';
import { SecurityModule } from './auth/security.module';
import { UsersModule } from './users/users.module';
import { HealthController } from './common/health.controller';
import { JobsModule } from './jobs/jobs.module';
import { CandidatesModule } from './candidates/candidates.module';
import { ApplicationsModule } from './applications/applications.module';
import { TalentPoolModule } from './talent-pool/talent-pool.module';
import { ScreeningModule } from './screening/screening.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { IntelligenceModule } from './intelligence/intelligence.module';

@Module({})
export class AppModule {
  static register(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [
        DatabaseModule.register(config),
        SecurityModule,
        AuthModule,
        UsersModule,
        JobsModule,
        CandidatesModule,
        TalentPoolModule,
        ApplicationsModule,
        ScreeningModule,
        AnalyticsModule,
        IntelligenceModule,
      ],
      controllers: [HealthController],
      providers: [
        { provide: APP_GUARD, useClass: SessionGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    };
  }
}
