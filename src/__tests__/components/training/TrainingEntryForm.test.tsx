/**
 * TrainingEntryForm Component Tests
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TrainingEntryForm } from '@/components/training/TrainingEntryForm';
import { useAuth } from '@/contexts/AuthContext';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';

// Mocks
vi.mock('@/contexts/AuthContext', () => ({
    useAuth: vi.fn(),
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
    Dumbbell: () => <div data-testid="icon-dumbbell" />,
    Activity: () => <div data-testid="icon-activity" />,
    Zap: () => <div data-testid="icon-zap" />,
    Flame: () => <div data-testid="icon-flame" />,
    Users: () => <div data-testid="icon-users" />,
    AlertCircle: () => <div data-testid="icon-alert" />,
    Heart: () => <div data-testid="icon-heart" />,
    Sparkles: () => <div data-testid="icon-sparkles" />,
    MoreHorizontal: () => <div data-testid="icon-more" />,
}));
// Assuming TrainingConfig uses these icons. If dynamic import issues, we might see errors but usually components just render.

describe('TrainingEntryForm', () => {
    const mockOnSuccess = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    it('renders login prompt if user is not authenticated', () => {
        (useAuth as any).mockReturnValue({ user: null, token: null });
        render(<TrainingEntryForm />);
        expect(screen.getByText(/Por favor inicia sesión/i)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Guardar/i })).not.toBeInTheDocument();
    });

    it('renders form when authenticated', () => {
        (useAuth as any).mockReturnValue({ user: { id: '1' }, token: 'token' });
        render(<TrainingEntryForm />);

        expect(screen.getByText('Nuevo Entrenamiento')).toBeInTheDocument();
        expect(screen.getByText('Fecha')).toBeInTheDocument();
        expect(screen.getByText('Hora')).toBeInTheDocument();

        // Verify inputs exist by name attribute since labels aren't connected (a11y issue to note)
        const dateInput = document.querySelector('input[name="date"]');
        const timeInput = document.querySelector('input[name="time"]');
        expect(dateInput).toBeInTheDocument();
        expect(timeInput).toBeInTheDocument();

        // Type buttons exist
        expect(screen.getByText('Cardio')).toBeInTheDocument();
        expect(screen.getByText('Fuerza')).toBeInTheDocument();
    });

    it('validates required fields', async () => {
        (useAuth as any).mockReturnValue({ user: { id: '1' }, token: 'token' });
        render(<TrainingEntryForm />);

        const submitBtn = screen.getByText('Guardar Entrenamiento');
        fireEvent.click(submitBtn);

        // Description is required
        await waitFor(() => {
            expect(screen.getByText('La descripción es obligatoria')).toBeInTheDocument();
        });

        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('submits valid form data', async () => {
        const user = userEvent.setup();
        (useAuth as any).mockReturnValue({ user: { id: '1' }, token: 'token' });

        // Use a delayed promise to ensure we catch the loading state
        let resolveFetch: Function;
        (global.fetch as any).mockImplementation(() => new Promise((resolve) => {
            resolveFetch = () => resolve({
                ok: true,
                json: async () => ({ id: 'new-session' }),
            });
        }));

        render(<TrainingEntryForm onSuccess={mockOnSuccess} />);

        // Description
        await user.type(screen.getByPlaceholderText('Describe tu entrenamiento...'), 'Running 5k');

        // Select Duration
        await user.type(screen.getByPlaceholderText('ej: 45'), '30');

        const submitBtn = screen.getByText('Guardar Entrenamiento');
        await user.click(submitBtn);

        expect(screen.getByText('Guardando...')).toBeInTheDocument();

        // Resolve fetch to finish
        await waitFor(async () => {
            resolveFetch();
        });

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/training/sessions', expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('"type":"cardio"'), // Default is cardio not strength unless clicked
            }));
            expect(mockOnSuccess).toHaveBeenCalled();
        });
    });

    it('handles server error', async () => {
        const user = userEvent.setup();
        (useAuth as any).mockReturnValue({ user: { id: '1' }, token: 'token' });

        (global.fetch as any).mockResolvedValue({
            ok: false,
            json: async () => ({ error: 'Database error' }),
        });

        // Use global console mock to avoid noise? (optional)
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        render(<TrainingEntryForm />);
        await user.type(screen.getByPlaceholderText('Describe tu entrenamiento...'), 'Fail me');
        await user.click(screen.getByText('Guardar Entrenamiento'));

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalled();
        });

        // Error handling in component just logs to console currently, doesn't show UI error toast?
        // Code: console.error("Error:", error);
        expect(consoleSpy).toHaveBeenCalledWith('Error:', expect.any(Error));

        consoleSpy.mockRestore();
    });
});
