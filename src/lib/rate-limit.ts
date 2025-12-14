/**
 * Rate Limiting Utility
 * In-memory rate limiter for API endpoints
 * 
 * Note: This is a simple in-memory solution suitable for single-instance deployments.
 * For multi-instance/serverless deployments, consider using @upstash/ratelimit with Redis.
 */

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

interface RateLimitConfig {
    /** Maximum number of requests allowed in the window */
    limit: number;
    /** Time window in milliseconds */
    windowMs: number;
}

class InMemoryRateLimiter {
    private store: Map<string, RateLimitEntry> = new Map();
    private cleanupInterval: ReturnType<typeof setInterval> | null = null;

    constructor() {
        // Clean up expired entries every 5 minutes
        if (typeof setInterval !== 'undefined') {
            this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
        }
    }

    private cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.store.entries()) {
            if (now > entry.resetTime) {
                this.store.delete(key);
            }
        }
    }

    /**
     * Check if a request should be allowed
     * @returns Object with success boolean and remaining requests
     */
    check(
        identifier: string,
        config: RateLimitConfig
    ): { success: boolean; remaining: number; resetTime: number } {
        const now = Date.now();
        const entry = this.store.get(identifier);

        // If no entry or entry has expired, create new one
        if (!entry || now > entry.resetTime) {
            const newEntry: RateLimitEntry = {
                count: 1,
                resetTime: now + config.windowMs,
            };
            this.store.set(identifier, newEntry);
            return {
                success: true,
                remaining: config.limit - 1,
                resetTime: newEntry.resetTime,
            };
        }

        // Entry exists and is still valid
        if (entry.count >= config.limit) {
            return {
                success: false,
                remaining: 0,
                resetTime: entry.resetTime,
            };
        }

        // Increment count
        entry.count++;
        return {
            success: true,
            remaining: config.limit - entry.count,
            resetTime: entry.resetTime,
        };
    }

    /**
     * Destroy the rate limiter (cleanup interval)
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
    }
}

// Singleton instance
const rateLimiter = new InMemoryRateLimiter();

/**
 * Rate limit configuration presets
 */
export const rateLimitConfigs = {
    /** Auth endpoints: 5 requests per minute */
    auth: { limit: 5, windowMs: 60 * 1000 },
    /** API endpoints: 100 requests per minute */
    api: { limit: 100, windowMs: 60 * 1000 },
    /** Strict: 3 requests per minute (for sensitive operations) */
    strict: { limit: 3, windowMs: 60 * 1000 },
} as const;

/**
 * Get client identifier from request
 * Uses x-forwarded-for header (for proxied requests) or falls back to a default
 */
export function getClientIdentifier(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        // Get the first IP in the chain (original client)
        return forwarded.split(',')[0].trim();
    }

    // Fallback - in serverless environments, this might always be the same
    // Consider using a header from your CDN/proxy
    return request.headers.get('x-real-ip') || 'unknown';
}

/**
 * Apply rate limiting to a request
 * 
 * @example
 * ```ts
 * const rateLimitResult = rateLimit(request, 'auth');
 * if (!rateLimitResult.success) {
 *   return Response.json(
 *     { error: 'Too many requests' },
 *     { status: 429, headers: rateLimitResult.headers }
 *   );
 * }
 * ```
 */
export function rateLimit(
    request: Request,
    configName: keyof typeof rateLimitConfigs = 'api'
): {
    success: boolean;
    remaining: number;
    headers: Record<string, string>;
} {
    const config = rateLimitConfigs[configName];
    const identifier = getClientIdentifier(request);
    const key = `${configName}:${identifier}`;

    const result = rateLimiter.check(key, config);

    const headers: Record<string, string> = {
        'X-RateLimit-Limit': config.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
    };

    if (!result.success) {
        const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
        headers['Retry-After'] = retryAfter.toString();
    }

    return {
        success: result.success,
        remaining: result.remaining,
        headers,
    };
}

export default rateLimit;
