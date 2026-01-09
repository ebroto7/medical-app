"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { HABIT_COLORS, HabitColor, DEFAULT_HABIT_COLOR } from "@/lib/constants/habits";
import { isExpectedDay } from "@/lib/habits/streak-calculator";

interface HabitCalendarProps {
  completedDates: string[]; // ISO date strings (YYYY-MM-DD)
  selectedMonth: Date;
  onMonthChange: (date: Date) => void;
  color?: string;
  frequency?: "daily" | "weekly";
  daysOfWeek?: number[] | null;
}

export const HabitCalendar = React.memo(function HabitCalendar({
  completedDates,
  selectedMonth,
  onMonthChange,
  color = DEFAULT_HABIT_COLOR,
  frequency = "daily",
  daysOfWeek = null,
}: HabitCalendarProps) {
  const year = selectedMonth.getFullYear();
  const month = selectedMonth.getMonth();

  // Get days in month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  // Create array of days
  const days: (number | null)[] = [];
  // Fill empty slots for days before the 1st
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  // Fill actual days
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d);
  }

  // Create set for quick lookup
  const completedSet = new Set(completedDates);

  // Format date for comparison
  const formatDate = (day: number) => {
    const m = (month + 1).toString().padStart(2, "0");
    const d = day.toString().padStart(2, "0");
    return `${year}-${m}-${d}`;
  };

  // Check if a day is today
  const today = new Date();
  const isToday = (day: number) =>
    day === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear();

  // Navigation
  const goToPrevMonth = () => {
    onMonthChange(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    onMonthChange(new Date(year, month + 1, 1));
  };

  const monthName = selectedMonth.toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });

  const habitColor = HABIT_COLORS[color as HabitColor] || HABIT_COLORS[DEFAULT_HABIT_COLOR];

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={goToPrevMonth}
          className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Mes anterior"
        >
          ←
        </button>
        <span className="font-medium capitalize">{monthName}</span>
        <button
          onClick={goToNextMonth}
          className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Mes siguiente"
        >
          →
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {["D", "L", "M", "X", "J", "V", "S"].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="aspect-square" />;
          }

          const dateStr = formatDate(day);
          const isCompleted = completedSet.has(dateStr);
          const isTodayDate = isToday(day);
          const isExpected = isExpectedDay(dateStr, { frequency, days_of_week: daysOfWeek });
          const isWeeklyHabit = frequency === "weekly" && daysOfWeek && daysOfWeek.length > 0;

          return (
            <div
              key={day}
              className={cn(
                "aspect-square rounded-lg flex items-center justify-center text-sm transition-all",
                // Completed state (highest priority)
                isCompleted && habitColor.bg,
                isCompleted && "text-white font-medium",
                // Today indicator
                isTodayDate && !isCompleted && `ring-2 ${habitColor.ring} ring-inset`,
                // Expected day (not completed) - show with subtle indicator
                !isCompleted && isExpected && !isTodayDate && "text-foreground bg-muted/50",
                // Not expected day (for weekly habits only)
                !isCompleted && !isExpected && isWeeklyHabit && "text-muted-foreground/40",
                // Default: daily habit or fallback
                !isCompleted && !isWeeklyHabit && !isTodayDate && "text-muted-foreground"
              )}
              title={isWeeklyHabit && !isExpected ? "No programado este día" : undefined}
            >
              {day}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-2 flex-wrap">
        <div className="flex items-center gap-1">
          <div className={cn("w-3 h-3 rounded", habitColor.bg)} />
          <span>Completado</span>
        </div>
        <div className="flex items-center gap-1">
          <div className={cn("w-3 h-3 rounded ring-2 ring-inset", habitColor.ring)} />
          <span>Hoy</span>
        </div>
        {frequency === "weekly" && daysOfWeek && daysOfWeek.length > 0 && (
          <>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-muted/50" />
              <span>Programado</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-muted/20" />
              <span>No programado</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
});
