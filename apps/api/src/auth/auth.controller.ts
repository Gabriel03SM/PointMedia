import {
  Body,
  Controller,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response, CookieOptions } from 'express';
import { APP_CONFIG, type AppConfig } from '../config';
import type { AuthRequest } from '../common/http';
import { Public, SESSION_COOKIE } from './access';
import { ChangePasswordDto, LoginDto } from './dto';
import { AuthService } from './auth.service';
import { RegistrationBodyDto } from './registration.dto';
import { CandidateRegistrationService } from './candidate-registration.service';
import { MAX_RESUME_SIZE, type UploadedResume } from '../candidates/resume-validation';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly registration: CandidateRegistrationService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}
  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    };
  }
  @Public()
  @Post('register')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_RESUME_SIZE, files: 1, fields: 1, fieldSize: 128 * 1024, parts: 3 },
    }),
  )
  register(@Body() dto: RegistrationBodyDto, @UploadedFile() file?: UploadedResume) {
    return this.registration.submit(dto.data, file);
  }
  @Public()
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(dto);
    res.cookie(SESSION_COOKIE, result.token, {
      ...this.cookieOptions(),
      maxAge: this.config.JWT_TTL_SECONDS * 1000,
    });
    return result.user;
  }
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: AuthRequest, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.sessionId, req.currentUser.id);
    res.clearCookie(SESSION_COOKIE, this.cookieOptions());
  }
  @Post('change-password')
  @HttpCode(204)
  async changePassword(
    @Req() req: AuthRequest,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.changePassword(req.currentUser.id, dto);
    res.clearCookie(SESSION_COOKIE, this.cookieOptions());
  }
}
