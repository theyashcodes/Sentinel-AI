'use client';

import { useEffect } from 'react';
import { captureException } from '@/lib/monitoring';

/**
 * Global Error Boundary
 *
 * Catches unhandled errors and reports them to Sentry.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="animate-fade-in-up text-center">
        <div
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full"
          style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
        >
          <svg
            className="h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            style={{ color: 'var(--destructive)' }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>

        <h2 className="mb-2 text-xl font-semibold" style={{ color: 'var(--foreground)' }}>
          Something went wrong
        </h2>

        <p className="mx-auto mb-6 max-w-md text-sm" style={{ color: 'var(--muted-foreground)' }}>
          An unexpected error occurred. Our team has been notified.
        </p>

        <button
          onClick={reset}
          className="bg-gradient-accent inline-flex items-center rounded-lg px-6 py-3 text-sm font-medium text-white transition-all hover:opacity-90"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
