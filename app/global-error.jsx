'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    // Log error to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-zinc-100 p-4">
          <h2 className="text-2xl font-bold mb-4 text-red-500">Something went wrong!</h2>
          <p className="text-zinc-400 mb-6 text-center max-w-md">
            An unexpected error occurred. The error has been logged and we'll look into it.
          </p>
          <button
            onClick={reset}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-zinc-100 rounded-lg transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

