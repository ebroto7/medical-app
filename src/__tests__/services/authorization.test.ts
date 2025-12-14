/**
 * Tests for AuthorizationService
 * Tests ownership validation, role requirements, and connection checks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OwnershipError, AuthorizationError, RoleError } from '@/lib/auth/errors';

// Mock the Supabase client
vi.mock('@/utils/supabase/server', () => ({
    createClient: vi.fn(),
}));

// Mock RoleService
vi.mock('@/services/auth/role.service', () => ({
    default: {
        getRoleForUser: vi.fn(),
    },
}));

// Import after mocks
import AuthorizationService from '@/services/auth/authorization';
import RoleService from '@/services/auth/role.service';
import { createClient } from '@/utils/supabase/server';

describe('AuthorizationService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('requireOwnership', () => {
        it('should not throw when user is the owner', () => {
            const userId = 'user-123';
            const resourceOwnerId = 'user-123';

            expect(() => {
                AuthorizationService.requireOwnership(userId, resourceOwnerId);
            }).not.toThrow();
        });

        it('should throw OwnershipError when user is not the owner', () => {
            const userId = 'user-123';
            const resourceOwnerId = 'user-456';

            expect(() => {
                AuthorizationService.requireOwnership(userId, resourceOwnerId);
            }).toThrow(OwnershipError);
        });

        it('should include descriptive message in error', () => {
            const userId = 'user-123';
            const resourceOwnerId = 'user-456';

            expect(() => {
                AuthorizationService.requireOwnership(userId, resourceOwnerId);
            }).toThrow('User is not the owner of this resource');
        });
    });

    describe('requireRole', () => {
        it('should not throw when user has allowed role', async () => {
            vi.mocked(RoleService.getRoleForUser).mockResolvedValue('patient');

            await expect(
                AuthorizationService.requireRole('user-123', ['patient', 'nutritionist'])
            ).resolves.not.toThrow();
        });

        it('should throw RoleError when user role is not in allowed list', async () => {
            vi.mocked(RoleService.getRoleForUser).mockResolvedValue('patient');

            await expect(
                AuthorizationService.requireRole('user-123', ['nutritionist'])
            ).rejects.toThrow(RoleError);
        });

        it('should throw RoleError when user has no role', async () => {
            vi.mocked(RoleService.getRoleForUser).mockResolvedValue(null);

            await expect(
                AuthorizationService.requireRole('user-123', ['patient'])
            ).rejects.toThrow(RoleError);
        });
    });

    describe('canAccessPatientData', () => {
        it('should return true when user is the patient', async () => {
            const result = await AuthorizationService.canAccessPatientData('patient-123', 'patient-123');
            expect(result).toBe(true);
        });

        it('should return true when nutritionist is connected to patient', async () => {
            const mockSupabase = {
                from: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { id: 'connection-1' }, error: null }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);

            const result = await AuthorizationService.canAccessPatientData('nutritionist-123', 'patient-456');
            expect(result).toBe(true);
        });

        it('should return false when nutritionist is not connected', async () => {
            const mockSupabase = {
                from: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);

            const result = await AuthorizationService.canAccessPatientData('nutritionist-123', 'patient-456');
            expect(result).toBe(false);
        });
    });

    describe('requireConnection', () => {
        it('should not throw when user is the patient', async () => {
            await expect(
                AuthorizationService.requireConnection('patient-123', 'patient-123', 'nutritionist-456')
            ).resolves.not.toThrow();
        });

        it('should throw AuthorizationError when user is neither patient nor nutritionist', async () => {
            await expect(
                AuthorizationService.requireConnection('random-user', 'patient-123', 'nutritionist-456')
            ).rejects.toThrow(AuthorizationError);
        });

        it('should validate connection when user is nutritionist', async () => {
            const mockSupabase = {
                from: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: { id: 'connection-1' }, error: null }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);

            await expect(
                AuthorizationService.requireConnection('nutritionist-456', 'patient-123', 'nutritionist-456')
            ).resolves.not.toThrow();
        });

        it('should throw AuthorizationError when nutritionist is not connected', async () => {
            const mockSupabase = {
                from: vi.fn().mockReturnThis(),
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
            };

            vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>);

            await expect(
                AuthorizationService.requireConnection('nutritionist-456', 'patient-123', 'nutritionist-456')
            ).rejects.toThrow(AuthorizationError);
        });
    });
});
