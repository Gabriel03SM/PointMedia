import { Module } from '@nestjs/common';
import { CandidatesModule } from '../candidates/candidates.module';
import { TalentPoolController } from './talent-pool.controller';
import { TalentPoolService } from './talent-pool.service';

@Module({
  imports: [CandidatesModule],
  controllers: [TalentPoolController],
  providers: [TalentPoolService],
  exports: [TalentPoolService],
})
export class TalentPoolModule {}
