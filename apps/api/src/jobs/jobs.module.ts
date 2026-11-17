import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { ManagementJobsController, PublicJobsController } from './jobs.controller';

@Module({ controllers: [PublicJobsController, ManagementJobsController], providers: [JobsService] })
export class JobsModule {}
