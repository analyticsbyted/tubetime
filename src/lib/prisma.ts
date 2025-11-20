import { PrismaClient } from '@prisma/client';

// This is needed because Next.js hot-reloads modules in development
// creating new PrismaClient instances on every reload.
// This ensures there is only one instance globally.
const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Optional: log all database queries for debugging
    // log: ['query'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
