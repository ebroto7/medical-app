"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Habit } from "./HabitCard";
import { HABIT_COLORS, HabitColor, DEFAULT_HABIT_COLOR } from "@/lib/constants/habits";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface HabitHeatmapProps {
  habits: Habit[];
  currentDate: Date;
  onToggle: (habitId: string, completed: boolean, date?: string) => Promise<void>;
}

export function HabitHeatmap({
  habits,
  currentDate,
  onToggle,
}: HabitHeatmapProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get days in month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Format date helper
  const formatDate = (day: number) => {
    const m = (month + 1).toString().padStart(2, "0");
    const d = day.toString().padStart(2, "0");
    return `${year}-${m}-${d}`;
  };

  const today = new Date();
  const isToday = (day: number) =>
    day === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear();

  return (
    <div className="overflow-x-auto pb-4">
      <div className="min-w-[800px]"> {/* Ensure minimum width for grid */}
        {/* Header Row (Days) */}
        <div className="flex mb-2">
          <div className="w-48 flex-shrink-0" /> {/* Spacer for habit names */}
          <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(0, 1fr))` }}>
            {days.map((day) => (
              <div 
                key={day} 
                className={cn(
                  "text-center text-xs text-muted-foreground py-1",
                  isToday(day) && "text-foreground font-bold"
                )}
              >
                {day}
              </div>
            ))}
          </div>
        </div>

        {/* Habits Rows */}
        <div className="space-y-2">
          {habits.map((habit) => {
            const completedDates = new Set(habit.logsThisMonth.map(l => l.completed_at));
            const colorConfig = HABIT_COLORS[habit.color as HabitColor] || HABIT_COLORS[DEFAULT_HABIT_COLOR];

            return (
              <div key={habit.id} className="flex items-center group">
                {/* Habit Name Column */}
                <div className="w-48 flex-shrink-0 pr-4 flex items-center gap-2 overflow-hidden">
                  <span className="text-xl">{habit.icon}</span>
                  <span className="text-sm font-medium truncate" title={habit.name}>
                    {habit.name}
                  </span>
                </div>

                {/* Heatmap Grid for this habit */}
                <div className="flex-1 grid gap-1" style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(0, 1fr))` }}>
                  {days.map((day) => {
                    const dateStr = formatDate(day);
                    const isCompleted = completedDates.has(dateStr);
                    const isCurrentDay = isToday(day);

                    return (
                      <TooltipProvider key={day}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => onToggle(habit.id, !isCompleted, dateStr)}
                              className={cn(
                                "aspect-square rounded-sm transition-all duration-200",
                                isCompleted 
                                  ? colorConfig.bg 
                                  : "bg-muted/40 hover:bg-muted",
                                isCurrentDay && !isCompleted && `ring-1 ring-inset ${colorConfig.ring}`,
                                "opacity-80 hover:opacity-100"
                              )}
                              aria-label={`${habit.name} - ${day}`}
                            />
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p className="text-xs">
                              {day} {currentDate.toLocaleDateString("es-ES", { month: "short" })}: {isCompleted ? "Completado" : "Pendiente"}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
