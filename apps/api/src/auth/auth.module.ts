import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { SecurityModule } from './security.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CandidatesModule } from '../candidates/candidates.module';
import { ApplicationsModule } from '../applications/applications.module';
import { TalentPoolModule } from '../talent-pool/talent-pool.module';
import { CandidateRegistrationService } from './candidate-registration.service';

@Module({
  imports: [SecurityModule, UsersModule, CandidatesModule, ApplicationsModule, TalentPoolModule],
  controllers: [AuthController],
  providers: [AuthService, CandidateRegistrationService],
})
export class AuthModule {}
