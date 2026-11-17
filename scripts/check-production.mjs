import { access, lstat, realpath } from 'node:fs/promises';
import { constants } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

export async function checkProduction(env) {
  if (env.NODE_ENV !== 'production') throw new Error('Defina NODE_ENV=production explicitamente.');
  let environmentSchema;
  try {
    ({ environmentSchema } = require(resolve(root, 'apps/api/dist/config.js')));
  } catch {
    throw new Error('Compile a API antes de verificar a configuração de produção.');
  }
  const parsed = environmentSchema.safeParse(env);
  if (!parsed.success)
    throw new Error(
      `Configuração inválida: ${[...new Set(parsed.error.issues.map((issue) => issue.path.join('.')))].join(', ')}`,
    );
  for (const file of [
    'apps/api/dist/main.js',
    'apps/web/dist/index.html',
    'packages/shared/dist/index.js',
    'docs/openapi.json',
  ]) {
    try {
      await access(resolve(root, file), constants.R_OK);
    } catch {
      throw new Error(`Arquivo de release ausente: ${file}`);
    }
  }
  const storage = parsed.data.RESUME_STORAGE_DIR;
  let canonicalStorage;
  try {
    const info = await lstat(storage);
    if (!info.isDirectory() || info.isSymbolicLink()) throw new Error();
    await access(storage, constants.R_OK | constants.W_OK);
    canonicalStorage = await realpath(storage);
  } catch {
    throw new Error(
      'RESUME_STORAGE_DIR deve ser um diretório privado existente e acessível ao processo.',
    );
  }
  for (const publicDirectory of ['apps/web/public', 'apps/web/dist']) {
    const publicPath = resolve(root, publicDirectory);
    const canonicalPublic = await realpath(publicPath).catch(() => publicPath);
    const path = relative(canonicalPublic, canonicalStorage);
    if (!path || (!isAbsolute(path) && path !== '..' && !path.startsWith(`..${sep}`)))
      throw new Error('RESUME_STORAGE_DIR deve ficar fora dos diretórios públicos.');
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  checkProduction(process.env)
    .then(() => {
      console.log('Estrutura e configuração válidas para revisão de produção.');
      console.log(
        'A liberação depende da verificação de infraestrutura, TLS, backups e requisitos pendentes.',
      );
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
