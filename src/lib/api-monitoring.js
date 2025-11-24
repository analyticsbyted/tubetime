import * as Sentry from '@sentry/nextjs';

/**
 * Higher-order function to wrap API route handlers with Sentry monitoring and slow request logging.
 * @param {Function} handler - The API route handler function
 * @returns {Function} Wrapped handler
 */
export function withMonitoring(handler) {
  return async (request, context) => {
    const start = Date.now();
    try {
      // Execute the handler
      const response = await handler(request, context);
      
      // Calculate duration
      const duration = Date.now() - start;
      
      // Log slow requests (> 1000ms)
      if (duration > 1000) {
        console.warn(`[Slow Request] ${request.method} ${request.url} took ${duration}ms`);
        
        // Optional: Send strict performance event to Sentry
        Sentry.withScope((scope) => {
          scope.setTag("performance_issue", "slow_api");
          scope.setExtra("duration", duration);
          scope.setExtra("url", request.url);
          Sentry.captureMessage(`Slow API Request: ${request.url}`);
        });
      }
      
      return response;
    } catch (error) {
      // Capture unexpected errors
      console.error(`[API Error] ${request.method} ${request.url}:`, error);
      
      Sentry.captureException(error, {
        tags: { type: 'api-route' },
        extra: { 
          url: request.url,
          method: request.method
        },
      });
      
      // Re-throw to let Next.js handle the 500 response or handle it here
      throw error;
    }
  };
}
