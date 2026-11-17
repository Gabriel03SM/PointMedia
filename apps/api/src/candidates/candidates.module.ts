import { Module } from '@nestjs/common';
import { CandidatesController } from './candidates.controller';
import { ProfilesService } from './profiles.service';
import { ResumesService } from './resumes.service';
import { LocalResumeStorage, ResumeStorage } from './resume-storage';

@Module({
  controllers: [CandidatesController],
  providers: [
    ProfilesService,
    ResumesService,
    { provide: ResumeStorage, useClass: LocalResumeStorage },
  ],
  exports: [ProfilesService, ResumesService],
})
export class CandidatesModule {}
