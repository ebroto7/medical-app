/**
 * Tests for Auxiliary APIs
 * Covers: Health, Comments, Notifications
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as GET_HEALTH } from '@/app/api/health/route';
import { GET as GET_COMMENTS, POST as POST_COMMENT } from '@/app/api/comments/route';
import { GET as GET_NOTIFS } from '@/app/api/notifications/route';
import { createClient as createClientServer } from '@/utils/supabase/server';
import { createClient as createClientJS } from '@supabase/supabase-js';
import { requireAuth, canAccessPatientData } from '@/lib/auth/api-helpers';

// Mocks
vi.mock('@/utils/supabase/server', () => ({
    createClient: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(),
}));

vi.mock('@/lib/auth/api-helpers', () => ({
    requireAuth: vi.fn(),
    requireRole: vi.fn(),
    canAccessPatientData: vi.fn(),
}));

describe('Auxiliary APIs', () => {
    let mockSupabaseServer: any; // For app/api logic
    let mockSupabaseJS: any;     // For health check
    let mockQueryBuilder: any;
    const mockUser = { id: 'user-123', email: 'test@example.com' };

    beforeEach(() => {
        vi.clearAllMocks();

        process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://mock';
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock';

        mockQueryBuilder = {
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(), // Added limit
            single: vi.fn(),
            then: vi.fn((resolve: any) => resolve({ data: [], error: null })),
        };

        mockSupabaseServer = {
            from: vi.fn(() => mockQueryBuilder),
        };

        mockSupabaseJS = {
            from: vi.fn(() => mockQueryBuilder),
        };

        vi.mocked(createClientServer).mockResolvedValue(mockSupabaseServer);
        vi.mocked(createClientJS).mockReturnValue(mockSupabaseJS);
        vi.mocked(requireAuth).mockResolvedValue(mockUser);
        vi.mocked(canAccessPatientData).mockResolvedValue(true);
    });

    describe('GET /api/health', () => {
        it('should return 200 OK', async () => {
            // Mock simple query for health check
            mockQueryBuilder.then.mockImplementation((resolve: any) => resolve({ data: [{ count: 1 }], error: null }));

            const response = await GET_HEALTH();
            const json = await response.json();

            expect(response.status).toBe(200);
            expect(json.status).toBe('ok');
        });

        it('should return 500 if DB is down', async () => {
            mockQueryBuilder.then.mockImplementation((resolve: any) => resolve({ error: { message: 'Down' } }));

            const response = await GET_HEALTH();
            expect(response.status).toBe(500);
        });
    });

    describe('GET /api/comments', () => {
        it('should list comments for an entity', async () => {
            const entryId = 'b5e9b864-4e3b-4c3e-8b6d-6bb9bd380a12';
            const mockComments = [{ id: 'c1', content: 'Nice!', nutritionist_id: 'nutri-1' }];

            // 1. Entry check: .single()
            mockQueryBuilder.single.mockResolvedValueOnce({
                data: { id: entryId, user_id: 'patient-1' }, error: null
            });

            // 2. Comments query
            mockSupabaseServer.from
                .mockReturnValueOnce({ ...mockQueryBuilder, single: vi.fn().mockResolvedValue({ data: { id: entryId, user_id: 'p1' } }) })
                .mockReturnValueOnce({ ...mockQueryBuilder, then: vi.fn((r: any) => r({ data: mockComments, error: null })) })
                .mockReturnValueOnce({ ...mockQueryBuilder, then: vi.fn((r: any) => r({ data: [], error: null })) });

            const request = new Request(`http://localhost/api/comments?entry_id=${entryId}`);
            const response = await GET_COMMENTS(request);
            const json = await response.json();

            expect(response.status).toBe(200);
            expect(json.data).toHaveLength(1);
        });
    });

    describe('POST /api/comments', () => {
        it('should create comment', async () => {
            const entryId = 'b5e9b864-4e3b-4c3e-8b6d-6bb9bd380a12';
            const newComment = { entry_id: entryId, comment: 'Hello' };

            // 1. Entry check
            mockSupabaseServer.from
                .mockReturnValueOnce({ ...mockQueryBuilder, single: vi.fn().mockResolvedValue({ data: { id: entryId, user_id: 'p1' } }) })
                .mockReturnValue({ ...mockQueryBuilder, then: vi.fn((r: any) => r({ data: [{ id: 'new' }], error: null })) });

            const request = new Request('http://localhost/api/comments', {
                method: 'POST',
                body: JSON.stringify(newComment),
            });

            const response = await POST_COMMENT(request);

            expect(response.status).toBe(201);
        });
    });
    describe('GET /api/notifications', () => {
        it('should list unread notifications', async () => {
            const mockNotifs = [{ id: 'n1', read: false }];

            // Mock query with limit
            mockQueryBuilder.then.mockImplementation((resolve: any) => resolve({ data: mockNotifs, error: null }));

            const request = new Request('http://localhost/api/notifications');
            const response = await GET_NOTIFS(request);
            const json = await response.json();

            expect(response.status).toBe(200);
            expect(json.data).toHaveLength(1);
            expect(mockQueryBuilder.limit).toHaveBeenCalled();
        });
    });
});
