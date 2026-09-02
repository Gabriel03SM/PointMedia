import { Module } from '@nestjs/common';
import { CandidatesController } from './candidates.controller.js';
import { CandidatesService } from './candidates.service.js';
import { RankingModule } from '../ranking/ranking.module.js';

@Module({
  imports: [RankingModule],
  controllers: [CandidatesController],
  providers: [CandidatesService],
  exports: [CandidatesService],
})
export class CandidatesModule {}
