import { Inject, Injectable } from '@nestjs/common';
import type { ReadStream } from 'node:fs';
import { mkdir, open, readdir, stat, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join, resolve } from 'node:path';
import { APP_CONFIG, type AppConfig } from '../config';

export abstract class ResumeStorage {
  abstract put(buffer: Buffer): Promise<string>;
  abstract open(key: string): Promise<ReadStream>;
  abstract remove(key: string): Promise<void>;
  abstract reconcile(liveKeys: ReadonlySet<string>): Promise<void>;
}
const validKey = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class LocalResumeStorage extends ResumeStorage {
  private readonly root: string;
  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    super();
    this.root =
      config.RESUME_STORAGE_DIR ??
      resolve(
        __dirname,
        '../../../../.local',
        config.NODE_ENV === 'test' ? 'test-resumes' : 'resumes',
      );
  }
  private path(key: string) {
    if (!validKey.test(key)) throw new Error('Chave de arquivo inválida.');
    return join(this.root, key);
  }
  async put(buffer: Buffer) {
    await mkdir(this.root, { recursive: true });
    const key = randomUUID();
    await writeFile(this.path(key), buffer, { flag: 'wx', mode: 0o600 });
    return key;
  }
  async open(key: string) {
    const handle = await open(this.path(key), 'r');
    try {
      if (!(await handle.stat()).isFile()) throw new Error('Arquivo inválido.');
      return handle.createReadStream({ autoClose: true });
    } catch (error) {
      await handle.close();
      throw error;
    }
  }
  async remove(key: string) {
    try {
      await unlink(this.path(key));
    } catch (error) {
      if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'))
        throw error;
    }
  }
  async reconcile(liveKeys: ReadonlySet<string>) {
    await mkdir(this.root, { recursive: true });
    const cutoff = Date.now() - 60 * 60 * 1000;
    for (const entry of await readdir(this.root, { withFileTypes: true })) {
      if (!entry.isFile() || !validKey.test(entry.name) || liveKeys.has(entry.name)) continue;
      // Uma hora de margem evita arquivos de uploads/transações ainda em andamento.
      if ((await stat(this.path(entry.name))).mtimeMs < cutoff) await this.remove(entry.name);
    }
  }
}
