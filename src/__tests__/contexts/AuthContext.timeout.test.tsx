import { render, screen, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted to ensure mocks are initialized before vi.mock factory
const { mockGetSession, mockSignOut, mockOnAuthStateChange } = vi.hoisted(() => ({
    mockGetSession: vi.fn(),
    mockSignOut: vi.fn(),
    mockOnAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
    })),
}));

// Mock the createBrowserClient to return our mocks
vi.mock('@supabase/ssr', () => ({
    createBrowserClient: () => ({
        auth: {
            getSession: mockGetSession,
            signOut: mockSignOut,
            onAuthStateChange: mockOnAuthStateChange,
        },
        from: () => ({
            select: () => ({
                eq: () => ({
                    single: () => Promise.resolve({ data: { role: 'patient' }, error: null })
                })
            })
        })
    }),
}));

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
        prefetch: vi.fn(),
        refresh: vi.fn(),
    }),
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
}));

// Test component to consume the context
const TestComponent = () => {
    const { isLoading, user } = useAuth();
    if (isLoading) return <div>Loading...</div>;
    if (!user) return <div>No User</div>;
    return <div>User: {user.email}</div>;
};

describe('AuthContext Timeout Recovery', () => {
    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('triggers auto-recovery (signOut) when getSession hangs', async () => {
        vi.useFakeTimers();
        // 1. Simulate a HANG: getSession returns a promise that stays pending forever
        mockGetSession.mockReturnValue(new Promise(() => { }));

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        // Should be strictly loading initially
        expect(screen.getByText('Loading...')).toBeInTheDocument();

        // 2. Advance time past the 3000ms timeout
        // Wrap in act to process the state updates triggered by the timeout rejection
        await act(async () => {
            vi.advanceTimersByTime(4000);
        });

        // 3. Verify Recovery actions
        // Since we used act+fakeTimers, the state buffer should be flushed
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
        expect(screen.getByText('No User')).toBeInTheDocument();

        // 4. CRITICAL: Verify signOut was called to clear zombie cookies
        expect(mockSignOut).toHaveBeenCalledTimes(1);
    });

    it('does NOT trigger recovery if getSession completes quickly', async () => {
        // USE REAL TIMERS for the happy path to avoid waitFor hanging
        vi.useRealTimers();

        // Simulate fast success
        mockGetSession.mockResolvedValue({
            data: { session: { user: { id: '123', email: 'test@example.com' }, access_token: 'token' } }
        });

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        // Initial load
        expect(screen.getByText('Loading...')).toBeInTheDocument();

        // Wait for the normal resolution (Real timers used here, so waitFor works naturally)
        await screen.findByText('User: test@example.com');

        // Verify signOut was NEVER called
        expect(mockSignOut).not.toHaveBeenCalled();
    });
});
