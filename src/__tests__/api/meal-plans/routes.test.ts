/**
 * Tests for Meal Plans API
 * Covers: GET (List/Detail), POST (Create)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as GET_LIST, POST } from '@/app/api/meal-plans/route';
import { GET as GET_DETAIL } from '@/app/api/meal-plans/[id]/route';
import { createClient } from '@/utils/supabase/server';
import { requireAuth, requireRole } from '@/lib/auth/api-helpers';

// Mocks
vi.mock('@/utils/supabase/server', () => ({
    createClient: vi.fn(),
}));

vi.mock('@/lib/auth/api-helpers', () => ({
    requireAuth: vi.fn(),
    requireRole: vi.fn(),
}));

describe('Meal Plans API', () => {
    let mockSupabaseClient: any;
    let mockQueryBuilder: any;
    // Standard mocks
    const mockNutritionist = { id: 'd0c990f2-275d-43f7-8f6a-40ab1faddc80', email: 'nutri@example.com' };
    const mockPatient = { id: 'c1671295-e2ae-4130-a2d9-7b87d2a1d84f', email: 'patient@example.com' };

    beforeEach(() => {
        vi.clearAllMocks();

        // Query Builder Mock (Chainable + Thenable)
        mockQueryBuilder = {
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockReturnThis(),
            single: vi.fn(), // Mocked per test
            then: vi.fn((resolve: any) => resolve({ data: [], error: null })),
        };

        // Client Mock (Entry point)
        mockSupabaseClient = {
            from: vi.fn(() => mockQueryBuilder),
        };

        vi.mocked(createClient).mockResolvedValue(mockSupabaseClient);
    });

    describe('GET /api/meal-plans (List)', () => {
        it('should list plans for nutritionist', async () => {
            vi.mocked(requireAuth).mockResolvedValue(mockNutritionist);

            // Mock Profile Fetch (Nutritionist role)
            mockQueryBuilder.single.mockResolvedValueOnce({
                data: { id: mockNutritionist.id, role: 'nutritionist' },
                error: null
            });

            // Mock Plans Fetch
            const mockPlans = [
                { id: 'plan-1', patient_id: mockPatient.id, nutritionist_id: mockNutritionist.id, name: 'Plan 1' }
            ];
            // Override 'then' for the plans query
            // First call is profile check (handled by single)
            // Second call is plans query (handled by then)
            // Third call is profiles fetch (handled by then)

            // We need accurate sequencing or flexible mocks.
            // 1. Profile check: .from('profiles')...single() -> resolves
            // 2. Plans query: .from('meal_plans')...order() -> then -> resolves plans
            // 3. Profiles fetch: .from('profiles')...in() -> then -> resolves profiles

            mockQueryBuilder.then
                .mockImplementationOnce((resolve: any) => resolve({ data: mockPlans, error: null })) // Plans query
                .mockImplementationOnce((resolve: any) => resolve({
                    data: [
                        { id: mockNutritionist.id, full_name: 'Dr. Nutri' },
                        { id: mockPatient.id, full_name: 'John Patient' }
                    ], error: null
                })); // Profiles fetch

            const request = new Request('http://localhost/api/meal-plans');
            const response = await GET_LIST(request);
            const json = await response.json();

            expect(response.status).toBe(200);
            expect(json.data).toHaveLength(1);
            expect(json.data[0].patient.full_name).toBe('John Patient');
            expect(mockSupabaseClient.from).toHaveBeenCalledWith('meal_plans');
        });

        it('should list assigned plans for patient', async () => {
            vi.mocked(requireAuth).mockResolvedValue(mockPatient);

            // Mock Profile Fetch (Patient role)
            mockQueryBuilder.single.mockResolvedValueOnce({
                data: { id: mockPatient.id, role: 'patient' },
                error: null
            });

            // Mock Plans
            mockQueryBuilder.then
                .mockImplementationOnce((resolve: any) => resolve({ data: [], error: null })); // Empty plans

            const request = new Request('http://localhost/api/meal-plans');
            const response = await GET_LIST(request);

            expect(response.status).toBe(200);
            // specific eq check for patient filtering?
            // Since it's chainable, hard to verify exact chain order without complex spying.
            // But we can check if .eq('patient_id', user.id) was called.
            expect(mockQueryBuilder.eq).toHaveBeenCalledWith('patient_id', mockPatient.id);
        });
    });

    describe('POST /api/meal-plans (Create)', () => {
        it('should allow nutritionist to create weekly plan', async () => {
            vi.mocked(requireAuth).mockResolvedValue(mockNutritionist);
            vi.mocked(requireRole).mockResolvedValue(); // Success

            const newPlan = {
                patient_id: mockPatient.id,
                type: 'weekly',
                name: 'Weekly Bulk',
                weekly_slots: [
                    { day_of_week: 1, meal_type: 'lunch', meal_name: 'Chicken Rice', description: '200g chicken' }
                ]
            };

            // 1. Verify connection: .single()
            mockQueryBuilder.single.mockResolvedValueOnce({
                data: { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' }, error: null
            });

            // 2. Insert Plan: .insert().select().single()
            mockQueryBuilder.single.mockResolvedValueOnce({
                data: { id: 'b5e9b864-4e3b-4c3e-8b6d-6bb9bd380a12', ...newPlan }, error: null
            });

            // 3. Insert Slots: .insert() -> then
            mockQueryBuilder.then.mockImplementationOnce((resolve: any) => resolve({ error: null }));

            const request = new Request('http://localhost/api/meal-plans', {
                method: 'POST',
                body: JSON.stringify(newPlan),
            });

            const response = await POST(request);
            const json = await response.json();

            expect(response.status).toBe(201);
            expect(json.data.id).toBe('b5e9b864-4e3b-4c3e-8b6d-6bb9bd380a12');
            expect(mockSupabaseClient.from).toHaveBeenCalledWith('weekly_plan_slots');
        });

        it('should fail if patient connection missing', async () => {
            vi.mocked(requireAuth).mockResolvedValue(mockNutritionist);
            vi.mocked(requireRole).mockResolvedValue();

            const newPlan = {
                patient_id: mockPatient.id,
                type: 'weekly',
                name: 'Test',
                weekly_slots: [{ day_of_week: 1, meal_type: 'lunch', meal_name: 'Rice' }]
            };

            // Connection check returns null
            mockQueryBuilder.single.mockResolvedValueOnce({
                data: null, error: null
            });

            const request = new Request('http://localhost/api/meal-plans', {
                method: 'POST',
                body: JSON.stringify(newPlan),
            });

            const response = await POST(request);
            expect(response.status).toBe(403);
        });
    });

    describe('GET /api/meal-plans/[id] (Detail)', () => {
        it('should return plan details with weekly slots', async () => {
            vi.mocked(requireAuth).mockResolvedValue(mockNutritionist);
            const planId = 'plan-1';

            // 1. Get Plan: .single()
            mockQueryBuilder.single.mockResolvedValueOnce({
                data: {
                    id: planId,
                    patient_id: mockPatient.id,
                    nutritionist_id: mockNutritionist.id,
                    type: 'weekly'
                },
                error: null
            });

            // 2. Get Profiles: .in() -> then
            mockQueryBuilder.then.mockImplementationOnce((resolve: any) => resolve({
                data: [{ id: mockPatient.id }, { id: mockNutritionist.id }]
            }));

            // 3. Get Slots: .eq(meal_plan_id).order().order() -> then
            // Note: implementation checks type='weekly' then queries weekly_plan_slots
            mockQueryBuilder.then.mockImplementationOnce((resolve: any) => resolve({
                data: [{ id: 'slot-1', meal_name: 'Lunch' }]
            }));

            const request = new Request(`http://localhost/api/meal-plans/${planId}`);
            const params = Promise.resolve({ id: planId });
            const response = await GET_DETAIL(request, { params });
            const json = await response.json();

            expect(response.status).toBe(200);
            expect(json.data.weekly_slots).toHaveLength(1);
            expect(mockSupabaseClient.from).toHaveBeenCalledWith('weekly_plan_slots');
        });

        it('should return 404 if plan not found', async () => {
            vi.mocked(requireAuth).mockResolvedValue(mockNutritionist);

            // Plan not found
            mockQueryBuilder.single.mockResolvedValueOnce({
                data: null, error: { code: 'PGRST116' }
            });

            const request = new Request(`http://localhost/api/meal-plans/missing`);
            const params = Promise.resolve({ id: 'missing' });
            const response = await GET_DETAIL(request, { params });

            expect(response.status).toBe(404);
        });
    });
});
