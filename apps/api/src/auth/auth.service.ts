import {
  Inject,
  Injectable,
  OnModuleInit,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'node:crypto';
import { APP_CONFIG, type AppConfig } from '../config';
import { PrismaService } from '../database/prisma.service';
import { PasswordService } from './password.service';
import type { ChangePasswordDto, LoginDto } from './dto';
import { publicUser } from '../users/public-user';

@Injectable()
export class AuthService implements OnModuleInit {
  private dummyHash!: string;
  constructor(
    private readonly db: PrismaService,
    private readonly passwords: PasswordService,
    private readonly jwt: JwtService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}
  async onModuleInit() {
    this.dummyHash = await this.passwords.hash(randomBytes(32).toString('hex'));
  }
  async login(dto: LoginDto) {
    const existing = await this.db.user.findUnique({ where: { email: dto.email } });
    const valid = await this.passwords.verify(
      existing?.passwordHash ?? this.dummyHash,
      dto.password,
    );
    if (!existing || !valid || !existing.active)
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    return this.db.$transaction(async (tx) => {
      // Serializa emissão/revogação para não abrir uma sessão usando senha antiga em corrida.
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${existing.id}::uuid FOR UPDATE`;
      const user = await tx.user.findUniqueOrThrow({ where: { id: existing.id } });
      if (!user.active || user.passwordHash !== existing.passwordHash)
        throw new UnauthorizedException('E-mail ou senha inválidos.');
      const session = await tx.authSession.create({
        data: {
          userId: user.id,
          expiresAt: new Date(Date.now() + this.config.JWT_TTL_SECONDS * 1000),
        },
      });
      const token = await this.jwt.signAsync(
        { sub: user.id, sid: session.id },
        {
          secret: this.config.JWT_SECRET,
          expiresIn: this.config.JWT_TTL_SECONDS,
          algorithm: 'HS256',
          issuer: 'pointmedia-api',
          audience: 'pointmedia-web',
        },
      );
      await tx.auditLog.create({
        data: { actorId: user.id, action: 'LOGIN', entityId: session.id },
      });
      return { token, user: publicUser(user) };
    });
  }
  async logout(sessionId: string, userId: string) {
    await this.db.$transaction(async (tx) => {
      await tx.authSession.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
      await tx.auditLog.create({
        data: { actorId: userId, action: 'LOGOUT', entityId: sessionId },
      });
    });
  }
  async changePassword(userId: string, dto: ChangePasswordDto) {
    if (dto.currentPassword === dto.newPassword)
      throw new BadRequestException('Escolha uma senha diferente da atual.');
    const existing = await this.db.user.findUniqueOrThrow({ where: { id: userId } });
    if (!(await this.passwords.verify(existing.passwordHash, dto.currentPassword)))
      throw new UnauthorizedException('Senha atual inválida.');
    const passwordHash = await this.passwords.hash(dto.newPassword);
    await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId}::uuid FOR UPDATE`;
      const current = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      if (current.passwordHash !== existing.passwordHash)
        throw new UnauthorizedException('A senha foi alterada. Faça login novamente.');
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash, passwordChangedAt: new Date() },
      });
      await tx.authSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.auditLog.create({
        data: { actorId: userId, action: 'PASSWORD_CHANGED', entityId: userId },
      });
    });
  }
}
