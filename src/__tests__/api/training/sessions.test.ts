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

vi.mock('@/lib/rate-limit', () => ({
    rateLimit: vi.fn(() => ({ success: true, headers: {} })),
}));

describe('Training Sessions API', () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };

    function createMockSupabase(options: {
        selectData?: unknown[];
        insertData?: unknown[];
        updateData?: unknown[];
        deleteError?: Error | null;
        ownershipData?: { user_id: string } | null;
    } = {}) {
        const {
            selectData = [],
            insertData = [{ id: 'new-id' }],
            updateData = [{ id: 'updated-id' }],
            deleteError = null,
            ownershipData = { user_id: mockUser.id },
        } = options;

        // Create chainable mock that returns itself
        const createChain = (finalValue: unknown) => {
            const chain: Record<string, ReturnType<typeof vi.fn>> = {
                select: vi.fn().mockReturnThis(),
                insert: vi.fn().mockReturnThis(),
                update: vi.fn().mockReturnThis(),
                delete: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                gte: vi.fn().mockReturnThis(),
                lte: vi.fn().mockReturnThis(),
                order: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: finalValue, error: null }),
            };

            // For methods that end the chain (select after order for GET)
            chain.order.mockImplementation(() => ({
                ...chain,
                order: vi.fn().mockResolvedValue({ data: selectData, error: null }),
            }));

            return chain;
        };

        let callCount = 0;
        return {
            from: vi.fn(() => {
                callCount++;
                // First call might be ownership check, subsequent calls are the actual operation
                if (callCount === 1 && ownershipData !== undefined) {
                    // This is likely an ownership check or GET query
                    return createChain(ownershipData);
                }
                // For insert/update operations
                const chain = createChain(insertData);
                chain.single.mockResolvedValue({ data: updateData[0] ?? insertData[0], error: null });
                return chain;
            }),
        };
    }

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(requireAuth).mockResolvedValue(mockUser);
    });

    describe('GET /api/training/sessions (List)', () => {
        it('should list sessions for user', async () => {
            const mockSessions = [
                { id: 'session-1', type: 'strength', date: '2024-12-15' }
            ];

            const mockSupabase = {
                from: vi.fn(() => ({
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    gte: vi.fn().mockReturnThis(),
                    lte: vi.fn().mockReturnThis(),
                    order: vi.fn().mockReturnValue({
                        order: vi.fn().mockResolvedValue({ data: mockSessions, error: null }),
                    }),
                })),
            };
            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const request = new Request('http://localhost/api/training/sessions');
            const response = await GET_LIST(request);
            const json = await response.json();

            expect(response.status).toBe(200);
            expect(json.success).toBe(true);
            expect(json.data).toHaveLength(1);
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

            const mockSupabase = {
                from: vi.fn(() => ({
                    insert: vi.fn().mockReturnValue({
                        select: vi.fn().mockReturnValue({
                            single: vi.fn().mockResolvedValue({
                                data: { id: 'session-new', ...newSession },
                                error: null,
                            }),
                        }),
                    }),
                })),
            };
            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const request = new Request('http://localhost/api/training/sessions', {
                method: 'POST',
                body: JSON.stringify(newSession),
            });

            const response = await POST(request);
            const json = await response.json();

            expect(response.status).toBe(201);
            expect(json.success).toBe(true);
            expect(json.data.type).toBe('strength');
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
            let callCount = 0;
            const mockSupabase = {
                from: vi.fn(() => {
                    callCount++;
                    if (callCount === 1) {
                        // Ownership check
                        return {
                            select: vi.fn().mockReturnValue({
                                eq: vi.fn().mockReturnValue({
                                    single: vi.fn().mockResolvedValue({
                                        data: { user_id: mockUser.id },
                                        error: null,
                                    }),
                                }),
                            }),
                        };
                    }
                    // Update
                    return {
                        update: vi.fn().mockReturnValue({
                            eq: vi.fn().mockReturnValue({
                                select: vi.fn().mockReturnValue({
                                    single: vi.fn().mockResolvedValue({
                                        data: { id: sessionId, type: 'cardio' },
                                        error: null,
                                    }),
                                }),
                            }),
                        }),
                    };
                }),
            };
            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const updateData = { type: 'cardio' };
            const request = new Request(`http://localhost/api/training/sessions/${sessionId}`, {
                method: 'PUT',
                body: JSON.stringify(updateData),
            });
            const params = Promise.resolve({ id: sessionId });

            const response = await PUT(request, { params });

            expect(response.status).toBe(200);
            const json = await response.json();
            expect(json.success).toBe(true);
        });

        it('should forbid updating others session', async () => {
            const mockSupabase = {
                from: vi.fn(() => ({
                    select: vi.fn().mockReturnValue({
                        eq: vi.fn().mockReturnValue({
                            single: vi.fn().mockResolvedValue({
                                data: { user_id: 'other-user' },
                                error: null,
                            }),
                        }),
                    }),
                })),
            };
            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

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
            let callCount = 0;
            const mockSupabase = {
                from: vi.fn(() => {
                    callCount++;
                    if (callCount === 1) {
                        // Ownership check
                        return {
                            select: vi.fn().mockReturnValue({
                                eq: vi.fn().mockReturnValue({
                                    single: vi.fn().mockResolvedValue({
                                        data: { user_id: mockUser.id },
                                        error: null,
                                    }),
                                }),
                            }),
                        };
                    }
                    // Delete
                    return {
                        delete: vi.fn().mockReturnValue({
                            eq: vi.fn().mockResolvedValue({ error: null }),
                        }),
                    };
                }),
            };
            vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

            const request = new Request(`http://localhost/api/training/sessions/${sessionId}`, {
                method: 'DELETE',
            });
            const params = Promise.resolve({ id: sessionId });

            const response = await DELETE(request, { params });
            expect(response.status).toBe(200);
        });
    });
});
