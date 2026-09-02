import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterCandidateDto } from './dto/register-candidate.dto.js';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async registerCandidate(dto: RegisterCandidateDto) {
    const email = dto.email.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    const existingCandidate = await this.prisma.candidate.findUnique({ where: { email } });

    if (existingUser || existingCandidate?.userId) {
      throw new ConflictException('Já existe um cadastro com este e-mail.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        role: UserRole.CANDIDATE,
        candidate: existingCandidate
          ? { connect: { id: existingCandidate.id } }
          : { create: { fullName: dto.fullName.trim(), email } },
      },
      include: { candidate: true },
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { candidate: true },
    });

    if (!user || !user.isActive || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    return this.buildAuthResponse(user);
  }

  private buildAuthResponse(user: {
    id: string;
    email: string;
    role: UserRole;
    candidate: { id: string; fullName: string } | null;
  }) {
    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        candidate: user.candidate,
      },
    };
  }
}
