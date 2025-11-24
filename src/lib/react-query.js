import { QueryClient } from '@tanstack/react-query';

/**
 * QueryClient configuration for React Query
 * 
 * Default options optimized for TubeTime:
 * - 1 minute stale time (data is fresh for 1 minute)
 * - 5 minute garbage collection time (cache persists for 5 minutes)
 * - Automatic refetch on window focus and reconnect
 * - Single retry on failure
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 5, // 5 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

