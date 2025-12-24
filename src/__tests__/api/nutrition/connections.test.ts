/**
 * Tests for Patient-Nutritionist Connections
 * Covers: POST /request-patient (Admin Client), POST /accept-request (Standard Client)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST as REQUEST_PATIENT } from '@/app/api/nutrition/request-patient/route';
import { POST as ACCEPT_REQUEST } from '@/app/api/nutrition/accept-request/route';
import { createClient as createClientServer } from '@/utils/supabase/server';
import { createClient as createClientJS } from '@supabase/supabase-js';
import { requireAuth, requireRole } from '@/lib/auth/api-helpers';

// Mocks
vi.mock('@/utils/supabase/server', () => ({
    createClient: vi.fn(),
}));

vi.mock('@/lib/auth/api-helpers', () => ({
    requireAuth: vi.fn(),
    requireRole: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(),
}));

describe('Connections API', () => {
    let mockSupabaseServer: any;
    let mockQueryBuilderServer: any;

    let mockSupabaseAdmin: any;
    let mockQueryBuilderAdmin: any;

    // UUIDs
    const nutriId = 'd0c990f2-275d-43f7-8f6a-40ab1faddc80';
    const patientId = 'c1671295-e2ae-4130-a2d9-7b87d2a1d84f';
    const requestId = 'b5e9b864-4e3b-4c3e-8b6d-6bb9bd380a12';

    const mockNutritionist = { id: nutriId, email: 'nutri@example.com' };
    const mockPatient = { id: patientId, email: 'patient@example.com' };

    beforeEach(() => {
        vi.clearAllMocks();

        process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://mock-url.com';
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-key';

        // --- Standard Client Mock (for Accept Request) ---
        mockQueryBuilderServer = {
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn(),
            then: vi.fn((resolve: any) => resolve({ data: [], error: null })),
        };
        mockSupabaseServer = {
            from: vi.fn(() => mockQueryBuilderServer),
        };
        vi.mocked(createClientServer).mockResolvedValue(mockSupabaseServer);

        // --- Admin Client Mock (for Request Patient) ---
        mockQueryBuilderAdmin = {
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            single: vi.fn(),
            then: vi.fn((resolve: any) => resolve({ data: [], error: null })),
        };
        mockSupabaseAdmin = {
            auth: {
                admin: {
                    listUsers: vi.fn(),
                }
            },
            from: vi.fn(() => mockQueryBuilderAdmin),
        };
        vi.mocked(createClientJS).mockReturnValue(mockSupabaseAdmin);
    });

    describe('POST /api/nutrition/request-patient', () => {
        it('should send request successfully', async () => {
            vi.mocked(requireAuth).mockResolvedValue(mockNutritionist);
            vi.mocked(requireRole).mockResolvedValue();

            // 1. listUsers mock
            mockSupabaseAdmin.auth.admin.listUsers.mockResolvedValue({
                data: { users: [{ id: patientId, email: 'patient@example.com' }] }
            });

            // 2. Patient Profile check: .single()
            mockQueryBuilderAdmin.single.mockResolvedValueOnce({
                data: { id: patientId, role: 'patient' }, error: null
            });

            // 3. Existing Connections: .select() -> then -> returns [] (empty)
            // Default then returns {data: []} which is fine.

            // 4. Existing Requests: .in() -> then -> returns [] (empty)

            // 5. Create Request: .insert().select().single()
            mockQueryBuilderAdmin.single.mockResolvedValueOnce({
                data: { id: requestId, status: 'pending' }, error: null
            });

            const request = new Request('http://localhost/request-patient', {
                method: 'POST',
                body: JSON.stringify({ patientEmail: 'patient@example.com' })
            });

            const response = await REQUEST_PATIENT(request);
            const json = await response.json();

            expect(response.status).toBe(201);
            expect(json.success).toBe(true);
            expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('nutritionist_requests');
        });

        it('should fail if patient not found', async () => {
            vi.mocked(requireAuth).mockResolvedValue(mockNutritionist);
            mockSupabaseAdmin.auth.admin.listUsers.mockResolvedValue({
                data: { users: [] }
            });

            const request = new Request('http://localhost/request-patient', {
                method: 'POST',
                body: JSON.stringify({ patientEmail: 'missing@example.com' })
            });

            const response = await REQUEST_PATIENT(request);
            expect(response.status).toBe(400); // Changed from 404 to prevent user enumeration
        });
    });

    describe('POST /api/nutrition/accept-request', () => {
        it('should accept request successfully', async () => {
            vi.mocked(requireAuth).mockResolvedValue(mockPatient);
            vi.mocked(requireRole).mockResolvedValue();

            const body = { requestId };

            // 1. Get Request: .single()
            mockQueryBuilderServer.single.mockResolvedValueOnce({
                data: { id: requestId, patient_id: patientId, nutritionist_id: nutriId },
                error: null
            });

            // 2. Check Existing Connections: .select() -> then -> returns []
            mockQueryBuilderServer.then.mockImplementationOnce((resolve: any) => resolve({ data: [], error: null }));

            // 3. Update Request Status: .update().eq() -> await
            mockQueryBuilderServer.then.mockImplementationOnce((resolve: any) => resolve({ error: null }));

            // 4. Insert Connection: .insert() -> await (no select, just insert)
            mockQueryBuilderServer.then.mockImplementationOnce((resolve: any) => resolve({ error: null }));

            const request = new Request('http://localhost/accept-request', {
                method: 'POST',
                body: JSON.stringify(body)
            });

            const response = await ACCEPT_REQUEST(request);
            const json = await response.json();

            expect(response.status).toBe(200);
            expect(json.success).toBe(true);
            expect(mockSupabaseServer.from).toHaveBeenCalledWith('patient_nutritionist_connections');
        });

        it('should fail if request does not belong to patient', async () => {
            vi.mocked(requireAuth).mockResolvedValue(mockPatient);

            // Request belongs to OTHER patient
            mockQueryBuilderServer.single.mockResolvedValueOnce({
                data: { id: requestId, patient_id: 'other-id', nutritionist_id: nutriId },
                error: null
            });

            const request = new Request('http://localhost/accept-request', {
                method: 'POST',
                body: JSON.stringify({ requestId })
            });

            const response = await ACCEPT_REQUEST(request);
            expect(response.status).toBe(403);
        });
    });
});
