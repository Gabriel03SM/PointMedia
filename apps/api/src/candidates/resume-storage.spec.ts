import { mkdir, mkdtemp, rmdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { environmentSchema } from '../config';
import { LocalResumeStorage } from './resume-storage';

it('preserva os arquivos em diretório configurado e rejeita acesso fora das chaves internas', async () => {
  await mkdir(resolve(__dirname, '../../../../.tmp'), { recursive: true });
  const directory = await mkdtemp(join(resolve(__dirname, '../../../../.tmp'), 'phase8-storage-'));
  const config = environmentSchema.parse({
    WEB_ORIGIN: 'http://localhost:5173',
    DATABASE_URL: 'postgresql://test:password@localhost/pointmedia_test',
    JWT_SECRET: 'a'.repeat(64),
    RESUME_STORAGE_DIR: directory,
  });
  const first = new LocalResumeStorage(config);
  let key: string | undefined;
  try {
    key = await first.put(Buffer.from('currículo fictício'));
    const reopened = new LocalResumeStorage(config);
    const stream = await reopened.open(key);
    const pieces: Buffer[] = [];
    for await (const piece of stream) pieces.push(Buffer.from(piece as Buffer));
    expect(Buffer.concat(pieces).toString()).toBe('currículo fictício');
    for (const invalid of ['../arquivo', '/arquivo', '..\\arquivo'])
      await expect(reopened.open(invalid)).rejects.toThrow('Chave de arquivo inválida.');
  } finally {
    if (key) await first.remove(key);
    await rmdir(directory);
  }
});
