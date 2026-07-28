import * as Sentry from '@sentry/nextjs';

/**
 * Monitoring Helpers
 *
 * Thin wrappers around Sentry for consistent error tracking.
 * Centralizing these calls makes it easy to swap providers later.
 */

/**
 * Capture an exception and send it to Sentry.
 */
export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (context) {
    Sentry.withScope((scope) => {
      scope.setExtras(context);
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

/**
 * Capture a message and send it to Sentry.
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, unknown>
): void {
  if (context) {
    Sentry.withScope((scope) => {
      scope.setExtras(context);
      Sentry.captureMessage(message, level);
    });
  } else {
    Sentry.captureMessage(message, level);
  }
}

/**
 * Set user context for Sentry.
 */
export function setUser(user: { id: string; email?: string; username?: string } | null): void {
  Sentry.setUser(user);
}
