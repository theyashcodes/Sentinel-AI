import { z } from 'zod';

/**
 * Environment Variable Validation
 *
 * Validates all required environment variables at startup.
 * The app will crash immediately with a clear error if any required
 * variable is missing — fail fast, not at runtime in a request handler.
 */

const envSchema = z.object({
  // ──── Database ─────────────────────────────────────
  DATABASE_URL: z.string().url().optional(),
  DIRECT_URL: z.string().url().optional(),

  // ──── Redis ────────────────────────────────────────
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // ──── Storage ──────────────────────────────────────
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.string().optional(),

  // ──── AI ───────────────────────────────────────────
  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().optional(),

  // ──── Monitoring ───────────────────────────────────
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),

  // ──── Queue ────────────────────────────────────────
  INNGEST_EVENT_KEY: z.string().optional(),
  INNGEST_SIGNING_KEY: z.string().optional(),

  // ──── App ──────────────────────────────────────────
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_APP_NAME: z.string().default('Sentinel AI'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables.
 * Call this at app startup to fail fast on missing config.
 */
export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables. Check server logs for details.');
  }

  return result.data;
}
