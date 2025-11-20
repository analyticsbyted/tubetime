'use client';

import { SessionProvider } from 'next-auth/react';

/**
 * Client-side providers wrapper.
 * This component wraps the application with all necessary client-side context providers.
 */
export default function Providers({ children }) {
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
}