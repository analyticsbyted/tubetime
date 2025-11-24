import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Replay may only be needed for the client
  integrations: [
    Sentry.replayIntegration(),
  ],
  // Adjust sample rate based on environment
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0.1,
  // If the entire session is not recorded, use the session replay
  // when an error occurs.
  replaysOnErrorSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});

// Instrument router transitions for navigation tracking
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

