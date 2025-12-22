/**
 * Saved Meals Service
 * Client-side wrapper for saved meals API routes
 * Migrated from direct Supabase client to API routes for consistency and security
 */

import { Database } from '@/types/database';

type SavedMeal = Database['public']['Tables']['saved_meals']['Row'];
type SavedMealInsert = Database['public']['Tables']['saved_meals']['Insert'];

export const SavedMealsService = {
    async getSavedMeals(): Promise<SavedMeal[]> {
        const response = await fetch('/api/saved-meals', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('Error fetching saved meals:', error);
            throw new Error(error.error || 'Error fetching saved meals');
        }

        const { data } = await response.json();
        return data || [];
    },

    async createSavedMeal(meal: Omit<SavedMealInsert, 'user_id'>): Promise<SavedMeal> {
        const response = await fetch('/api/saved-meals', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(meal),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('Error creating saved meal:', error);
            throw new Error(error.error || 'Error creating saved meal');
        }

        const { data } = await response.json();
        return data;
    },

    async deleteSavedMeal(id: string): Promise<void> {
        const response = await fetch(`/api/saved-meals/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('Error deleting saved meal:', error);
            throw new Error(error.error || 'Error deleting saved meal');
        }
    },

    async updateSavedMeal(id: string, meal: Partial<Omit<SavedMealInsert, 'user_id'>>): Promise<SavedMeal> {
        const response = await fetch(`/api/saved-meals/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(meal),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('Error updating saved meal:', error);
            throw new Error(error.error || 'Error updating saved meal');
        }

        const { data } = await response.json();
        return data;
    }
};
