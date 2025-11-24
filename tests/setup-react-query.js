import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

/**
 * Creates a QueryClient with test-friendly defaults
 * - No retries (faster tests)
 * - No automatic refetching
 * - Short cache times
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0, // Immediately garbage collect
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Wrapper component for React Query in tests
 */
export function createWrapper() {
  const queryClient = createTestQueryClient();
  
  return function Wrapper({ children }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

/**
 * Helper to create a fresh QueryClient for each test
 * Useful when you need to test cache invalidation
 */
export function createWrapperWithClient(queryClient) {
  return function Wrapper({ children }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

