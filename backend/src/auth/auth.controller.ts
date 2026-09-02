import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { Public } from './decorators/public.decorator.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterCandidateDto } from './dto/register-candidate.dto.js';
import type { AuthenticatedRequest } from './guards/jwt-auth.guard.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterCandidateDto) {
    return this.authService.registerCandidate(dto);
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  me(@Req() request: AuthenticatedRequest) {
    return request.user;
  }
}
