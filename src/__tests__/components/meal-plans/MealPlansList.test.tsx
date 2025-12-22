/**
 * MealPlansList Component Tests
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MealPlansList } from '@/components/meal-plans/MealPlansList';
import { useAuth } from '@/contexts/AuthContext';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks
vi.mock('@/contexts/AuthContext', () => ({
    useAuth: vi.fn(),
}));

// Mock child dialog to avoid testing complexity here
vi.mock('@/components/meal-plans/MealPlanViewDialog', () => ({
    MealPlanViewDialog: ({ open, onOpenChange, onDelete }: any) => (
        open ? (
            <div data-testid="view-dialog">
                Dialog Open
                <button onClick={() => onOpenChange(false)}>Close</button>
                <button onClick={onDelete} data-testid="mock-delete-btn">Delete</button>
            </div>
        ) : null
    ),
}));

describe('MealPlansList', () => {
    const mockToken = 'mock-token';
    const mockPlans = [
        {
            id: 'plan-1',
            name: 'Weekly Plan A',
            type: 'weekly',
            is_active: true,
            created_at: new Date().toISOString(),
            description: 'Desc A'
        },
        {
            id: 'plan-2',
            name: 'Situational Plan B',
            type: 'situational',
            is_active: true,
            created_at: new Date().toISOString(),
            description: 'Desc B'
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        (useAuth as any).mockReturnValue({ token: mockToken });

        // Mock fetch default
        global.fetch = vi.fn();
        // Use window.confirm mock
        global.confirm = vi.fn(() => true);
    });

    it('renders loading state initially', async () => {
        // Make fetch promise never resolve immediately to see loading
        (global.fetch as any).mockImplementation(() => new Promise(() => { }));

        render(<MealPlansList />);
        expect(global.fetch).toHaveBeenCalledWith('/api/meal-plans', expect.anything());
    });

    it('renders empty state when no plans', async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ data: [] }),
        });

        render(<MealPlansList />);

        await waitFor(() => {
            expect(screen.getByText('No hay pautas creadas')).toBeInTheDocument();
        });
    });

    it('renders list of plans', async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ data: mockPlans }),
        });

        render(<MealPlansList />);

        await waitFor(() => {
            expect(screen.getByText('Weekly Plan A')).toBeInTheDocument();
            expect(screen.getByText('Situational Plan B')).toBeInTheDocument();
        });

        // Check type labels
        expect(screen.getByText('Semanal')).toBeInTheDocument();
        expect(screen.getByText('Situacional')).toBeInTheDocument();
    });

    it('handles delete plan successfully', async () => {
        (global.fetch as any)
            .mockResolvedValueOnce({ // First GET
                ok: true,
                json: async () => ({ data: mockPlans }),
            })
            .mockResolvedValueOnce({ // DELETE
                ok: true,
                json: async () => ({}),
            });

        render(<MealPlansList canEdit={true} />);

        // Wait for list to load
        await waitFor(() => {
            expect(screen.getByText('Weekly Plan A')).toBeInTheDocument();
        });

        // Click the card to open the dialog
        fireEvent.click(screen.getByText('Weekly Plan A'));

        // Wait for dialog
        await waitFor(() => {
            expect(screen.getByTestId('view-dialog')).toBeInTheDocument();
        });

        // Click delete in the mock dialog
        fireEvent.click(screen.getByTestId('mock-delete-btn'));

        // handleDelete (the prop passed to child) calls the API. 
        // Note: The mock child calls onDelete passed from parent. Parent calls handleDelete.

        // Wait for API call
        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
                `/api/meal-plans/plan-1`,
                expect.objectContaining({ method: 'DELETE' })
            );
        });

        // Should remove from document 
        // Note: handleDelete in component calls setPlans(filter...), so UI should update.
        await waitFor(() => {
            expect(screen.queryByText('Weekly Plan A')).not.toBeInTheDocument();
        });
    });

    it('handles opening view dialog', async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ data: mockPlans }),
        });

        render(<MealPlansList />);

        await waitFor(() => {
            expect(screen.getByText('Weekly Plan A')).toBeInTheDocument();
        });

        // Click the card (finding by text inside it)
        fireEvent.click(screen.getByText('Weekly Plan A'));

        await waitFor(() => {
            expect(screen.getByTestId('view-dialog')).toBeInTheDocument();
        });
    });
});
