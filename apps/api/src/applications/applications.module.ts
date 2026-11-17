import { Module } from '@nestjs/common';
import { CandidatesModule } from '../candidates/candidates.module';
import { TalentPoolModule } from '../talent-pool/talent-pool.module';
import {
  ApplicationsController,
  ManagementApplicationsController,
} from './applications.controller';
import { ApplicationsService } from './applications.service';
import { ApplicationProcessService } from './application-process.service';

@Module({
  imports: [CandidatesModule, TalentPoolModule],
  controllers: [ApplicationsController, ManagementApplicationsController],
  providers: [ApplicationsService, ApplicationProcessService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
