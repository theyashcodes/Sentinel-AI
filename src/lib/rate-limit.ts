import { Ratelimit } from '@upstash/ratelimit';
import { redis } from '@/lib/redis';

/**
 * Rate Limiter Factory
 *
 * Uses Upstash Ratelimit with sliding window algorithm.
 * Falls back to a no-op when Redis is not configured.
 */

type RateLimitConfig = {
  /** Maximum number of requests in the window */
  requests: number;
  /** Window duration string (e.g., '1 m', '1 h', '10 s') */
  window: `${number} ${'ms' | 's' | 'm' | 'h' | 'd'}`;
};

/**
 * Create a rate limiter instance.
 *
 * @example
 * const apiLimiter = createRateLimit({ requests: 60, window: '1 m' });
 * const result = await apiLimiter.limit(ip);
 * if (!result.success) return new Response('Too Many Requests', { status: 429 });
 */
export function createRateLimit(config: RateLimitConfig) {
  if (!redis) {
    // Return a no-op limiter when Redis is not configured
    return {
      limit: async (_identifier: string) => ({
        success: true,
        limit: config.requests,
        remaining: config.requests,
        reset: Date.now() + 60000,
      }),
    };
  }

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.requests, config.window),
    analytics: true,
    prefix: 'sentinel:ratelimit',
  });
}

// ──── Pre-configured rate limiters ──────────────────────────

/** API route rate limiter: 60 requests per minute */
export const apiRateLimit = createRateLimit({ requests: 60, window: '1 m' });

/** Auth route rate limiter: 10 requests per minute */
export const authRateLimit = createRateLimit({ requests: 10, window: '1 m' });

/** Scan route rate limiter: 20 requests per minute */
export const scanRateLimit = createRateLimit({ requests: 20, window: '1 m' });
