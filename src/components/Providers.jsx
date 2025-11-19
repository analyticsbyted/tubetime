'use client';

/**
 * Client-side providers wrapper
 * Currently no providers needed as we've moved to URL-based state
 * and component-level state management
 * 
 * This component exists to maintain the pattern and allow
 * the root layout to remain a Server Component
 */
export default function Providers({ children }) {
  return <>{children}</>;
}

