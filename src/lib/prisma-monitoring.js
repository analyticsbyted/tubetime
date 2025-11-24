/**
 * Prisma Client Extension to log slow database queries.
 * 
 * Prisma v6 uses Client Extensions instead of $use middleware.
 * This extension wraps all queries to monitor performance.
 * 
 * Usage: Apply via $extends when creating PrismaClient
 */
export const prismaMonitoringExtension = {
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const start = Date.now();
        const result = await query(args);
        const duration = Date.now() - start;

        // Log slow queries (> 500ms)
        if (duration > 500) {
          console.warn(`[Slow DB Query] ${model}.${operation} took ${duration}ms`);
        }

        return result;
      },
    },
  },
};
  