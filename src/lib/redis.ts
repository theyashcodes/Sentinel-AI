import { Redis } from '@upstash/redis';

/**
 * Upstash Redis Client
 *
 * HTTP-based Redis client for serverless environments.
 * Uses REST over HTTPS — no persistent TCP connection needed.
 */

function createRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[Redis] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set. Redis disabled.'
      );
    }
    return null;
  }

  return new Redis({ url, token });
}

export const redis = createRedisClient();
