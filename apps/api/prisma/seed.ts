import { config } from 'dotenv';
import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { PasswordService } from '../src/auth/password.service';

config({ path: resolve(__dirname, '../../../.env'), quiet: true });

async function seed() {
  const password = process.env.SEED_PASSWORD;
  if (process.env.NODE_ENV === 'production')
    throw new Error('Seed fictício não é permitido em produção.');
  if (!password || password.length < 12 || password.length > 128)
    throw new Error('Defina SEED_PASSWORD com 12–128 caracteres.');
  if (!process.env.DATABASE_URL) throw new Error('Defina DATABASE_URL.');
  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const passwordHash = await new PasswordService().hash(password);
    const accounts = [
      {
        email: 'admin@example.test',
        name: 'Admin Demonstração',
        role: 'ADMIN' as const,
        jobTitle: 'Administração',
      },
      {
        email: 'rh@example.test',
        name: 'RH Demonstração',
        role: 'RECRUITER' as const,
        jobTitle: 'Recrutamento e seleção',
      },
      {
        email: 'candidato@example.test',
        name: 'Candidato Demonstração',
        role: 'CANDIDATE' as const,
        jobTitle: null,
      },
    ];
    for (const account of accounts) {
      // Reexecução não altera senha, role ou dados de uma conta existente.
      await db.user.upsert({
        where: { email: account.email },
        update: {},
        create: { ...account, passwordHash },
      });
    }
    console.log('Seed local concluído: três contas fictícias (example.test).');
  } finally {
    await db.$disconnect();
  }
}
seed().catch(() => {
  console.error('Seed não concluído. Verifique ambiente, senha e banco.');
  process.exitCode = 1;
});
