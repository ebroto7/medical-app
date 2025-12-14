/**
 * Tests for Rate Limit Utility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { rateLimit, rateLimitConfigs } from '@/lib/rate-limit';

// Mock logger to avoid clutter
vi.mock('@/lib/logger', () => ({
    logger: {
        warn: vi.fn(),
    },
}));

describe('Rate Limit Utility', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    const createRequest = (ip: string) => {
        return new Request('http://localhost', {
            headers: { 'x-forwarded-for': ip },
        });
    };

    it('should allow requests within limit', () => {
        const ip = '1.1.1.1';
        const limit = rateLimitConfigs.strict.limit; // 3

        // Make 'limit' requests
        for (let i = 0; i < limit; i++) {
            const result = rateLimit(createRequest(ip), 'strict');
            expect(result.success).toBe(true);
            expect(result.remaining).toBe(limit - 1 - i);
        }
    });

    it('should block requests over limit', () => {
        const ip = '2.2.2.2';
        const limit = rateLimitConfigs.strict.limit;

        // Consume limit
        for (let i = 0; i < limit; i++) {
            rateLimit(createRequest(ip), 'strict');
        }

        // Exceed limit
        const result = rateLimit(createRequest(ip), 'strict');
        expect(result.success).toBe(false);
        expect(result.remaining).toBe(0);
        expect(result.headers['Retry-After']).toBeDefined();
    });

    it('should reset after windowMs', () => {
        const ip = '3.3.3.3';
        const config = rateLimitConfigs.strict;

        // Consume limit
        for (let i = 0; i < config.limit; i++) {
            rateLimit(createRequest(ip), 'strict');
        }

        // Requests blocked
        expect(rateLimit(createRequest(ip), 'strict').success).toBe(false);

        // Advance time past window
        vi.advanceTimersByTime(config.windowMs + 100);

        // Should be allowed again
        const result = rateLimit(createRequest(ip), 'strict');
        expect(result.success).toBe(true);
        expect(result.remaining).toBe(config.limit - 1);
    });

    it('should distinguish different IPs', () => {
        const ip1 = '4.4.4.4';
        const ip2 = '5.5.5.5';

        // Consume IP1 limit
        for (let i = 0; i < rateLimitConfigs.strict.limit; i++) {
            rateLimit(createRequest(ip1), 'strict');
        }

        // IP1 blocked
        expect(rateLimit(createRequest(ip1), 'strict').success).toBe(false);

        // IP2 should be fresh
        expect(rateLimit(createRequest(ip2), 'strict').success).toBe(true);
    });
});
