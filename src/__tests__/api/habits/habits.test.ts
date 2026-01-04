/**
 * Tests for Habits API Routes
 * Following project patterns from nutrition/entries.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/habits/route';
import { createClient } from '@/utils/supabase/server';
import { requireAuth } from '@/lib/auth/api-helpers';
import { AuthenticationError } from '@/lib/auth/errors';
import { rateLimit } from '@/lib/rate-limit';

// Mocks
vi.mock('@/utils/supabase/server', () => ({
    createClient: vi.fn(),
}));

vi.mock('@/lib/auth/api-helpers', () => ({
    requireAuth: vi.fn(),
}));

vi.mock('@/lib/rate-limit', () => ({
    rateLimit: vi.fn(() => ({ success: true, headers: {} })),
}));

vi.mock('@/services/auth/role.service', () => ({
    default: {
        getRoleForUser: vi.fn(),
    }
}));

import RoleService from '@/services/auth/role.service';

describe('GET /api/habits', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockSupabase: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockSupabase = {
            from: vi.fn(),
            select: vi.fn(),
            eq: vi.fn(),
            order: vi.fn(),
        };

        // Chainable methods
        mockSupabase.from.mockReturnValue(mockSupabase);
        mockSupabase.select.mockReturnValue(mockSupabase);
        mockSupabase.eq.mockReturnValue(mockSupabase);
        mockSupabase.order.mockResolvedValue({
            data: [
                {
                    id: 'habit-1',
                    name: 'Drink water',
                    icon: '💧',
                    color: 'blue',
                    habit_logs: [
                        { completed_at: new Date().toISOString().split('T')[0] }
                    ]
                }
            ],
            error: null
        });

        vi.mocked(createClient).mockResolvedValue(mockSupabase);
        vi.mocked(requireAuth).mockResolvedValue({ id: 'user-123', email: 'test@example.com' });
        // Default role for legacy tests
        vi.mocked(RoleService.getRoleForUser).mockResolvedValue('patient');
    });

    it('should return habits with stats for authenticated user', async () => {
        const request = new Request('http://localhost/api/habits');
        const response = await GET(request);
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.data).toBeDefined();
        expect(json.data[0]).toHaveProperty('currentStreak');
        expect(json.data[0]).toHaveProperty('completedToday');
    });

    it('should return 401 when not authenticated', async () => {
        vi.mocked(requireAuth).mockRejectedValue(new AuthenticationError('Unauthorized'));

        const request = new Request('http://localhost/api/habits');
        const response = await GET(request);
        expect(response.status).toBe(401);
    });

    it('should query only active habits for the user', async () => {
        const request = new Request('http://localhost/api/habits');
        await GET(request);

        expect(mockSupabase.from).toHaveBeenCalledWith('habits');
        expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'user-123');
        expect(mockSupabase.eq).toHaveBeenCalledWith('is_active', true);
    });
});

describe('POST /api/habits', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockSupabase: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockSupabase = {
            from: vi.fn(),
            select: vi.fn(),
            insert: vi.fn(),
            eq: vi.fn(),
            order: vi.fn(),
            limit: vi.fn(),
            single: vi.fn(),
        };

        // Chainable for max sort_order query
        mockSupabase.from.mockReturnValue(mockSupabase);
        mockSupabase.select.mockReturnValue(mockSupabase);
        mockSupabase.eq.mockReturnValue(mockSupabase);
        mockSupabase.order.mockReturnValue(mockSupabase);
        mockSupabase.limit.mockReturnValue(mockSupabase);
        mockSupabase.single.mockResolvedValue({ data: { sort_order: 0 }, error: null });

        // Insert chain
        mockSupabase.insert.mockReturnValue(mockSupabase);

        vi.mocked(createClient).mockResolvedValue(mockSupabase);
        vi.mocked(requireAuth).mockResolvedValue({ id: 'user-123', email: 'test@example.com' });
        vi.mocked(rateLimit).mockReturnValue({ success: true, remaining: 100, headers: {} });
    });

    it('should create a new habit with valid data', async () => {
        mockSupabase.single.mockResolvedValueOnce({ data: null, error: null }) // max sort_order
            .mockResolvedValueOnce({
                data: { id: 'new-habit', name: 'Exercise', icon: '🏃', color: 'green' },
                error: null
            });

        const request = new Request('http://localhost/api/habits', {
            method: 'POST',
            body: JSON.stringify({ name: 'Exercise', icon: '🏃', color: 'green' }),
        });

        const response = await POST(request);

        expect(response.status).toBe(201);
        expect(mockSupabase.insert).toHaveBeenCalledWith(
            expect.objectContaining({
                user_id: 'user-123',
                name: 'Exercise',
                icon: '🏃',
                color: 'green',
            })
        );
    });

    it('should return 400 for invalid data', async () => {
        const request = new Request('http://localhost/api/habits', {
            method: 'POST',
            body: JSON.stringify({ name: '' }), // Empty name is invalid
        });

        const response = await POST(request);
        expect(response.status).toBe(400);
    });

    it('should return 429 when rate limited', async () => {
        vi.mocked(rateLimit).mockReturnValue({
            success: false,
            remaining: 0,
            headers: { 'Retry-After': '60' }
        });

        const request = new Request('http://localhost/api/habits', {
            method: 'POST',
            body: JSON.stringify({ name: 'Test' }),
        });

        const response = await POST(request);
        expect(response.status).toBe(429);
    });
});
