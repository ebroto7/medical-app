import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '@/app/auth/login/page';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';

// Mocks
const mockSignIn = vi.fn();
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
        refresh: vi.fn(),
    }),
}));

vi.mock('@/contexts/AuthContext', () => ({
    useAuth: () => ({
        signIn: mockSignIn,
    }),
}));

// Mock UI components
vi.mock('@/components/ui/input', () => ({
    Input: (props: any) => <input {...props} />,
}));
vi.mock('@/components/ui/button', () => ({
    Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

describe('LoginPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render login form', () => {
        render(<LoginPage />);
        // Check that title and button exist (both match text)
        expect(screen.getAllByText('Iniciar Sesión').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByRole('button', { name: 'Iniciar Sesión' })).toBeInTheDocument();
        expect(screen.getByPlaceholderText('tu@email.com')).toBeInTheDocument();
    });

    it('should handle successful login', async () => {
        render(<LoginPage />);
        const user = userEvent.setup();

        await user.type(screen.getByPlaceholderText('tu@email.com'), 'test@example.com');
        await user.type(screen.getByPlaceholderText('••••••••'), 'password123');

        // Simulate success
        mockSignIn.mockResolvedValueOnce(undefined);

        await user.click(screen.getByRole('button', { name: 'Iniciar Sesión' }));

        await waitFor(() => {
            expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
            expect(mockPush).toHaveBeenCalledWith('/dashboard');
        });
    });

    it('should handle login error', async () => {
        render(<LoginPage />);
        const user = userEvent.setup();

        await user.type(screen.getByPlaceholderText('tu@email.com'), 'test@example.com');
        await user.type(screen.getByPlaceholderText('••••••••'), 'wrongpass');

        // Simulate error
        mockSignIn.mockRejectedValueOnce(new Error('Invalid credentials'));

        await user.click(screen.getByRole('button', { name: 'Iniciar Sesión' }));

        await waitFor(() => {
            expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
            expect(mockPush).not.toHaveBeenCalled();
        });
    });
});
