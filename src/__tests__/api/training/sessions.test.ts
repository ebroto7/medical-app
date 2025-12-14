/**
 * Tests for Training Sessions API
 * Covers: GET (List), POST (Create), PUT (Update), DELETE (Delete)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as GET_LIST, POST } from '@/app/api/training/sessions/route';
import { PUT, DELETE } from '@/app/api/training/sessions/[id]/route';
import { createClient } from '@/utils/supabase/server';
import { requireAuth } from '@/lib/auth/api-helpers';

// Mocks
vi.mock('@/utils/supabase/server', () => ({
    createClient: vi.fn(),
}));

vi.mock('@/lib/auth/api-helpers', () => ({
    requireAuth: vi.fn(),
}));

describe('Training Sessions API', () => {
    let mockSupabaseClient: any;
    let mockQueryBuilder: any;
    const mockUser = { id: 'user-123', email: 'test@example.com' };

    beforeEach(() => {
        vi.clearAllMocks();

        mockQueryBuilder = {
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            single: vi.fn(),
            then: vi.fn((resolve: any) => resolve({ data: [], error: null })),
        };

        mockSupabaseClient = {
            from: vi.fn(() => mockQueryBuilder),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabaseClient);
        vi.mocked(requireAuth).mockResolvedValue(mockUser);
    });

    describe('GET /api/training/sessions (List)', () => {
        it('should list sessions for user', async () => {
            // Mock sessions
            const mockSessions = [
                { id: 'session-1', type: 'strength', date: '2024-12-15' }
            ];
            // Override then for query execution
            mockQueryBuilder.then.mockImplementation((resolve: any) => resolve({
                data: mockSessions,
                error: null
            }));

            const request = new Request('http://localhost/api/training/sessions');
            const response = await GET_LIST(request);
            const json = await response.json();

            expect(response.status).toBe(200);
            expect(json.data).toHaveLength(1);
            expect(mockSupabaseClient.from).toHaveBeenCalledWith('training_sessions');
            expect(mockQueryBuilder.eq).toHaveBeenCalledWith('user_id', mockUser.id);
        });
    });

    describe('POST /api/training/sessions (Create)', () => {
        it('should create session successfully', async () => {
            const newSession = {
                date: '2024-12-15',
                time: '10:00',
                type: 'strength',
                durationMinutes: 60,
                description: 'Chest day',
            };

            // Mock insert response (select() is called at end, so it awaits builder)
            mockQueryBuilder.then.mockImplementation((resolve: any) => resolve({
                data: [{ id: 'session-new', ...newSession }],
                error: null
            }));

            const request = new Request('http://localhost/api/training/sessions', {
                method: 'POST',
                body: JSON.stringify(newSession),
            });

            const response = await POST(request);
            const json = await response.json();

            expect(response.status).toBe(201);
            expect(mockQueryBuilder.insert).toHaveBeenCalledWith(expect.objectContaining({
                user_id: mockUser.id,
                type: 'strength',
            }));
        });

        it('should validate required fields', async () => {
            const invalidSession = {
                date: '2024-12-15',
                // Missing time and type
            };

            const request = new Request('http://localhost/api/training/sessions', {
                method: 'POST',
                body: JSON.stringify(invalidSession),
            });

            const response = await POST(request);
            expect(response.status).toBe(400);
        });
    });

    describe('PUT /api/training/sessions/[id] (Update)', () => {
        const sessionId = 'session-1';

        it('should update own session successfully', async () => {
            // 1. Verify ownership: .single()
            mockQueryBuilder.single.mockResolvedValueOnce({
                data: { id: sessionId, user_id: mockUser.id },
                error: null
            });

            // 2. Update execution: .select() -> then
            mockQueryBuilder.then.mockImplementation((resolve: any) => resolve({
                data: [{ id: sessionId, type: 'cardio' }],
                error: null
            }));

            const updateData = { type: 'cardio' };
            const request = new Request(`http://localhost/api/training/sessions/${sessionId}`, {
                method: 'PUT',
                body: JSON.stringify(updateData),
            });
            const params = Promise.resolve({ id: sessionId });

            const response = await PUT(request, { params });

            expect(response.status).toBe(200);
            expect(mockQueryBuilder.update).toHaveBeenCalledWith(expect.objectContaining({
                type: 'cardio'
            }));
        });

        it('should forbid updating others session', async () => {
            // Not owner
            mockQueryBuilder.single.mockResolvedValueOnce({
                data: { id: sessionId, user_id: 'other-user' },
                error: null
            });

            const request = new Request(`http://localhost/api/training/sessions/${sessionId}`, {
                method: 'PUT',
                body: JSON.stringify({ type: 'cardio' }),
            });
            const params = Promise.resolve({ id: sessionId });

            const response = await PUT(request, { params });
            expect(response.status).toBe(403);
        });
    });

    describe('DELETE /api/training/sessions/[id] (Delete)', () => {
        const sessionId = 'session-1';

        it('should delete own session successfully', async () => {
            // 1. Verify ownership
            mockQueryBuilder.single.mockResolvedValueOnce({
                data: { id: sessionId, user_id: mockUser.id },
                error: null
            });

            // 2. Delete execution
            // .delete().eq() -> await -> calls then -> returns { error: null }

            const request = new Request(`http://localhost/api/training/sessions/${sessionId}`, {
                method: 'DELETE',
            });
            const params = Promise.resolve({ id: sessionId });

            const response = await DELETE(request, { params });
            expect(response.status).toBe(200);
            expect(mockQueryBuilder.delete).toHaveBeenCalled();
        });
    });
});
