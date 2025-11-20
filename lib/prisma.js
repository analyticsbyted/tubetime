import { PrismaClient } from '../src/generated/prisma';

/**
 * Prisma Client Singleton
 * 
 * Prevents multiple instances of Prisma Client in development
 * (Next.js hot reload can create multiple instances)
 */
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

