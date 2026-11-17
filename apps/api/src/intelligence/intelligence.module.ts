import { Controller, Get, Module } from '@nestjs/common';
import { Roles } from '../auth/access';
import {
  DisabledIntelligenceProvider,
  IntelligenceProvider,
  IntelligenceService,
} from './intelligence.service';

@Roles('RECRUITER', 'ADMIN')
@Controller('intelligence')
export class IntelligenceController {
  constructor(private readonly intelligence: IntelligenceService) {}
  @Get('status') status() {
    return this.intelligence.status();
  }
}

@Module({
  providers: [
    { provide: IntelligenceProvider, useClass: DisabledIntelligenceProvider },
    IntelligenceService,
  ],
  controllers: [IntelligenceController],
  exports: [IntelligenceService],
})
export class IntelligenceModule {}
