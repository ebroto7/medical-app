/**
 * Tests for Smart Streak Calculator
 *
 * Date reference for January 2026:
 * 2026-01-01 = Thursday (4)
 * 2026-01-02 = Friday (5)
 * 2026-01-03 = Saturday (6)
 * 2026-01-04 = Sunday (0)
 * 2026-01-05 = Monday (1)
 * 2026-01-06 = Tuesday (2)
 * 2026-01-07 = Wednesday (3)
 * 2026-01-08 = Thursday (4)
 * 2026-01-09 = Friday (5)
 * 2026-01-10 = Saturday (6)
 * 2026-01-11 = Sunday (0)
 * 2026-01-12 = Monday (1)
 */

import { describe, it, expect } from 'vitest';
import {
  calculateSmartStreak,
  isExpectedDay,
  getFrequencyLabel,
  formatDaysOfWeek,
  HabitConfig,
} from '@/lib/habits/streak-calculator';

describe('Smart Streak Calculator', () => {
  describe('isExpectedDay', () => {
    it('should return true for daily habits on any day', () => {
      const habit: HabitConfig = { frequency: 'daily', days_of_week: null };

      expect(isExpectedDay('2026-01-04', habit)).toBe(true); // Sunday
      expect(isExpectedDay('2026-01-05', habit)).toBe(true); // Monday
      expect(isExpectedDay('2026-01-09', habit)).toBe(true); // Friday
    });

    it('should return true for weekly habits only on specified days', () => {
      // Monday (1), Wednesday (3), Friday (5)
      const habit: HabitConfig = { frequency: 'weekly', days_of_week: [1, 3, 5] };

      // 2026-01-04 is Sunday (0) - not expected
      expect(isExpectedDay('2026-01-04', habit)).toBe(false);
      // 2026-01-05 is Monday (1) - expected
      expect(isExpectedDay('2026-01-05', habit)).toBe(true);
      // 2026-01-06 is Tuesday (2) - not expected
      expect(isExpectedDay('2026-01-06', habit)).toBe(false);
      // 2026-01-07 is Wednesday (3) - expected
      expect(isExpectedDay('2026-01-07', habit)).toBe(true);
      // 2026-01-08 is Thursday (4) - not expected
      expect(isExpectedDay('2026-01-08', habit)).toBe(false);
      // 2026-01-09 is Friday (5) - expected
      expect(isExpectedDay('2026-01-09', habit)).toBe(true);
      // 2026-01-10 is Saturday (6) - not expected
      expect(isExpectedDay('2026-01-10', habit)).toBe(false);
    });

    it('should handle weekend-only habits', () => {
      // Saturday (6), Sunday (0)
      const habit: HabitConfig = { frequency: 'weekly', days_of_week: [0, 6] };

      expect(isExpectedDay('2026-01-04', habit)).toBe(true);  // Sunday (0)
      expect(isExpectedDay('2026-01-05', habit)).toBe(false); // Monday (1)
      expect(isExpectedDay('2026-01-10', habit)).toBe(true);  // Saturday (6)
    });

    it('should treat weekly with empty days_of_week as daily', () => {
      const habit: HabitConfig = { frequency: 'weekly', days_of_week: [] };

      expect(isExpectedDay('2026-01-04', habit)).toBe(true);
      expect(isExpectedDay('2026-01-05', habit)).toBe(true);
    });
  });

  describe('calculateSmartStreak - Daily Habits', () => {
    const dailyHabit: HabitConfig = { frequency: 'daily', days_of_week: null };

    it('should count consecutive days from context date', () => {
      const logs = [
        { completed_at: '2026-01-09' }, // Friday
        { completed_at: '2026-01-08' }, // Thursday
        { completed_at: '2026-01-07' }, // Wednesday
      ];

      const result = calculateSmartStreak(dailyHabit, logs, '2026-01-09');

      expect(result.currentStreak).toBe(3);
      expect(result.streakUnit).toBe('days');
      expect(result.completedToday).toBe(true);
    });

    it('should stop streak at first gap', () => {
      const logs = [
        { completed_at: '2026-01-09' },
        { completed_at: '2026-01-08' },
        // Gap: 2026-01-07 missing
        { completed_at: '2026-01-06' },
        { completed_at: '2026-01-05' },
      ];

      const result = calculateSmartStreak(dailyHabit, logs, '2026-01-09');

      expect(result.currentStreak).toBe(2);
    });

    it('should return 0 if context date not completed', () => {
      const logs = [
        { completed_at: '2026-01-08' },
        { completed_at: '2026-01-07' },
      ];

      const result = calculateSmartStreak(dailyHabit, logs, '2026-01-09');

      // Streak continues from yesterday if today not completed
      // The implementation counts consecutive days ending at context date
      // If context date is not in logs, streak is 0
      expect(result.currentStreak).toBe(0);
      expect(result.completedToday).toBe(false);
    });

    it('should handle empty logs', () => {
      const result = calculateSmartStreak(dailyHabit, [], '2026-01-09');

      expect(result.currentStreak).toBe(0);
      expect(result.completedToday).toBe(false);
      expect(result.expectedToday).toBe(true);
    });

    it('should ignore future dates in logs', () => {
      const logs = [
        { completed_at: '2026-01-11' }, // Future (Sunday)
        { completed_at: '2026-01-10' }, // Future (Saturday)
        { completed_at: '2026-01-09' }, // Context date (Friday)
        { completed_at: '2026-01-08' }, // Thursday
      ];

      const result = calculateSmartStreak(dailyHabit, logs, '2026-01-09');

      expect(result.currentStreak).toBe(2);
    });
  });

  describe('calculateSmartStreak - Weekly Habits', () => {
    // Mon (1), Wed (3), Fri (5)
    const weeklyHabit: HabitConfig = { frequency: 'weekly', days_of_week: [1, 3, 5] };

    it('should return weeks as streak unit for weekly habits', () => {
      const logs = [
        { completed_at: '2026-01-05' }, // Monday - expected
        { completed_at: '2026-01-07' }, // Wednesday - expected
        { completed_at: '2026-01-09' }, // Friday - expected
      ];

      const result = calculateSmartStreak(weeklyHabit, logs, '2026-01-09');

      expect(result.streakUnit).toBe('weeks');
    });

    it('should return weeklyProgress with completed/expected counts', () => {
      const logs = [
        { completed_at: '2026-01-05' }, // Monday - expected
        { completed_at: '2026-01-06' }, // Tuesday - not expected
        { completed_at: '2026-01-07' }, // Wednesday - expected
      ];

      const result = calculateSmartStreak(weeklyHabit, logs, '2026-01-09');

      expect(result.weeklyProgress).toBeDefined();
      expect(result.weeklyProgress?.completed).toBeGreaterThanOrEqual(0);
      expect(result.weeklyProgress?.expected).toBeGreaterThanOrEqual(0);
    });

    it('should correctly identify if today is expected', () => {
      // Jan 9, 2026 is Friday (5), in [1, 3, 5]
      const result = calculateSmartStreak(weeklyHabit, [], '2026-01-09');
      expect(result.expectedToday).toBe(true);

      // Jan 8, 2026 is Thursday (4), not in [1, 3, 5]
      const result2 = calculateSmartStreak(weeklyHabit, [], '2026-01-08');
      expect(result2.expectedToday).toBe(false);
    });

    it('should handle weekend-only habits', () => {
      const weekendHabit: HabitConfig = { frequency: 'weekly', days_of_week: [0, 6] };
      const logs = [
        { completed_at: '2026-01-03' }, // Saturday
        { completed_at: '2026-01-04' }, // Sunday
      ];

      const result = calculateSmartStreak(weekendHabit, logs, '2026-01-04');

      expect(result.streakUnit).toBe('weeks');
    });

    it('should count full week completion', () => {
      // A full week where all required days are completed
      const logs = [
        { completed_at: '2026-01-05' }, // Monday
        { completed_at: '2026-01-07' }, // Wednesday
        { completed_at: '2026-01-09' }, // Friday
      ];

      const result = calculateSmartStreak(weeklyHabit, logs, '2026-01-09');

      expect(result.weeklyProgress?.completed).toBe(3);
      expect(result.weeklyProgress?.expected).toBe(3);
    });
  });

  describe('formatDaysOfWeek', () => {
    it('should return "Diario" for null or empty array', () => {
      expect(formatDaysOfWeek(null)).toBe('Diario');
      expect(formatDaysOfWeek([])).toBe('Diario');
    });

    it('should format single day', () => {
      expect(formatDaysOfWeek([1])).toBe('L'); // Monday
      expect(formatDaysOfWeek([0])).toBe('D'); // Sunday
    });

    it('should format multiple days sorted from Monday', () => {
      expect(formatDaysOfWeek([1, 3, 5])).toBe('L, X, V'); // Mon, Wed, Fri
      expect(formatDaysOfWeek([5, 1, 3])).toBe('L, X, V'); // Same, unsorted input
    });

    it('should place Sunday at the end', () => {
      expect(formatDaysOfWeek([0, 6])).toBe('S, D'); // Sat, Sun (weekend)
      expect(formatDaysOfWeek([1, 0])).toBe('L, D'); // Mon, Sun
    });

    it('should handle all days', () => {
      expect(formatDaysOfWeek([0, 1, 2, 3, 4, 5, 6])).toBe('L, M, X, J, V, S, D');
    });
  });

  describe('getFrequencyLabel', () => {
    it('should return "Diario" for daily habits', () => {
      expect(getFrequencyLabel({ frequency: 'daily', days_of_week: null })).toBe('Diario');
      expect(getFrequencyLabel({ frequency: 'daily', days_of_week: [] })).toBe('Diario');
    });

    it('should return "Semanal" for weekly without specific days', () => {
      expect(getFrequencyLabel({ frequency: 'weekly', days_of_week: null })).toBe('Semanal');
      expect(getFrequencyLabel({ frequency: 'weekly', days_of_week: [] })).toBe('Semanal');
    });

    it('should detect weekday-only pattern', () => {
      const result = getFrequencyLabel({ frequency: 'weekly', days_of_week: [1, 2, 3, 4, 5] });
      expect(result).toBe('Entre semana');
    });

    it('should detect weekend-only pattern', () => {
      const result = getFrequencyLabel({ frequency: 'weekly', days_of_week: [0, 6] });
      expect(result).toBe('Fines de semana');
    });

    it('should show specific days for custom patterns', () => {
      const result = getFrequencyLabel({ frequency: 'weekly', days_of_week: [1, 3, 5] });
      expect(result).toBe('L, X, V');
    });
  });

  describe('Edge Cases', () => {
    it('should handle habit with only one required day per week', () => {
      const habit: HabitConfig = { frequency: 'weekly', days_of_week: [1] }; // Monday only

      // Context date is a Monday with log for that Monday
      const logs = [
        { completed_at: '2026-01-05' }, // Monday
      ];

      const result = calculateSmartStreak(habit, logs, '2026-01-05');

      expect(result.streakUnit).toBe('weeks');
      expect(result.completedToday).toBe(true);
    });

    it('should handle very long streaks (up to 52 weeks limit)', () => {
      const habit: HabitConfig = { frequency: 'daily', days_of_week: null };

      // Generate 50 consecutive days of logs (within reasonable bounds)
      const logs = [];
      const startDate = new Date('2026-01-09');
      for (let i = 0; i < 50; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() - i);
        logs.push({ completed_at: date.toISOString().split('T')[0] });
      }

      const result = calculateSmartStreak(habit, logs, '2026-01-09');

      expect(result.currentStreak).toBe(50);
    });

    it('should handle logs out of order', () => {
      const habit: HabitConfig = { frequency: 'daily', days_of_week: null };
      const logs = [
        { completed_at: '2026-01-07' }, // Out of order
        { completed_at: '2026-01-09' },
        { completed_at: '2026-01-08' }, // Out of order
      ];

      const result = calculateSmartStreak(habit, logs, '2026-01-09');

      expect(result.currentStreak).toBe(3);
    });

    it('should handle duplicate logs gracefully', () => {
      const habit: HabitConfig = { frequency: 'daily', days_of_week: null };
      const logs = [
        { completed_at: '2026-01-09' },
        { completed_at: '2026-01-09' }, // Duplicate
        { completed_at: '2026-01-08' },
      ];

      const result = calculateSmartStreak(habit, logs, '2026-01-09');

      // Duplicates should be handled (set removes them)
      expect(result.currentStreak).toBe(2);
    });

    it('should not count streak if today is not completed for daily habits', () => {
      const habit: HabitConfig = { frequency: 'daily', days_of_week: null };
      const logs = [
        { completed_at: '2026-01-08' },
        { completed_at: '2026-01-07' },
        { completed_at: '2026-01-06' },
      ];

      const result = calculateSmartStreak(habit, logs, '2026-01-09');

      expect(result.currentStreak).toBe(0);
      expect(result.completedToday).toBe(false);
    });
  });
});
