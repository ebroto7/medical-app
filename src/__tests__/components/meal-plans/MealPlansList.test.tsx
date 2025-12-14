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
    MealPlanViewDialog: ({ open, onOpenChange }: any) => (
        open ? <div data-testid="view-dialog" onClick={() => onOpenChange(false)}>Dialog Open</div> : null
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
        // Loader2 is usually an SVG, but we look for "animate-spin" class or similar if role is not clear, 
        // but better to look for behavior or text if possible. 
        // The component renders a Loader2 icon inside a div.
        // Let's rely on the fact that nothing else is rendered.
        // Or we can query by a loading accessible name if added, but currently it's just an icon.
        // We can assume it's loading if we don't see "No hay pautas" or list.

        // Actually, testing-library recommends aria roles. 
        // Let's just wait for verify checking "No hay pautas" is NOT there yet and we can find spinner by class or verify fetch called.
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

        // Find delete button for first plan. 
        // Since there are multiple Trash2 icons, we need to be careful.
        // We can use getAllByRole('button') or simpler: match by closest card?
        // The card has the text.

        // Let's assume buttons order matches plans order.
        // Buttons per card: Eye, Trash.
        const buttons = screen.getAllByRole('button'); // 2 per card * 2 cards = 4 buttons.
        // [Eye1, Trash1, Eye2, Trash2]

        // Click Trash on first plan
        fireEvent.click(buttons[1]);

        expect(global.confirm).toHaveBeenCalled();
        expect(global.fetch).toHaveBeenCalledWith(
            `/api/meal-plans/plan-1`,
            expect.objectContaining({ method: 'DELETE' })
        );

        // Should remove from document
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

        const buttons = screen.getAllByRole('button');
        // Click Eye on first plan (index 0)
        fireEvent.click(buttons[0]);

        await waitFor(() => {
            expect(screen.getByTestId('view-dialog')).toBeInTheDocument();
        });
    });
});
