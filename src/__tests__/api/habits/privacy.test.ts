/**
 * Tests for Habit Privacy & Sharing
 * TDD Approach: Defining expectations before implementation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/habits/route';
import { createClient } from '@/utils/supabase/server';
import { requireAuth } from '@/lib/auth/api-helpers';
import RoleService from '@/services/auth/role.service';

// Mock dependencies
vi.mock('@/utils/supabase/server', () => ({
    createClient: vi.fn(),
}));

vi.mock('@/lib/auth/api-helpers', () => ({
    requireAuth: vi.fn(),
}));

vi.mock('@/services/auth/role.service', () => ({
    default: {
        getRoleForUser: vi.fn(),
    }
}));

// Mock Rate Limit to avoid issues
vi.mock('@/lib/rate-limit', () => ({
    rateLimit: vi.fn(() => ({ success: true, headers: {} }))
}));

describe('Habit Privacy API', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockSupabase: any;
    // Valid UUIDs (v4 format required by Zod)
    const patientId = 'a0000000-0000-4000-8000-000000000001';
    const nutritionistId = 'b0000000-0000-4000-8000-000000000002';

    beforeEach(() => {
        vi.clearAllMocks();

        // Create a thenable query builder for chained queries
        const createQueryBuilder = () => {
            const builder: any = {
                from: vi.fn(),
                select: vi.fn(),
                eq: vi.fn(),
                neq: vi.fn(),
                order: vi.fn(),
                limit: vi.fn(),
                insert: vi.fn(),
                single: vi.fn(),
                // Thenable to support await on the chain
                then: vi.fn((resolve) => resolve({ data: [], error: null })),
            };
            
            // Chainable methods return builder
            builder.from.mockReturnValue(builder);
            builder.select.mockReturnValue(builder);
            builder.eq.mockReturnValue(builder);
            builder.neq.mockReturnValue(builder);
            builder.limit.mockReturnValue(builder);
            builder.insert.mockReturnValue(builder);
            builder.order.mockReturnValue(builder);
            
            // Terminal methods
            builder.single.mockResolvedValue({ data: { sort_order: 0, id: 'test-id' }, error: null });
            
            return builder;
        };

        // mockSupabase is the client - NOT thenable
        // The query builder (returned by .from()) IS thenable
        const queryBuilder = createQueryBuilder();
        mockSupabase = {
            from: vi.fn().mockReturnValue(queryBuilder),
        };
        
        // Expose queryBuilder methods on mockSupabase for test assertions
        mockSupabase.select = queryBuilder.select;
        mockSupabase.eq = queryBuilder.eq;
        mockSupabase.neq = queryBuilder.neq;
        mockSupabase.order = queryBuilder.order;
        mockSupabase.limit = queryBuilder.limit;
        mockSupabase.insert = queryBuilder.insert;
        mockSupabase.single = queryBuilder.single;

        vi.mocked(createClient).mockResolvedValue(mockSupabase);
    });

    describe('GET /api/habits (Privacy Filtering)', () => {
        
        it('should allow Patient to see ALL their habits (private and public)', async () => {
            // Setup User: Patient
            vi.mocked(requireAuth).mockResolvedValue({ id: patientId, email: 'p@test.com' });
            vi.mocked(RoleService.getRoleForUser).mockResolvedValue('patient');

            const request = new Request('http://localhost/api/habits');
            await GET(request);

            // Assert: Should query habits for this user
            expect(mockSupabase.from).toHaveBeenCalledWith('habits');
            expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', patientId);
            // Assert: Should NOT filter by is_private (fetching all)
            expect(mockSupabase.eq).not.toHaveBeenCalledWith('is_private', false);
        });

        it('should allow Nutritionist to see ONLY PUBLIC habits of a patient', async () => {
            // Setup User: Nutritionist viewing Patient
            
            vi.mocked(requireAuth).mockResolvedValue({ id: nutritionistId, email: 'n@test.com' });
            vi.mocked(RoleService.getRoleForUser).mockResolvedValue('nutritionist');

            // Nutritionist requests habits for specific patient
            const request = new Request(`http://localhost/api/habits?userId=${patientId}`);
            
            // Mock response data
            mockSupabase.order.mockResolvedValue({ data: [], error: null });

            await GET(request);

            // Assert: Should query habits for target patient
            expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', patientId);
            
            // Assert: CRITICAL - Should filter out private habits
            // Note: Implementation might use .eq('is_private', false) OR .neq('is_private', true)
            // For now, let's assume we want explicitly public ones
            expect(mockSupabase.eq).toHaveBeenCalledWith('is_private', false);
        });
    });

    describe('POST /api/habits (Creation & Privacy)', () => {
        
        it('should allow Patient to create a PRIVATE habit', async () => {
             vi.mocked(requireAuth).mockResolvedValue({ id: patientId, email: 'p@test.com' });
             vi.mocked(RoleService.getRoleForUser).mockResolvedValue('patient');

             const request = new Request('http://localhost/api/habits', {
                 method: 'POST',
                 body: JSON.stringify({ 
                     name: 'Secret Habit', 
                     icon: '🔒', 
                     color: 'slate',
                     is_private: true 
                 })
             });

             await POST(request);

             expect(mockSupabase.insert).toHaveBeenCalledWith(
                 expect.objectContaining({
                     user_id: patientId,
                     created_by: patientId,
                     is_private: true
                 })
             );
        });

        it('should allow Nutritionist to create a habit for a Patient (defaults to allowed)', async () => {

            vi.mocked(requireAuth).mockResolvedValue({ id: nutritionistId, email: 'n@test.com' });
            vi.mocked(RoleService.getRoleForUser).mockResolvedValue('nutritionist');

            const request = new Request('http://localhost/api/habits', {
                method: 'POST',
                body: JSON.stringify({ 
                    name: 'Eat Vegetables', 
                    icon: '🥦', 
                    color: 'green',
                    targetUserId: patientId // Nutritionist specifies target
                })
            });

            await POST(request);

            expect(mockSupabase.insert).toHaveBeenCalledWith(
                expect.objectContaining({
                    user_id: patientId,   // Assigned to patient
                    created_by: nutritionistId, // Created by nutri
                    is_private: false     // Public by default/force
                })
            );
       });
    });
});
