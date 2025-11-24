import { PrismaClient } from '@prisma/client';
import { prismaMonitoringExtension } from './prisma-monitoring';

// Ensure a single PrismaClient instance across hot reloads in development
const globalForPrisma = globalThis;

const prismaInstance =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Uncomment for verbose query logging in development
    // log: ['query'],
  }).$extends(prismaMonitoringExtension);

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prismaInstance;
}

export const prisma = prismaInstance;
