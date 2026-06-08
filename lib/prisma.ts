import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

declare global { var prisma: PrismaClient | undefined; }

function makePrisma() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter });
}

export const prisma = global.prisma ?? makePrisma();
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;
