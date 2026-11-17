import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Role } from '@pointmedia/shared';
import { APP_CONFIG, type AppConfig } from '../config';
import { PrismaService } from '../database/prisma.service';
import type { AuthRequest } from '../common/http';
import { publicUser } from '../users/public-user';

const PUBLIC = 'public';
const ROLES = 'roles';
export const Public = () => SetMetadata(PUBLIC, true);
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);
export const SESSION_COOKIE = 'pm_session';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly db: PrismaService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>(PUBLIC, [context.getHandler(), context.getClass()])
    )
      return true;
    const req = context.switchToHttp().getRequest<AuthRequest>();
    const cookies = req.cookies as Record<string, unknown> | undefined;
    const token = cookies?.[SESSION_COOKIE];
    if (typeof token !== 'string') throw new UnauthorizedException('Faça login para continuar.');
    let claims: { sub?: unknown; sid?: unknown };
    try {
      claims = await this.jwt.verifyAsync(token, {
        secret: this.config.JWT_SECRET,
        algorithms: ['HS256'],
        issuer: 'pointmedia-api',
        audience: 'pointmedia-web',
      });
    } catch {
      throw new UnauthorizedException('Sessão inválida ou expirada.');
    }
    if (
      typeof claims.sid !== 'string' ||
      typeof claims.sub !== 'string' ||
      !/^[0-9a-f-]{36}$/i.test(claims.sid)
    )
      throw new UnauthorizedException('Sessão inválida.');
    const session = await this.db.authSession.findUnique({
      where: { id: claims.sid },
      include: { user: true },
    });
    if (
      !session ||
      session.userId !== claims.sub ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      !session.user.active
    )
      throw new UnauthorizedException('Sessão inválida ou expirada.');
    req.currentUser = publicUser(session.user);
    req.sessionId = session.id;
    return true;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext) {
    const allowed = this.reflector.getAllAndOverride<Role[]>(ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!allowed) return true;
    const req = context.switchToHttp().getRequest<AuthRequest>();
    if (!req.currentUser || !allowed.includes(req.currentUser.role))
      throw new ForbiddenException('Você não tem permissão para esta operação.');
    return true;
  }
}
