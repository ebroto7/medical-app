/**
 * Tests for Nutrition Entries API (GET) with Pagination
 * TDD: These tests verify that the endpoint supports pagination
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/nutrition/entries/route';
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

describe('GET /api/nutrition/entries', () => {
    let mockSupabase: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockSupabase = {
            from: vi.fn(),
            select: vi.fn(),
            eq: vi.fn(),
            gte: vi.fn(),
            lte: vi.fn(),
            order: vi.fn(),
            range: vi.fn(),
        };

        // Chainable methods must return the mock object itself
        mockSupabase.from.mockReturnValue(mockSupabase);
        mockSupabase.select.mockReturnValue(mockSupabase);
        mockSupabase.eq.mockReturnValue(mockSupabase);
        mockSupabase.gte.mockReturnValue(mockSupabase);
        mockSupabase.lte.mockReturnValue(mockSupabase);
        mockSupabase.order.mockReturnValue(mockSupabase);

        // Terminal method returns the data promise
        mockSupabase.range.mockResolvedValue({
            data: [{ id: '1', date: '2024-12-14' }],
            error: null,
            count: 10
        });

        vi.mocked(createClient).mockResolvedValue(mockSupabase);
        vi.mocked(requireAuth).mockResolvedValue({ id: 'user-123', email: 'test@example.com' });
    });

    it('should support pagination params', async () => {
        // Request with page 2, limit 5
        const request = new Request('http://localhost/api/nutrition/entries?page=2&limit=5');

        const response = await GET(request);
        const json = await response.json();

        // Verify range was called correctly
        // Page 2, Limit 5 -> Offset 5 (start index 5), End index 9
        // Range is (from, to) inclusive
        expect(mockSupabase.range).toHaveBeenCalledWith(5, 9);

        // Verify response structure includes pagination meta
        expect(json).toHaveProperty('pagination');
        expect(json.pagination).toEqual(expect.objectContaining({
            page: 2,
            limit: 5,
            total: 10,
            totalPages: 2
        }));
    });

    it('should use defaults when no params provided', async () => {
        const request = new Request('http://localhost/api/nutrition/entries');

        const response = await GET(request);
        const json = await response.json();

        // Defaults: Page 1, Limit 20 -> Range 0-19
        expect(mockSupabase.range).toHaveBeenCalledWith(0, 19);

        expect(json.pagination).toEqual(expect.objectContaining({
            page: 1,
            limit: 20
        }));
    });

    it('should include count in selection', async () => {
        const request = new Request('http://localhost/api/nutrition/entries');
        await GET(request);

        // Verify select was called with count option
        expect(mockSupabase.select).toHaveBeenCalledWith(
            expect.stringContaining('*'),
            { count: 'exact' }
        );
    });
});
