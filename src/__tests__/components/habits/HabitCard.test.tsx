/**
 * Tests for HabitCard Component
 * Following project patterns from SavedMealsList.test.tsx
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HabitCard, type Habit } from '@/components/habits/HabitCard';

describe('HabitCard', () => {
    const mockHabit: Habit = {
        id: 'habit-1',
        name: 'Drink water',
        icon: '💧',
        color: 'blue',
        frequency: 'daily',
        days_of_week: null,
        is_active: true,
        currentStreak: 5,
        completedToday: false,
        logsThisMonth: [],
    };

    const mockOnToggle = vi.fn();
    const mockOnEdit = vi.fn();
    const mockOnDelete = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        mockOnToggle.mockResolvedValue(undefined);
    });

    it('should render habit name and icon', () => {
        render(
            <HabitCard
                habit={mockHabit}
                onToggle={mockOnToggle}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
            />
        );

        expect(screen.getByText('Drink water')).toBeInTheDocument();
        expect(screen.getByText('💧')).toBeInTheDocument();
    });

    it('should show streak badge when streak > 0', () => {
        render(
            <HabitCard
                habit={mockHabit}
                onToggle={mockOnToggle}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
            />
        );

        expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should not show streak badge when streak is 0', () => {
        const habitNoStreak = { ...mockHabit, currentStreak: 0 };
        render(
            <HabitCard
                habit={habitNoStreak}
                onToggle={mockOnToggle}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
            />
        );

        expect(screen.queryByText('0')).not.toBeInTheDocument();
    });

    it('should call onToggle when check button is clicked', async () => {
        render(
            <HabitCard
                habit={mockHabit}
                onToggle={mockOnToggle}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
            />
        );

        const checkButton = screen.getByRole('button', { name: /marcar hábito/i });
        fireEvent.click(checkButton);

        await waitFor(() => {
            expect(mockOnToggle).toHaveBeenCalledWith('habit-1', true);
        });
    });

    it('should show check icon when habit is completed', () => {
        const completedHabit = { ...mockHabit, completedToday: true };
        render(
            <HabitCard
                habit={completedHabit}
                onToggle={mockOnToggle}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
            />
        );

        const checkButton = screen.getByRole('button', { name: /desmarcar hábito/i });
        expect(checkButton).toBeInTheDocument();
    });

    // Note: Dropdown menu test skipped - Radix UI portals don't render properly in jsdom
    // The edit/delete functionality is tested via integration tests
    it('should have actions menu button', () => {
        render(
            <HabitCard
                habit={mockHabit}
                onToggle={mockOnToggle}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
            />
        );

        // Find the menu trigger button by its aria attributes
        const menuButton = screen.getByRole('button', { expanded: false });
        expect(menuButton).toHaveAttribute('aria-haspopup', 'menu');
    });

    it('should apply strikethrough style when completed', () => {
        const completedHabit = { ...mockHabit, completedToday: true };
        render(
            <HabitCard
                habit={completedHabit}
                onToggle={mockOnToggle}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
            />
        );

        const nameElement = screen.getByText('Drink water');
        expect(nameElement).toHaveClass('line-through');
    });
});
