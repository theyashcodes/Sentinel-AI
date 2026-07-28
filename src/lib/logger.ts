import pino from 'pino';

/**
 * Structured Logger (Pino)
 *
 * - JSON output in production (parseable by Vercel, Axiom, Betterstack)
 * - Pretty-printed in development (via pino-pretty)
 * - Automatic redaction of sensitive fields
 * - Child loggers for per-module context
 */

const isProduction = process.env.NODE_ENV === 'production';
const logLevel = process.env.LOG_LEVEL ?? (isProduction ? 'info' : 'debug');

export const logger = pino({
  level: logLevel,

  // Redact sensitive fields from logs
  redact: {
    paths: [
      'password',
      'token',
      'authorization',
      'cookie',
      'ssn',
      'apiKey',
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    censor: '[REDACTED]',
  },

  // Timestamp format
  timestamp: pino.stdTimeFunctions.isoTime,

  // Pretty print in development
  transport: isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss.l',
          ignore: 'pid,hostname',
        },
      },
});

/**
 * Create a child logger with module context.
 *
 * @example
 * const log = createLogger('scanner');
 * log.info({ scanId: '123' }, 'Scan started');
 */
export function createLogger(module: string) {
  return logger.child({ module });
}
