import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SavedMealsList } from '@/components/saved-meals/SavedMealsList';
import { SavedMealsService } from '@/services/saved-meals';

vi.mock('@/services/saved-meals', () => ({
    SavedMealsService: {
        getSavedMeals: vi.fn(),
        deleteSavedMeal: vi.fn(),
    },
}));

describe('SavedMealsList', () => {
    const mockMeals = [
        { id: '1', name: 'Meal 1', meal_type: 'breakfast', calories: 300 },
        { id: '2', name: 'Meal 2', meal_type: 'lunch', calories: 600 },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render loading state initially', () => {
        (SavedMealsService.getSavedMeals as any).mockImplementation(() => new Promise(() => { }));
        render(<SavedMealsList onSelect={vi.fn()} />);
        expect(screen.getByText('Cargando...')).toBeInTheDocument();
    });

    it('should render meals after loading', async () => {
        (SavedMealsService.getSavedMeals as any).mockResolvedValue(mockMeals);
        render(<SavedMealsList onSelect={vi.fn()} />);

        await waitFor(() => {
            expect(screen.getByText('Meal 1')).toBeInTheDocument();
            expect(screen.getByText('Meal 2')).toBeInTheDocument();
        });
    });

    it('should call onSelect when a meal is clicked', async () => {
        (SavedMealsService.getSavedMeals as any).mockResolvedValue(mockMeals);
        const onSelect = vi.fn();
        render(<SavedMealsList onSelect={onSelect} />);

        await waitFor(() => screen.getByText('Meal 1'));
        fireEvent.click(screen.getByText('Meal 1'));

        expect(onSelect).toHaveBeenCalledWith(mockMeals[0]);
    });

    it('should call delete service when delete button is clicked', async () => {
        (SavedMealsService.getSavedMeals as any).mockResolvedValue(mockMeals);
        render(<SavedMealsList onSelect={vi.fn()} />);

        await waitFor(() => screen.getByText('Meal 1'));

        // Assuming there is a delete button with proper aria-label or text
        const deleteButtons = screen.getAllByRole('button', { name: /eliminar/i });
        fireEvent.click(deleteButtons[0]);

        expect(SavedMealsService.deleteSavedMeal).toHaveBeenCalledWith('1');

        // Should remove from UI
        await waitFor(() => {
            expect(screen.queryByText('Meal 1')).not.toBeInTheDocument();
        });
    });
});
