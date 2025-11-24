'use client';

import { SessionProvider } from 'next-auth/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/react-query';

/**
 * Client-side providers wrapper.
 * This component wraps the application with all necessary client-side context providers:
 * - SessionProvider: NextAuth.js session management
 * - QueryClientProvider: React Query for data fetching and caching
 */
export default function Providers({ children }) {
  return (
    <SessionProvider
      refetchInterval={0} // Disable automatic polling
      refetchOnWindowFocus={true} // Refresh when window regains focus
    >
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </SessionProvider>
  );
}