/**
 * Tests for Habit Log API Route
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, DELETE } from '@/app/api/habits/[id]/log/route';
import { createClient } from '@/utils/supabase/server';
import { requireAuth } from '@/lib/auth/api-helpers';

vi.mock('@/utils/supabase/server', () => ({
    createClient: vi.fn(),
}));

vi.mock('@/lib/auth/api-helpers', () => ({
    requireAuth: vi.fn(),
}));

describe('POST /api/habits/[id]/log', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockSupabase: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockSupabase = {
            from: vi.fn(),
            select: vi.fn(),
            eq: vi.fn(),
            single: vi.fn(),
            upsert: vi.fn(),
        };

        mockSupabase.from.mockReturnValue(mockSupabase);
        mockSupabase.select.mockReturnValue(mockSupabase);
        mockSupabase.eq.mockReturnValue(mockSupabase);
        mockSupabase.upsert.mockReturnValue(mockSupabase);

        // Habit ownership check
        mockSupabase.single.mockResolvedValue({ data: { id: 'habit-1' }, error: null });

        vi.mocked(createClient).mockResolvedValue(mockSupabase);
        vi.mocked(requireAuth).mockResolvedValue({ id: 'user-123', email: 'test@example.com' });
    });

    it('should log habit completion for today', async () => {
        mockSupabase.single.mockResolvedValueOnce({ data: { id: 'habit-1' }, error: null }) // ownership
            .mockResolvedValueOnce({ data: { id: 'log-1' }, error: null }); // insert

        const request = new Request('http://localhost/api/habits/habit-1/log', {
            method: 'POST',
            body: JSON.stringify({}),
        });

        const response = await POST(request, { params: Promise.resolve({ id: 'habit-1' }) });

        expect(response.status).toBe(201);
        expect(mockSupabase.upsert).toHaveBeenCalledWith(
            expect.objectContaining({ habit_id: 'habit-1' }),
            expect.anything()
        );
    });

    it('should return 404 if habit not owned by user', async () => {
        mockSupabase.single.mockResolvedValue({ data: null, error: null });

        const request = new Request('http://localhost/api/habits/someone-else/log', {
            method: 'POST',
        });

        const response = await POST(request, { params: Promise.resolve({ id: 'someone-else' }) });
        expect(response.status).toBe(404);
    });
});

describe('DELETE /api/habits/[id]/log', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(requireAuth).mockResolvedValue({ id: 'user-123', email: 'test@example.com' });
    });

    it('should remove habit log for a date', async () => {
        // Create mock for the habit ownership check chain
        const habitCheckChain = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'habit-1' }, error: null }),
        };

        // Create mock for the delete chain
        const deleteChain = {
            eq: vi.fn().mockReturnThis(),
        };
        // The last eq() call in the chain needs to resolve
        deleteChain.eq.mockImplementation(() => {
            return { eq: vi.fn().mockResolvedValue({ error: null }) };
        });

        const mockDelete = vi.fn().mockReturnValue(deleteChain);

        // Mock from() to return different chains based on the table
        const mockFrom = vi.fn().mockImplementation((table: string) => {
            if (table === 'habits') {
                return habitCheckChain;
            }
            if (table === 'habit_logs') {
                return { delete: mockDelete };
            }
            return {};
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        vi.mocked(createClient).mockResolvedValue({ from: mockFrom } as any);

        const request = new Request('http://localhost/api/habits/habit-1/log?date=2024-01-15', {
            method: 'DELETE',
        });

        const response = await DELETE(request, { params: Promise.resolve({ id: 'habit-1' }) });

        expect(response.status).toBe(200);
        expect(mockDelete).toHaveBeenCalled();
    });
});
