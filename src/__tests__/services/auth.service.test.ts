/**
 * Tests for AuthService
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AuthService from '@/services/auth/auth.service';
import { AuthenticationError, ValidationError } from '@/lib/auth/errors';
import { createClient as createServerClient } from '@/utils/supabase/server';
import { createClient as createBrowserClient } from '@/utils/supabase/client';

// Mocks
vi.mock('@/utils/supabase/server', () => ({
    createClient: vi.fn(),
}));

vi.mock('@/utils/supabase/client', () => ({
    createClient: vi.fn(),
}));

describe('AuthService', () => {
    let mockSupabaseServer: any;
    let mockSupabaseBrowser: any;

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup common mock structures
        mockSupabaseServer = {
            auth: {
                admin: {
                    createUser: vi.fn(),
                    deleteUser: vi.fn(),
                },
                getUser: vi.fn(),
                signOut: vi.fn(),
            },
            from: vi.fn(),
        };

        mockSupabaseBrowser = {
            auth: {
                signInWithPassword: vi.fn(),
                signOut: vi.fn(),
            },
        };

        (createServerClient as any).mockResolvedValue(mockSupabaseServer);
        (createBrowserClient as any).mockReturnValue(mockSupabaseBrowser);
    });

    describe('signUp', () => {
        it('should validate inputs', async () => {
            await expect(AuthService.signUp('', 'pass', 'name', 'patient'))
                .rejects.toThrow(ValidationError);

            await expect(AuthService.signUp('test@test.com', 'short', 'name', 'patient'))
                .rejects.toThrow(ValidationError);

            await expect(AuthService.signUp('test@test.com', 'password123', 'name', 'invalid'))
                .rejects.toThrow(ValidationError);
        });

        it('should create user and profile successfully', async () => {
            const mockUser = { id: 'user-1', email: 'test@example.com' };

            // Mock createUser success
            mockSupabaseServer.auth.admin.createUser.mockResolvedValue({
                data: { user: mockUser },
                error: null
            });

            // Mock profile insert success
            mockSupabaseServer.from.mockReturnValue({
                insert: vi.fn().mockResolvedValue({ error: null })
            });

            const result = await AuthService.signUp('test@example.com', 'password123', 'John Doe', 'patient');

            expect(result.user.email).toBe('test@example.com');
            expect(result.profile.role).toBe('patient');
            expect(mockSupabaseServer.auth.admin.createUser).toHaveBeenCalled();
            expect(mockSupabaseServer.from).toHaveBeenCalledWith('profiles');
        });

        it('should rollback user creation if profile fails', async () => {
            const mockUser = { id: 'user-1' };

            mockSupabaseServer.auth.admin.createUser.mockResolvedValue({
                data: { user: mockUser },
                error: null
            });

            // Mock profile insert failure
            mockSupabaseServer.from.mockReturnValue({
                insert: vi.fn().mockResolvedValue({ error: { message: 'DB Error' } })
            });

            await expect(AuthService.signUp('test@example.com', 'password123', 'John Doe', 'patient'))
                .rejects.toThrow(AuthenticationError);

            // Verify rollback
            expect(mockSupabaseServer.auth.admin.deleteUser).toHaveBeenCalledWith('user-1');
        });
    });

    describe('signIn', () => {
        it('should sign in successfully', async () => {
            mockSupabaseBrowser.auth.signInWithPassword.mockResolvedValue({
                data: { user: { id: 'u1', email: 'test@test.com' } },
                error: null
            });

            const result = await AuthService.signIn('test@test.com', 'pass');
            expect(result.user.id).toBe('u1');
        });

        it('should handle sign in errors', async () => {
            mockSupabaseBrowser.auth.signInWithPassword.mockResolvedValue({
                data: { user: null },
                error: { message: 'Invalid credentials' }
            });

            await expect(AuthService.signIn('test@test.com', 'pass'))
                .rejects.toThrow(AuthenticationError);
        });
    });
});
