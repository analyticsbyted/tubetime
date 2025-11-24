# Observability Setup Guide

This document describes the observability infrastructure added in Phase 8 Day 1.

## Overview

TubeTime now includes comprehensive error tracking and performance monitoring using Sentry. This enables:
- Automatic error capture with full context
- Performance bottleneck identification
- Slow API request detection
- Slow database query detection
- Source map support for better debugging

## Configuration

### Environment Variables

Required:
- `NEXT_PUBLIC_SENTRY_DSN`: Your Sentry DSN (get from Sentry dashboard)

Optional (for source map uploads):
- `SENTRY_ORG`: Your Sentry organization slug
- `SENTRY_PROJECT`: Your Sentry project slug
- `SENTRY_AUTH_TOKEN`: Sentry auth token (create in Sentry settings)

### Configuration Files

**Next.js App Router Structure:**
- `instrumentation.js` - Server and Edge runtime initialization (calls `sentry.server.config.js` and `sentry.edge.config.js`)
- `instrumentation-client.ts` - Client-side initialization (replaces deprecated `sentry.client.config.js`)
- `sentry.server.config.js` - Server-side Sentry configuration
- `sentry.edge.config.js` - Edge runtime Sentry configuration
- `app/global-error.jsx` - Global error boundary with Sentry integration
- `next.config.js` - Wrapped with `withSentryConfig` for build-time integration

**Note:** The `instrumentation.js` file requires `experimental.instrumentationHook: true` in `next.config.js` (enabled by default in Next.js 16+).

### Sentry Account Setup

1. Sign up at [sentry.io](https://sentry.io)
2. Create a new Next.js project
3. Copy your DSN to `.env.local` as `NEXT_PUBLIC_SENTRY_DSN`
4. (Optional) Create auth token for source map uploads

## Monitoring Features

### API Route Monitoring

Wrap API routes with `withMonitoring` to automatically:
- Log slow requests (>1000ms)
- Capture errors with full context
- Track request duration

**Example:**
```javascript
import { withMonitoring } from '@/lib/api-monitoring';

export const GET = withMonitoring(async (request) => {
  // Your route handler
});
```

### Database Query Monitoring

Prisma queries are automatically monitored via Client Extensions (Prisma v6):
- Logs slow queries (>500ms)
- Includes model and operation information
- Helps identify database bottlenecks

**Integration:** Applied via `$extends` in `src/lib/prisma.js` using `prismaMonitoringExtension`

**Note:** Prisma v6 uses Client Extensions instead of the deprecated `$use` middleware.

## Testing

### Test Error Reporting

1. Create a test API route that throws an error
2. Trigger the route
3. Check Sentry dashboard for the error

### Test Performance Monitoring

1. Create a slow API route (add `await new Promise(resolve => setTimeout(resolve, 1500))`)
2. Trigger the route
3. Check console for slow request warning
4. Check Sentry for performance event

## Troubleshooting

### Sentry Not Capturing Errors

1. Verify `NEXT_PUBLIC_SENTRY_DSN` is set correctly
2. Check browser console for Sentry initialization errors
3. Verify Sentry project is active

### Source Maps Not Uploading

1. Verify `SENTRY_ORG`, `SENTRY_PROJECT`, and `SENTRY_AUTH_TOKEN` are set
2. Check build logs for Sentry upload errors
3. Verify `.sentryclirc` file exists (optional but recommended)

### High Sentry Usage

- Adjust `tracesSampleRate` in Sentry config files (currently 1.0 for dev, 0.1 for prod)
- Reduce `replaysSessionSampleRate` if session replay usage is high
- Filter out expected errors (e.g., 401 Unauthorized)

## File Structure

**Current Sentry Configuration Files:**
- `instrumentation.js` - Next.js instrumentation hook (loads server/edge configs)
- `instrumentation-client.ts` - Client-side initialization (replaces deprecated `sentry.client.config.js`)
- `sentry.server.config.js` - Server-side config (loaded by `instrumentation.js`)
- `sentry.edge.config.js` - Edge runtime config (loaded by `instrumentation.js`)
- `app/global-error.jsx` - Global error boundary with Sentry integration

**Note:** `sentry.client.config.js` has been removed and replaced by `instrumentation-client.ts` following Next.js 16 best practices.

## Revert Strategy

If Sentry causes issues, revert by:

1. Remove `withSentryConfig` wrapper from `next.config.js`
2. Remove `experimental.instrumentationHook: true` from `next.config.js`
3. Delete Sentry config files:
   - `instrumentation.js`
   - `instrumentation-client.ts`
   - `sentry.server.config.js`
   - `sentry.edge.config.js`
   - `app/global-error.jsx`
4. Remove `@sentry/nextjs` from `package.json`
5. Remove monitoring utility files if not needed:
   - `src/lib/api-monitoring.js`
   - `src/lib/prisma-monitoring.js`
6. Run `npm install`
7. Remove environment variables from `.env.local`

## Next Steps

- Day 2: Integrate React Query (will use observability to measure improvements)
- Monitor error rates and performance metrics
- Adjust sampling rates based on usage

