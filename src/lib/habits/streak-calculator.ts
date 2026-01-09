/**
 * Smart Streak Calculator for Habits
 *
 * Handles both daily and weekly habits correctly:
 * - Daily: Counts consecutive days completed
 * - Weekly: Counts consecutive weeks where required days were met
 */

export interface HabitConfig {
  frequency: "daily" | "weekly";
  days_of_week: number[] | null; // 0=Sunday, 1=Monday, ..., 6=Saturday
}

export interface StreakResult {
  currentStreak: number;
  streakUnit: "days" | "weeks";
  completedToday: boolean;
  expectedToday: boolean;
  // For weekly habits: progress this week
  weeklyProgress?: {
    completed: number;
    expected: number;
    days: { day: number; completed: boolean; expected: boolean }[];
  };
  // Best streak ever (if we have enough data)
  bestStreak?: number;
}

/**
 * Get the day of week (0-6) from a date string YYYY-MM-DD
 */
function getDayOfWeek(dateStr: string): number {
  const date = new Date(dateStr + "T00:00:00");
  return date.getDay();
}

/**
 * Get the start of the week (Monday) for a given date
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday is start
  return new Date(d.setDate(diff));
}

/**
 * Format date as YYYY-MM-DD (preserving local date)
 * Uses local year/month/day to avoid timezone shifts
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Check if a specific date should have the habit completed based on config
 */
export function isExpectedDay(dateStr: string, habit: HabitConfig): boolean {
  if (habit.frequency === "daily") {
    return true;
  }

  if (habit.frequency === "weekly" && habit.days_of_week?.length) {
    const dayOfWeek = getDayOfWeek(dateStr);
    return habit.days_of_week.includes(dayOfWeek);
  }

  // Default: daily behavior
  return true;
}

/**
 * Calculate streak for a DAILY habit
 * Counts consecutive days completed up to contextDate
 */
function calculateDailyStreak(
  logs: string[], // Array of YYYY-MM-DD dates, sorted most recent first
  contextDateStr: string
): number {
  let streak = 0;
  const checkDate = new Date(contextDateStr + "T00:00:00");

  for (const logDate of logs) {
    if (logDate > contextDateStr) continue; // Skip future dates

    const checkStr = formatDate(checkDate);
    if (logDate === checkStr) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (logDate < checkStr) {
      // Gap detected - streak broken
      break;
    }
  }

  return streak;
}

/**
 * Calculate streak for a WEEKLY habit
 * Counts consecutive weeks where ALL required days were completed
 */
function calculateWeeklyStreak(
  logs: string[], // Array of YYYY-MM-DD dates
  contextDateStr: string,
  requiredDays: number[] // e.g., [1, 3, 5] for Mon/Wed/Fri
): number {
  if (!requiredDays.length) {
    // No specific days required - treat as daily
    return calculateDailyStreak(logs, contextDateStr);
  }

  const logSet = new Set(logs);
  const contextDate = new Date(contextDateStr + "T00:00:00");
  let weekStart = getWeekStart(contextDate);
  let streak = 0;

  // Check up to 52 weeks back (1 year)
  for (let weekIdx = 0; weekIdx < 52; weekIdx++) {
    let allRequiredCompleted = true;
    let hasAnyLogThisWeek = false;

    for (const requiredDay of requiredDays) {
      // Calculate the date for this required day in this week
      const dayDate = new Date(weekStart);
      // weekStart is Monday (day 1), so adjust for Sunday (0)
      const offset = requiredDay === 0 ? 6 : requiredDay - 1;
      dayDate.setDate(dayDate.getDate() + offset);

      const dayStr = formatDate(dayDate);

      // Don't count future days as missing
      if (dayStr > contextDateStr) {
        continue;
      }

      if (logSet.has(dayStr)) {
        hasAnyLogThisWeek = true;
      } else {
        allRequiredCompleted = false;
      }
    }

    // Current week: partial completion is OK (week not finished yet)
    if (weekIdx === 0) {
      // For current week, just check if we're on track (no misses so far)
      const today = getDayOfWeek(contextDateStr);
      let onTrack = true;

      for (const requiredDay of requiredDays) {
        // Only check days that have already passed
        const dayDate = new Date(weekStart);
        const offset = requiredDay === 0 ? 6 : requiredDay - 1;
        dayDate.setDate(dayDate.getDate() + offset);
        const dayStr = formatDate(dayDate);

        if (dayStr <= contextDateStr && !logSet.has(dayStr)) {
          onTrack = false;
          break;
        }
      }

      if (onTrack && hasAnyLogThisWeek) {
        streak++;
      } else if (!onTrack) {
        break;
      }
    } else {
      // Past weeks: must have completed ALL required days
      if (allRequiredCompleted && requiredDays.length > 0) {
        streak++;
      } else {
        break;
      }
    }

    // Move to previous week
    weekStart.setDate(weekStart.getDate() - 7);
  }

  return streak;
}

/**
 * Get weekly progress for the current week
 */
function getWeeklyProgress(
  logs: string[],
  contextDateStr: string,
  requiredDays: number[]
): StreakResult["weeklyProgress"] {
  const logSet = new Set(logs);
  const contextDate = new Date(contextDateStr + "T00:00:00");
  const weekStart = getWeekStart(contextDate);

  const days: { day: number; completed: boolean; expected: boolean }[] = [];
  let completed = 0;
  let expected = 0;

  // Check each day of the week (Mon-Sun)
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(weekStart);
    dayDate.setDate(dayDate.getDate() + i);
    const dayStr = formatDate(dayDate);
    const dayOfWeek = (i + 1) % 7; // Convert to 0=Sunday format

    const isExpected = requiredDays.includes(dayOfWeek);
    const isCompleted = logSet.has(dayStr);

    // Only count days up to context date
    if (dayStr <= contextDateStr) {
      if (isExpected) expected++;
      if (isCompleted && isExpected) completed++;
    }

    days.push({
      day: dayOfWeek,
      completed: isCompleted,
      expected: isExpected,
    });
  }

  return { completed, expected, days };
}

/**
 * Main function: Calculate smart streak for any habit
 */
export function calculateSmartStreak(
  habit: HabitConfig,
  logs: { completed_at: string }[],
  contextDateStr: string
): StreakResult {
  // Extract and sort log dates (most recent first)
  const sortedLogs = logs
    .map((l) => l.completed_at)
    .filter((d) => d <= contextDateStr)
    .sort((a, b) => b.localeCompare(a));

  const completedToday = sortedLogs.includes(contextDateStr);
  const expectedToday = isExpectedDay(contextDateStr, habit);

  if (habit.frequency === "daily" || !habit.days_of_week?.length) {
    // Daily habit or weekly without specific days
    return {
      currentStreak: calculateDailyStreak(sortedLogs, contextDateStr),
      streakUnit: "days",
      completedToday,
      expectedToday,
    };
  }

  // Weekly habit with specific days
  const currentStreak = calculateWeeklyStreak(
    sortedLogs,
    contextDateStr,
    habit.days_of_week
  );

  const weeklyProgress = getWeeklyProgress(
    sortedLogs,
    contextDateStr,
    habit.days_of_week
  );

  return {
    currentStreak,
    streakUnit: "weeks",
    completedToday,
    expectedToday,
    weeklyProgress,
  };
}

/**
 * Format days_of_week as human readable string
 * e.g., [1, 3, 5] -> "L, X, V" (Spanish)
 */
export function formatDaysOfWeek(days: number[] | null): string {
  if (!days?.length) return "Diario";

  const dayNames = ["D", "L", "M", "X", "J", "V", "S"]; // Spanish abbreviations
  const sorted = [...days].sort((a, b) => {
    // Sort starting from Monday (1) to Sunday (0)
    const aVal = a === 0 ? 7 : a;
    const bVal = b === 0 ? 7 : b;
    return aVal - bVal;
  });

  return sorted.map((d) => dayNames[d]).join(", ");
}

/**
 * Get a descriptive label for the habit frequency
 */
export function getFrequencyLabel(habit: HabitConfig): string {
  if (habit.frequency === "daily") {
    return "Diario";
  }

  if (!habit.days_of_week?.length) {
    return "Semanal";
  }

  // Check for common patterns
  const days = new Set(habit.days_of_week);

  // Weekdays only (Mon-Fri)
  if (days.size === 5 && [1, 2, 3, 4, 5].every((d) => days.has(d))) {
    return "Entre semana";
  }

  // Weekends only (Sat-Sun)
  if (days.size === 2 && days.has(0) && days.has(6)) {
    return "Fines de semana";
  }

  // Specific days
  return formatDaysOfWeek(habit.days_of_week);
}
