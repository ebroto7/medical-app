import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SaveMealDialog } from '@/components/saved-meals/SaveMealDialog';
import { SavedMealsService } from '@/services/saved-meals';

// Mock dependencies
vi.mock('@/services/saved-meals', () => ({
    SavedMealsService: {
        createSavedMeal: vi.fn(),
    },
}));

// Mock hooks if necessary (useToast is typically already mocked in setup or by component design)
// If useToast is from specialized hook, we might need global mock. 
// Assuming Shadcn ui structure which often needs ResizeObserver mock
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};


describe('SaveMealDialog', () => {
    const mockMealData = {
        name: 'My New Meal',
        calories: 500,
        protein: 30,
        carbs: 50,
        fat: 10
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render trigger button', () => {
        render(<SaveMealDialog onSave={vi.fn()} />);
        // Assuming default button text is "Guardar como plantilla" or similar icon
        expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should open dialog and submit form', async () => {
        const onSave = vi.fn();
        (SavedMealsService.createSavedMeal as any).mockResolvedValue({ id: '1', ...mockMealData });

        render(<SaveMealDialog onSave={onSave} defaultValues={mockMealData} />);

        // Open dialog (assuming trigger has specific text or is the only button)
        fireEvent.click(screen.getByRole('button'));

        // Check if dialog content is visible (Shadcn dialog portals content)
        await waitFor(() => expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument());

        // Fill inputs (if not filled by defaultValues)
        fireEvent.change(screen.getByLabelText(/nombre/i), { target: { value: 'Updated Meal Name' } });

        // Submit
        fireEvent.click(screen.getByText('Guardar'));

        await waitFor(() => {
            expect(SavedMealsService.createSavedMeal).toHaveBeenCalledWith(expect.objectContaining({
                name: 'Updated Meal Name',
                calories: 500
            }));
            expect(onSave).toHaveBeenCalled();
        });
    });
});
