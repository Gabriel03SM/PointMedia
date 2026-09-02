import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { JobsModule } from './jobs/jobs.module.js';
import { CandidatesModule } from './candidates/candidates.module.js';
import { ApplicationsModule } from './applications/applications.module.js';
import { RankingModule } from './ranking/ranking.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { TalentPoolModule } from './talent-pool/talent-pool.module.js';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AuthModule, JobsModule, CandidatesModule, ApplicationsModule, RankingModule, DashboardModule, TalentPoolModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
