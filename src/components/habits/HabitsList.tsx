"use client";

import React from "react";
import { HabitCard, Habit } from "./HabitCard";
import { Target } from "lucide-react";

interface HabitsListProps {
  habits: Habit[];
  onToggle: (habitId: string, completed: boolean, date?: string) => Promise<void>;
  onEdit: (habit: Habit) => void;
  onDelete: (habitId: string) => void;
  isLoading?: boolean;
  dateLabel?: string;
}

export const HabitsList = React.memo(function HabitsList({
  habits,
  onToggle,
  onEdit,
  onDelete,
  isLoading,
  dateLabel = "Hoy",
}: HabitsListProps) {
  if (habits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <Target className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-lg mb-1">Sin hábitos todavía</h3>
        <p className="text-muted-foreground text-sm max-w-xs">
          Crea tu primer hábito para empezar a construir mejores rutinas
        </p>
      </div>
    );
  }

  // Count completed habits for today
  const completedCount = habits.filter((h) => h.completedToday).length;
  const totalCount = habits.length;

  return (
    <div className="space-y-4">
      {/* Progress summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
        <span>{dateLabel}</span>
        <span className="font-medium">
          {completedCount}/{totalCount} completados
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${(completedCount / totalCount) * 100}%` }}
        />
      </div>

      {/* Habit cards */}
      <div className="space-y-3">
        {habits.map((habit) => (
          <HabitCard
            key={habit.id}
            habit={habit}
            onToggle={onToggle}
            onEdit={onEdit}
            onDelete={onDelete}
            isLoading={isLoading}
          />
        ))}
      </div>
    </div>
  );
});
