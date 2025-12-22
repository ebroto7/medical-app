import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SavedMealsService } from '@/services/saved-meals';

// Mock global fetch
global.fetch = vi.fn();

describe('SavedMealsService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getSavedMeals', () => {
        it('should fetch saved meals successfully', async () => {
            const mockData = [
                { id: '1', name: 'Breakfast', meal_type: 'breakfast' }
            ];

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: mockData }),
            });

            const result = await SavedMealsService.getSavedMeals();
            expect(result).toEqual(mockData);
            expect(global.fetch).toHaveBeenCalledWith('/api/saved-meals', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });
        });

        it('should handle errors when fetching', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                json: async () => ({ error: 'Error fetching saved meals' }),
            });

            await expect(SavedMealsService.getSavedMeals())
                .rejects.toThrow('Error fetching saved meals');
        });
    });

    describe('createSavedMeal', () => {
        it('should create a saved meal successfully', async () => {
            const newMeal = {
                name: 'My Meal',
                meal_type: 'breakfast',
                calories: 500
            };

            const createdMeal = { id: '1', user_id: 'user-1', ...newMeal };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: createdMeal }),
            });

            const result = await SavedMealsService.createSavedMeal(newMeal as any);
            expect(result).toEqual(createdMeal);
            expect(global.fetch).toHaveBeenCalledWith('/api/saved-meals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newMeal),
            });
        });

        it('should throw error if API returns error', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                json: async () => ({ error: 'Error creating saved meal' }),
            });

            await expect(SavedMealsService.createSavedMeal({ name: 'Test' } as any))
                .rejects.toThrow('Error creating saved meal');
        });
    });

    describe('deleteSavedMeal', () => {
        it('should delete a meal successfully', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true }),
            });

            await expect(SavedMealsService.deleteSavedMeal('1')).resolves.not.toThrow();
            expect(global.fetch).toHaveBeenCalledWith('/api/saved-meals/1', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
            });
        });
    });
});
