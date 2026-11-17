import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PasswordService } from './password.service';

@Module({
  imports: [JwtModule.register({})],
  providers: [PasswordService],
  exports: [PasswordService, JwtModule],
})
export class SecurityModule {}
