/**
 * Tests for HabitsList Component
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { HabitsList } from '@/components/habits/HabitsList';
import { type Habit } from '@/components/habits/HabitCard';

describe('HabitsList', () => {
    const mockHabits: Habit[] = [
        {
            id: 'habit-1',
            name: 'Drink water',
            icon: '💧',
            color: 'blue',
            frequency: 'daily',
            days_of_week: null,
            is_active: true,
            currentStreak: 5,
            completedToday: true,
            logsThisMonth: [],
        },
        {
            id: 'habit-2',
            name: 'Exercise',
            icon: '🏃',
            color: 'green',
            frequency: 'daily',
            days_of_week: null,
            is_active: true,
            currentStreak: 0,
            completedToday: false,
            logsThisMonth: [],
        },
    ];

    const mockOnToggle = vi.fn();
    const mockOnEdit = vi.fn();
    const mockOnDelete = vi.fn();

    it('should render empty state when no habits', () => {
        render(
            <HabitsList
                habits={[]}
                onToggle={mockOnToggle}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
            />
        );

        expect(screen.getByText('Sin hábitos todavía')).toBeInTheDocument();
        expect(screen.getByText(/crea tu primer hábito/i)).toBeInTheDocument();
    });

    it('should render all habits', () => {
        render(
            <HabitsList
                habits={mockHabits}
                onToggle={mockOnToggle}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
            />
        );

        expect(screen.getByText('Drink water')).toBeInTheDocument();
        expect(screen.getByText('Exercise')).toBeInTheDocument();
    });

    it('should show correct progress count', () => {
        render(
            <HabitsList
                habits={mockHabits}
                onToggle={mockOnToggle}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
            />
        );

        // 1 out of 2 completed
        expect(screen.getByText('1/2 completados')).toBeInTheDocument();
    });

    it('should show progress bar', () => {
        const { container } = render(
            <HabitsList
                habits={mockHabits}
                onToggle={mockOnToggle}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
            />
        );

        // Progress bar with 50% width (1/2)
        const progressBar = container.querySelector('.bg-primary');
        expect(progressBar).toHaveStyle({ width: '50%' });
    });
});
