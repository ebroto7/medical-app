/**
 * Distributed Rate Limiting using Upstash Redis
 *
 * This module provides production-ready rate limiting that works across
 * multiple serverless instances. Falls back to in-memory rate limiting
 * for local development when Upstash credentials are not configured.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { logger } from "@/lib/logger";

// Environment variables for Upstash Redis
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// Check if Upstash is configured
const isUpstashConfigured = !!(UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN);

// Initialize Redis client (only if configured)
let redis: Redis | null = null;
if (isUpstashConfigured) {
  try {
    redis = new Redis({
      url: UPSTASH_REDIS_REST_URL!,
      token: UPSTASH_REDIS_REST_TOKEN!,
    });
    logger.info("Upstash Redis initialized for distributed rate limiting");
  } catch (error) {
    logger.error({ error }, "Failed to initialize Upstash Redis");
  }
}

// Rate limiter configurations
export const rateLimiters = isUpstashConfigured && redis
  ? {
      strict: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(3, "1 m"),
        analytics: true,
        prefix: "@nutridiary/strict",
      }),

      auth: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "1 m"),
        analytics: true,
        prefix: "@nutridiary/auth",
      }),

      api: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(100, "1 m"),
        analytics: true,
        prefix: "@nutridiary/api",
      }),
    }
  : null;

/**
 * Get client identifier for rate limiting
 * Uses IP address or falls back to "unknown"
 */
function getClientIdentifier(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  return forwarded?.split(",")[0] || realIp || "unknown";
}

/**
 * Check rate limit using Upstash distributed rate limiter
 * Falls back to in-memory rate limiter if Upstash is not configured
 */
export async function checkRateLimit(
  req: Request,
  tier: "strict" | "auth" | "api" = "api"
): Promise<{
  success: boolean;
  headers: Record<string, string>;
}> {
  const identifier = getClientIdentifier(req);

  // If Upstash is configured, use distributed rate limiting
  if (rateLimiters) {
    const limiter = rateLimiters[tier];
    const { success, limit, reset, remaining } = await limiter.limit(identifier);

    return {
      success,
      headers: {
        "X-RateLimit-Limit": limit.toString(),
        "X-RateLimit-Remaining": remaining.toString(),
        "X-RateLimit-Reset": reset.toString(),
      },
    };
  }

  // Fallback to in-memory rate limiter for local development
  logger.warn(
    "Upstash not configured - using in-memory rate limiting (not suitable for production)"
  );

  // Import the fallback rate limiter
  const { default: rateLimit } = await import("@/lib/rate-limit");
  return rateLimit(req, tier);
}
