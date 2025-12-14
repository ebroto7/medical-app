/**
 * Tests for RoleService
 * Tests role caching and retrieval functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the Supabase client
vi.mock('@/utils/supabase/server', () => ({
    createClient: vi.fn(),
}));

// Mock constants
vi.mock('@/lib/auth/constants', () => ({
    ROLE_CACHE_TTL: 5 * 60 * 1000, // 5 minutes
}));

// We need to test the class itself, not the singleton
// So we'll create a new instance for each test

describe('RoleService', () => {
    let mockSupabase: ReturnType<typeof createMockSupabase>;

    function createMockSupabase(role: string | null = 'patient') {
        return {
            from: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
                data: role ? { role } : null,
                error: role ? null : { code: 'PGRST116' },
            }),
        };
    }

    beforeEach(async () => {
        vi.clearAllMocks();
        vi.useFakeTimers();

        // Reset module cache to get fresh singleton
        vi.resetModules();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('getRoleForUser', () => {
        it('should fetch role from database on first call', async () => {
            mockSupabase = createMockSupabase('patient');
            const { createClient } = await import('@/utils/supabase/server');
            vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);

            const { default: RoleService } = await import('@/services/auth/role.service');

            const role = await RoleService.getRoleForUser('user-123');

            expect(role).toBe('patient');
            expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
            expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'user-123');
        });

        it('should return cached role on subsequent calls', async () => {
            mockSupabase = createMockSupabase('nutritionist');
            const { createClient } = await import('@/utils/supabase/server');
            vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);

            const { default: RoleService } = await import('@/services/auth/role.service');

            // First call - should hit database
            await RoleService.getRoleForUser('user-123');

            // Second call - should use cache
            const role = await RoleService.getRoleForUser('user-123');

            expect(role).toBe('nutritionist');
            // Should only be called once (cached on second call)
            expect(mockSupabase.from).toHaveBeenCalledTimes(1);
        });

        it('should refetch after cache TTL expires', async () => {
            mockSupabase = createMockSupabase('patient');
            const { createClient } = await import('@/utils/supabase/server');
            vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);

            const { default: RoleService } = await import('@/services/auth/role.service');

            // First call
            await RoleService.getRoleForUser('user-123');
            expect(mockSupabase.from).toHaveBeenCalledTimes(1);

            // Advance time past TTL (5 minutes + 1 second)
            vi.advanceTimersByTime(5 * 60 * 1000 + 1000);

            // Second call - should hit database again
            await RoleService.getRoleForUser('user-123');
            expect(mockSupabase.from).toHaveBeenCalledTimes(2);
        });

        it('should return null for user without profile', async () => {
            mockSupabase = createMockSupabase(null);
            const { createClient } = await import('@/utils/supabase/server');
            vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);

            const { default: RoleService } = await import('@/services/auth/role.service');

            const role = await RoleService.getRoleForUser('nonexistent-user');

            expect(role).toBeNull();
        });

        it('should cache null results', async () => {
            mockSupabase = createMockSupabase(null);
            const { createClient } = await import('@/utils/supabase/server');
            vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);

            const { default: RoleService } = await import('@/services/auth/role.service');

            // First call
            await RoleService.getRoleForUser('nonexistent-user');

            // Second call - should use cache
            await RoleService.getRoleForUser('nonexistent-user');

            expect(mockSupabase.from).toHaveBeenCalledTimes(1);
        });
    });

    describe('invalidateRoleCache', () => {
        it('should force refetch after invalidation', async () => {
            mockSupabase = createMockSupabase('patient');
            const { createClient } = await import('@/utils/supabase/server');
            vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);

            const { default: RoleService } = await import('@/services/auth/role.service');

            // First call - cache the role
            await RoleService.getRoleForUser('user-123');
            expect(mockSupabase.from).toHaveBeenCalledTimes(1);

            // Invalidate cache
            RoleService.invalidateRoleCache('user-123');

            // Next call should hit database
            await RoleService.getRoleForUser('user-123');
            expect(mockSupabase.from).toHaveBeenCalledTimes(2);
        });
    });

    describe('clearCache', () => {
        it('should clear all cached roles', async () => {
            mockSupabase = createMockSupabase('patient');
            const { createClient } = await import('@/utils/supabase/server');
            vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);

            const { default: RoleService } = await import('@/services/auth/role.service');

            // Cache roles for multiple users
            await RoleService.getRoleForUser('user-1');
            await RoleService.getRoleForUser('user-2');
            expect(mockSupabase.from).toHaveBeenCalledTimes(2);

            // Clear all cache
            RoleService.clearCache();

            // Both should hit database again
            await RoleService.getRoleForUser('user-1');
            await RoleService.getRoleForUser('user-2');
            expect(mockSupabase.from).toHaveBeenCalledTimes(4);
        });
    });
});
