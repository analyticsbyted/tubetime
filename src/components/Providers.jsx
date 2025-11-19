'use client';

import { AppProvider } from '../context/AppContext';

/**
 * Client-side providers wrapper
 * This component isolates all client-side providers to allow
 * the root layout to remain a Server Component
 */
export default function Providers({ children }) {
  return <AppProvider>{children}</AppProvider>;
}

