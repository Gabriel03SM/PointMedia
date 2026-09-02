import { Module } from '@nestjs/common';
import { CandidatesModule } from '../candidates/candidates.module.js';
import { ApplicationsController } from './applications.controller.js';
import { ApplicationsService } from './applications.service.js';
import { RankingModule } from '../ranking/ranking.module.js';

@Module({
  imports: [CandidatesModule, RankingModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
})
export class ApplicationsModule {}
