import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  StreamableFile,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { ReadStream } from 'node:fs';
import type { ResumeInfo } from '@pointmedia/shared';
import type { ResumeFile, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import { ResumeStorage } from './resume-storage';
import { validateResume, type UploadedResume } from './resume-validation';
import { recruitmentAccess, type RecruitmentScope } from './recruitment-access';

export function resumeInfo(file: ResumeFile): ResumeInfo {
  return {
    id: file.id,
    originalName: file.originalName,
    mimeType: file.mimeType,
    size: file.size,
    createdAt: file.createdAt.toISOString(),
  };
}

@Injectable()
export class ResumesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ResumesService.name);
  private cleanupTimer?: ReturnType<typeof setInterval>;
  constructor(
    private readonly db: PrismaService,
    private readonly storage: ResumeStorage,
  ) {}
  onModuleInit() {
    void this.reconcile();
    this.cleanupTimer = setInterval(() => void this.reconcile(), 60 * 60 * 1000);
    this.cleanupTimer.unref();
  }
  onModuleDestroy() {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
  }
  private async reconcile() {
    try {
      const live = await this.db.resumeFile.findMany({ select: { storageKey: true } });
      await this.storage.reconcile(new Set(live.map((item) => item.storageKey)));
    } catch {
      this.logger.warn('Limpeza de arquivos pendente; será repetida.');
    }
  }
  async removeStored(key: string) {
    try {
      await this.storage.remove(key);
    } catch {
      this.logger.warn('Remoção de arquivo pendente; a reconciliação repetirá a limpeza.');
    }
  }
  async prepareUpload(file: UploadedResume | undefined) {
    const info = validateResume(file);
    return {
      ...info,
      storageKey: await this.storage.put(file!.buffer),
      sha256: createHash('sha256').update(file!.buffer).digest('hex'),
      createdAt: new Date(),
    };
  }
  async attachUpload(
    tx: Prisma.TransactionClient,
    userId: string,
    data: Awaited<ReturnType<ResumesService['prepareUpload']>>,
  ) {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId}::uuid FOR UPDATE`;
    if (!(await tx.candidateProfile.findUnique({ where: { userId }, select: { userId: true } })))
      throw new NotFoundException('Salve seu perfil profissional antes de anexar o currículo.');
    const previous = await tx.resumeFile.findUnique({ where: { userId } });
    const current = await tx.resumeFile.upsert({
      where: { userId },
      create: { ...data, userId },
      update: data,
    });
    await tx.auditLog.create({
      data: { actorId: userId, action: 'RESUME_UPLOADED', entityId: current.id },
    });
    return { current, previous: previous?.storageKey };
  }
  async upload(userId: string, file: UploadedResume | undefined) {
    const data = await this.prepareUpload(file);
    let result: { current: ResumeFile; previous: string | undefined };
    try {
      result = await this.db.$transaction((tx) => this.attachUpload(tx, userId, data));
    } catch (error) {
      await this.removeStored(data.storageKey);
      throw error;
    }
    if (result.previous) await this.removeStored(result.previous);
    return resumeInfo(result.current);
  }
  async download(userId: string, actorId = userId, staff: boolean | RecruitmentScope = false) {
    const row = await this.db.resumeFile.findFirst({
      where: {
        userId,
        ...(staff
          ? { user: { candidateProfile: recruitmentAccess(staff === true ? 'shared' : staff) } }
          : {}),
      },
    });
    if (!row) throw new NotFoundException('Currículo não disponível.');
    let stream: ReadStream;
    try {
      stream = await this.storage.open(row.storageKey);
    } catch {
      throw new NotFoundException('Currículo não disponível.');
    }
    try {
      await this.db.auditLog.create({
        data: { actorId, action: 'RESUME_DOWNLOAD_STARTED', entityId: row.id },
      });
    } catch (failure) {
      stream.destroy();
      throw failure;
    }
    return new StreamableFile(stream, {
      type: row.mimeType,
      length: row.size,
      disposition: `attachment; filename="curriculo${row.mimeType === 'application/pdf' ? '.pdf' : '.docx'}"; filename*=UTF-8''${encodeURIComponent(row.originalName)}`,
    }).setErrorHandler((_error, response) => {
      if (response.destroyed) return;
      if (response.headersSent) {
        response.destroy?.();
        return;
      }
      response.statusCode = 500;
      response.send('Não foi possível ler o currículo.');
    });
  }
  async remove(userId: string) {
    const key = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId}::uuid FOR UPDATE`;
      const row = await tx.resumeFile.findUnique({ where: { userId } });
      if (!row) throw new NotFoundException('Currículo não encontrado.');
      await tx.resumeFile.delete({ where: { userId } });
      await tx.auditLog.create({
        data: { actorId: userId, action: 'RESUME_REMOVED', entityId: row.id },
      });
      return row.storageKey;
    });
    await this.removeStored(key);
  }
}
