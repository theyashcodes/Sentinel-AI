import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/redis";
import { RateLimitError } from "@/lib/errors";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export type RateLimitWindowUnit = "ms" | "s" | "m" | "h" | "d";

export interface RateLimitConfig {
  /** Maximum number of requests allowed within window */
  requests: number;
  /** Window duration string (e.g., '1 m', '10 s', '1 h') */
  window: `${number} ${RateLimitWindowUnit}`;
  /** Optional namespace prefix for isolation */
  prefix?: string;
}

/**
 * Parse human window string (e.g. '1 m', '30 s') to milliseconds
 */
function parseWindowToMs(windowStr: `${number} ${RateLimitWindowUnit}`): number {
  const [numStr, unit] = windowStr.split(" ") as [string, RateLimitWindowUnit];
  const num = parseInt(numStr, 10);
  switch (unit) {
    case "ms":
      return num;
    case "s":
      return num * 1000;
    case "m":
      return num * 60 * 1000;
    case "h":
      return num * 60 * 60 * 1000;
    case "d":
      return num * 24 * 60 * 60 * 1000;
    default:
      return 60 * 1000;
  }
}

/**
 * In-Memory Sliding Window Rate Limiter
 * Ensures rate limiting is 100% active and dependable even without Upstash Redis configured.
 */
class InMemorySlidingWindowLimiter {
  private cache = new Map<string, number[]>();
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private lastPrune = Date.now();

  constructor(requests: number, windowStr: `${number} ${RateLimitWindowUnit}`) {
    this.maxRequests = requests;
    this.windowMs = parseWindowToMs(windowStr);
  }

  public async limit(identifier: string): Promise<RateLimitResult> {
    const now = Date.now();

    // Periodic prune of inactive keys (every 2 minutes)
    if (now - this.lastPrune > 120_000) {
      this.prune(now);
      this.lastPrune = now;
    }

    const windowStart = now - this.windowMs;
    const timestamps = (this.cache.get(identifier) || []).filter((t) => t > windowStart);

    if (timestamps.length >= this.maxRequests) {
      const oldestInWindow = timestamps[0] ?? now;
      const reset = oldestInWindow + this.windowMs;
      return {
        success: false,
        limit: this.maxRequests,
        remaining: 0,
        reset,
      };
    }

    timestamps.push(now);
    this.cache.set(identifier, timestamps);

    return {
      success: true,
      limit: this.maxRequests,
      remaining: Math.max(0, this.maxRequests - timestamps.length),
      reset: now + this.windowMs,
    };
  }

  private prune(now: number) {
    const expiredCutoff = now - this.windowMs;
    for (const [key, timestamps] of this.cache.entries()) {
      const active = timestamps.filter((t) => t > expiredCutoff);
      if (active.length === 0) {
        this.cache.delete(key);
      } else {
        this.cache.set(key, active);
      }
    }
  }
}

export interface RateLimiterInstance {
  limit: (identifier: string) => Promise<RateLimitResult>;
}

/**
 * Create a rate limiter instance.
 * Prefers Upstash Redis (for multi-region distributed serverless),
 * automatically falling back to an In-Memory Sliding Window.
 */
export function createRateLimit(config: RateLimitConfig): RateLimiterInstance {
  const fallbackLimiter = new InMemorySlidingWindowLimiter(config.requests, config.window);

  if (!redis) {
    return fallbackLimiter;
  }

  try {
    const upstashLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(config.requests, config.window),
      analytics: true,
      prefix: config.prefix || "sentinel:ratelimit",
    });

    return {
      limit: async (identifier: string): Promise<RateLimitResult> => {
        try {
          const res = await upstashLimiter.limit(identifier);
          return {
            success: res.success,
            limit: res.limit,
            remaining: res.remaining,
            reset: res.reset,
          };
        } catch (redisError) {
          console.warn("[RateLimit] Redis call failed, engaging in-memory fallback:", redisError);
          return fallbackLimiter.limit(identifier);
        }
      },
    };
  } catch (err) {
    console.warn("[RateLimit] Failed to initialize Upstash Ratelimit, using in-memory:", err);
    return fallbackLimiter;
  }
}

/**
 * Safely extracts client IP from Request headers
 */
export function getClientIp(req: Request | NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const firstIp = forwarded.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();

  return "127.0.0.1";
}

/**
 * Asserts rate limit for a request.
 * If exceeded, immediately throws a RateLimitError (which handleApiError catches and returns 429).
 */
export async function assertRateLimit(
  req: Request | NextRequest,
  limiter: RateLimiterInstance = apiRateLimit,
  customIdentifier?: string
): Promise<RateLimitResult> {
  const ip = getClientIp(req);
  const identifier = customIdentifier ? `${customIdentifier}:${ip}` : ip;
  const result = await limiter.limit(identifier);

  if (!result.success) {
    const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
    throw new RateLimitError(
      `Velocity limit exceeded (${result.limit} requests per window). Please retry in ${retryAfter}s.`,
      retryAfter
    );
  }

  return result;
}

/**
 * Attach standard X-RateLimit headers to a NextResponse
 */
export function applyRateLimitHeaders(response: NextResponse, result: RateLimitResult): NextResponse {
  response.headers.set("X-RateLimit-Limit", result.limit.toString());
  response.headers.set("X-RateLimit-Remaining", result.remaining.toString());
  response.headers.set("X-RateLimit-Reset", result.reset.toString());
  return response;
}

// ──── Pre-configured Production Limiters ──────────────────────────

/** General API rate limiter: 60 requests per minute */
export const apiRateLimit = createRateLimit({ requests: 60, window: "1 m", prefix: "sentinel:api" });

/** Scan route rate limiter: 25 requests per minute */
export const scanRateLimit = createRateLimit({ requests: 25, window: "1 m", prefix: "sentinel:scan" });

/** Media & Voice Forensics heavy compute: 10 requests per minute */
export const forensicsRateLimit = createRateLimit({ requests: 10, window: "1 m", prefix: "sentinel:forensics" });

/** Authentication, OTP, & Password Reset: 5 requests per minute */
export const authRateLimit = createRateLimit({ requests: 5, window: "1 m", prefix: "sentinel:auth" });

/** CyBro Agent Orchestration: 15 requests per minute */
export const cybroRateLimit = createRateLimit({ requests: 15, window: "1 m", prefix: "sentinel:cybro" });

/** Data Backup & Disaster Recovery: 10 requests per 5 minutes */
export const backupRateLimit = createRateLimit({ requests: 10, window: "5 m", prefix: "sentinel:backup" });

