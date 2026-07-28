import { redis } from '@/lib/redis';

/**
 * Cache Key Convention:
 * sentinel:{module}:{entity}:{identifier}
 *
 * Examples:
 *   sentinel:scanner:result:sha256(input)
 *   sentinel:threat:trends:daily:2025-06-26
 *   sentinel:ratelimit:ip:192.168.1.1
 *   sentinel:flags:env:production
 */

const DEFAULT_TTL = 3600; // 1 hour in seconds

/**
 * Get a cached value by key, with type safety.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;

  try {
    const value = await redis.get<T>(key);
    return value;
  } catch (error) {
    console.error(`[Cache] Error getting key "${key}":`, error);
    return null;
  }
}

/**
 * Set a cached value with optional TTL (in seconds).
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number = DEFAULT_TTL
): Promise<void> {
  if (!redis) return;

  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (error) {
    console.error(`[Cache] Error setting key "${key}":`, error);
  }
}

/**
 * Invalidate (delete) a cached key.
 */
export async function cacheInvalidate(key: string): Promise<void> {
  if (!redis) return;

  try {
    await redis.del(key);
  } catch (error) {
    console.error(`[Cache] Error invalidating key "${key}":`, error);
  }
}

/**
 * Invalidate all keys matching a pattern.
 */
export async function cacheInvalidatePattern(pattern: string): Promise<void> {
  if (!redis) return;

  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await Promise.all(keys.map((key) => redis!.del(key)));
    }
  } catch (error) {
    console.error(`[Cache] Error invalidating pattern "${pattern}":`, error);
  }
}

/**
 * Execute a function with caching. Returns cached value if available,
 * otherwise executes the function and caches the result.
 */
export async function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  ttlSeconds: number = DEFAULT_TTL
): Promise<T> {
  // Try cache first
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;

  // Execute and cache
  const result = await fn();
  await cacheSet(key, result, ttlSeconds);
  return result;
}
