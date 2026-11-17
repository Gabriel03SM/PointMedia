import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PasswordService } from '../auth/password.service';
import { Prisma } from '../generated/prisma/client';
import type { RegisterDto } from '../auth/dto';
import type { CreateRecruiterDto, UpdateAccountDto } from './dto';
import { publicUser } from './public-user';

export function rethrowUnique(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
    throw new ConflictException('Já existe uma conta com este e-mail.');
  throw error;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly db: PrismaService,
    private readonly passwords: PasswordService,
  ) {}
  async register(dto: RegisterDto, tx: Prisma.TransactionClient, passwordHash: string) {
    return this.persist(tx, dto, passwordHash, 'CANDIDATE');
  }
  async createRecruiter(dto: CreateRecruiterDto, actorId: string) {
    return this.create(dto, 'RECRUITER', actorId, dto.jobTitle);
  }
  private async create(
    dto: RegisterDto,
    role: 'CANDIDATE' | 'RECRUITER',
    actorId?: string,
    jobTitle?: string,
  ) {
    const passwordHash = await this.passwords.hash(dto.password);
    try {
      return await this.db.$transaction((tx) =>
        this.persist(tx, dto, passwordHash, role, actorId, jobTitle),
      );
    } catch (error) {
      rethrowUnique(error);
    }
  }
  private async persist(
    tx: Prisma.TransactionClient,
    dto: RegisterDto,
    passwordHash: string,
    role: 'CANDIDATE' | 'RECRUITER',
    actorId?: string,
    jobTitle?: string,
  ) {
    const user = await tx.user.create({
      data: { name: dto.name, email: dto.email, passwordHash, role, jobTitle },
    });
    await tx.auditLog.create({
      data: {
        actorId: actorId ?? user.id,
        action: role === 'CANDIDATE' ? 'ACCOUNT_REGISTERED' : 'RECRUITER_CREATED',
        entityId: user.id,
      },
    });
    return publicUser(user);
  }
  async updateOwn(id: string, dto: UpdateAccountDto) {
    try {
      return await this.db.$transaction(async (tx) => {
        const user = await tx.user.update({
          where: { id },
          data: { name: dto.name, email: dto.email, phone: dto.phone === '' ? null : dto.phone },
        });
        await tx.auditLog.create({
          data: { actorId: id, action: 'ACCOUNT_UPDATED', entityId: id },
        });
        return publicUser(user);
      });
    } catch (error) {
      rethrowUnique(error);
    }
  }
}
