/**
 * CreateWeeklyPlanDialog Component Tests
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateWeeklyPlanDialog } from '@/components/meal-plans/CreateWeeklyPlanDialog';
import { useAuth } from '@/contexts/AuthContext';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';

// Mocks
vi.mock('@/contexts/AuthContext', () => ({
    useAuth: vi.fn(),
}));

// Mock UI components if necessary
// Mock WeeklyPlanGrid to avoid Radix UI / DnD complexity in this dialog test
vi.mock('@/components/meal-plans/WeeklyPlanGrid', () => ({
    WeeklyPlanGrid: ({ slots, onSlotsChange }: any) => (
        <div data-testid="weekly-plan-grid">
            <button
                onClick={() => onSlotsChange([
                    ...slots,
                    {
                        id: 's1',
                        day: 'monday',
                        meal_name: 'Oatmeal',
                        meal_type: 'breakfast'
                    }
                ])}
            >
                Add Mock Slot
            </button>
            <ul>
                {slots.map((s: any) => <li key={s.id}>{s.meal_name}</li>)}
            </ul>
        </div>
    ),
    WeeklySlot: () => null // Mock export if needed
}));

describe('CreateWeeklyPlanDialog', () => {
    const mockToken = 'mock-token';
    const mockOnOpenChange = vi.fn();
    const mockOnCreated = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (useAuth as any).mockReturnValue({ token: mockToken });
        global.fetch = vi.fn();
        // window.alert mock
        global.alert = vi.fn();
    });

    it('does not render when open is false', () => {
        render(
            <CreateWeeklyPlanDialog
                patientId="p1"
                patientName="John"
                open={false}
                onOpenChange={mockOnOpenChange}
                onCreated={mockOnCreated}
            />
        );
        expect(screen.queryByText('Crear Pauta Semanal')).not.toBeInTheDocument();
    });

    it('renders form when open is true', () => {
        render(
            <CreateWeeklyPlanDialog
                patientId="p1"
                patientName="John"
                open={true}
                onOpenChange={mockOnOpenChange}
                onCreated={mockOnCreated}
            />
        );
        expect(screen.getByText('Crear Pauta Semanal')).toBeInTheDocument();
        expect(screen.getByText(/Para: John/)).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Ej: Pauta de mantenimiento')).toBeInTheDocument();
    });

    it('adds a meal slot', async () => {
        const user = userEvent.setup();
        render(
            <CreateWeeklyPlanDialog
                patientId="p1"
                patientName="John"
                open={true}
                onOpenChange={mockOnOpenChange}
                onCreated={mockOnCreated}
            />
        );

        // Add slot button (from mock)
        fireEvent.click(screen.getByText('Add Mock Slot'));

        // Should see slot render
        expect(screen.getByText('Oatmeal')).toBeInTheDocument();
    });

    it('submits valid form', async () => {
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ data: { id: 'new-plan' } }),
        });

        render(
            <CreateWeeklyPlanDialog
                patientId="p1"
                patientName="John"
                open={true}
                onOpenChange={mockOnOpenChange}
                onCreated={mockOnCreated}
            />
        );

        // Fill Name - use fireEvent for reliability with controlled inputs in tests
        fireEvent.change(screen.getByPlaceholderText('Ej: Pauta de mantenimiento'), { target: { value: 'My Diet' } });

        // Add Slot using mock
        fireEvent.click(screen.getByText('Add Mock Slot'));

        // Wait for slot (Oatmeal is added by mock default)
        expect(screen.getByText('Oatmeal')).toBeInTheDocument();

        // Click Save
        const saveBtn = screen.getByText('Crear Pauta');
        // Check not disabled
        expect(saveBtn).not.toBeDisabled();

        fireEvent.click(saveBtn);

        expect(saveBtn).toBeDisabled(); // Loading state
        expect(screen.getByText('Guardando...')).toBeInTheDocument();

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith('/api/meal-plans', expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('"name":"My Diet"'),
            }));
            expect(mockOnCreated).toHaveBeenCalled();
            expect(mockOnOpenChange).toHaveBeenCalledWith(false);
        });
    });

    it('handles empty form submission check', async () => {
        render(
            <CreateWeeklyPlanDialog
                patientId="p1"
                patientName="John"
                open={true}
                onOpenChange={mockOnOpenChange}
                onCreated={mockOnCreated}
            />
        );

        const saveBtn = screen.getByText('Crear Pauta');
        expect(saveBtn).toBeDisabled();
    });
});
