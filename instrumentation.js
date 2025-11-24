import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side initialization
    await import('./sentry.server.config.js');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime initialization
    await import('./sentry.edge.config.js');
  }
}

// Instrument request errors from nested React Server Components
export const onRequestError = Sentry.captureRequestError;

