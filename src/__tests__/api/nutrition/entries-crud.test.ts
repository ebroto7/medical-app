/**
 * Tests for Nutrition Entries CRUD API
 * Covers: POST (Create), PUT (Update), DELETE (Remove)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/nutrition/entries/route';
import { PUT, DELETE } from '@/app/api/nutrition/entries/[id]/route';
import { createClient } from '@/utils/supabase/server';
import { requireAuth } from '@/lib/auth/api-helpers';

// Mocks
vi.mock('@/utils/supabase/server', () => ({
    createClient: vi.fn(),
}));

vi.mock('@/lib/auth/api-helpers', () => ({
    requireAuth: vi.fn(),
}));

vi.mock('@/lib/storage/signed-urls', () => ({
    addSignedUrlsToEntries: vi.fn((_, data) => Promise.resolve(data)),
}));

describe('Nutrition Entries CRUD', () => {
    let mockSupabaseClient: any;
    let mockQueryBuilder: any;
    const mockUser = { id: 'user-123', email: 'test@example.com' };

    beforeEach(() => {
        vi.clearAllMocks();

        // Query Builder Mock (The chainable part that is awaited at the end)
        mockQueryBuilder = {
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn(), // We will mock return value for this specifically
            then: vi.fn((resolve: any) => resolve({ data: [], error: null })),
        };

        // Supabase Client Mock (The entry point)
        mockSupabaseClient = {
            from: vi.fn(() => mockQueryBuilder),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabaseClient);
        vi.mocked(requireAuth).mockResolvedValue(mockUser);
    });

    describe('POST /api/nutrition/entries (Create)', () => {
        it('should create an entry successfully', async () => {
            const newEntry = {
                date: '2024-12-15',
                mealType: 'lunch',
                description: 'Chicken salad',
                time: '12:30',
            };

            // Mock successful insert response via then
            mockQueryBuilder.then.mockImplementation((resolve: any) => resolve({
                data: [{ id: 'entry-1', ...newEntry }],
                error: null
            }));

            const request = new Request('http://localhost/api/nutrition/entries', {
                method: 'POST',
                body: JSON.stringify(newEntry),
            });

            const response = await POST(request);
            const json = await response.json();

            expect(response.status).toBe(201);
            expect(mockSupabaseClient.from).toHaveBeenCalledWith('nutrition_entries');
            expect(mockQueryBuilder.insert).toHaveBeenCalledWith(expect.objectContaining({
                user_id: mockUser.id,
                date: newEntry.date,
                meal_type: newEntry.mealType,
            }));
        });

        it('should validate required fields', async () => {
            const invalidEntry = {
                date: '2024-12-15',
                // Missing mealType
            };

            const request = new Request('http://localhost/api/nutrition/entries', {
                method: 'POST',
                body: JSON.stringify(invalidEntry),
            });

            const response = await POST(request);

            expect(response.status).toBe(400); // Validation error
        });
    });

    describe('PUT /api/nutrition/entries/[id] (Update)', () => {
        const entryId = 'entry-1';

        it('should update own entry successfully', async () => {
            // Mock existing entry check (ownership) - single() returns promise directly
            mockQueryBuilder.single.mockResolvedValueOnce({
                data: { id: entryId, user_id: mockUser.id },
                error: null
            });

            // Mock update response - via then()
            mockQueryBuilder.then.mockImplementation((resolve: any) => resolve({
                data: [{ id: entryId, description: 'Updated' }],
                error: null
            }));

            const updateData = { description: 'Updated' };
            const request = new Request(`http://localhost/api/nutrition/entries/${entryId}`, {
                method: 'PUT',
                body: JSON.stringify(updateData),
            });

            // Need to mock params promise
            const params = Promise.resolve({ id: entryId });

            const response = await PUT(request, { params });

            expect(response.status).toBe(200);
            expect(mockQueryBuilder.update).toHaveBeenCalledWith(expect.objectContaining({
                description: 'Updated'
            }));
        });

        it('should forbid updating others entry', async () => {
            // Mock existing entry belonging to another user
            mockQueryBuilder.single.mockResolvedValueOnce({
                data: { id: entryId, user_id: 'other-user' },
                error: null
            });

            const request = new Request(`http://localhost/api/nutrition/entries/${entryId}`, {
                method: 'PUT',
                body: JSON.stringify({ description: 'Hacked' }),
            });
            const params = Promise.resolve({ id: entryId });

            const response = await PUT(request, { params });

            expect(response.status).toBe(403);
        });

        it('should return 404 if entry does not exist', async () => {
            mockQueryBuilder.single.mockResolvedValueOnce({
                data: null,
                error: { code: 'PGRST116' } // Supabase error for no rows
            });

            const request = new Request(`http://localhost/api/nutrition/entries/${entryId}`, {
                method: 'PUT',
                body: JSON.stringify({}),
            });
            const params = Promise.resolve({ id: entryId });

            const response = await PUT(request, { params });

            expect(response.status).toBe(404);
        });
    });

    describe('DELETE /api/nutrition/entries/[id] (Remove)', () => {
        const entryId = 'entry-1';

        it('should delete own entry successfully', async () => {
            // Mock ownership check
            mockQueryBuilder.single.mockResolvedValueOnce({
                data: { id: entryId, user_id: mockUser.id },
                error: null
            });

            const request = new Request(`http://localhost/api/nutrition/entries/${entryId}`, {
                method: 'DELETE',
            });
            const params = Promise.resolve({ id: entryId });

            const response = await DELETE(request, { params });

            expect(response.status).toBe(200);
            expect(mockQueryBuilder.delete).toHaveBeenCalled();
            expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', entryId);
        });

        it('should forbid deleting others entry', async () => {
            // Mock existing entry belonging to another user
            mockQueryBuilder.single.mockResolvedValueOnce({
                data: { id: entryId, user_id: 'other-user' },
                error: null
            });

            const request = new Request(`http://localhost/api/nutrition/entries/${entryId}`, {
                method: 'DELETE',
            });
            const params = Promise.resolve({ id: entryId });

            const response = await DELETE(request, { params });

            expect(response.status).toBe(403);
        });
    });
});
