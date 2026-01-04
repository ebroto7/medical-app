"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Flame, MoreVertical, Pencil, Trash2, Lock, Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { HABIT_COLORS, HabitColor, DEFAULT_HABIT_COLOR } from "@/lib/constants/habits";

export interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  frequency: string;
  days_of_week: number[] | null;
  is_active: boolean;
  currentStreak: number;
  completedToday: boolean;
  logsThisMonth: { completed_at: string }[];
  is_private?: boolean;
  created_by?: string;
  user_id?: string;
}

interface HabitCardProps {
  habit: Habit;
  onToggle: (habitId: string, completed: boolean, date?: string) => Promise<void>;
  onEdit: (habit: Habit) => void;
  onDelete: (habitId: string) => void;
  isLoading?: boolean;
}

export const HabitCard = React.memo(function HabitCard({
  habit,
  onToggle,
  onEdit,
  onDelete,
  isLoading,
}: HabitCardProps) {
  const [localCompleted, setLocalCompleted] = useState(habit.completedToday);
  const [animating, setAnimating] = useState(false);

  // Sync state when props change (navigation)
  useEffect(() => {
    setLocalCompleted(habit.completedToday);
  }, [habit.completedToday]);

  // Use centralized colors logic safely
  // Specific styles for completed state
  // Define explicit type to bypass inference issues
  interface ColorDefinition {
    label: string;
    bg: string;
    text: string;
    ring: string;
    softBg?: string; // Optional in case older definitions exist
    border?: string;
  }

  const habitColor = habit.color;
  const safeColorKey = (habitColor in HABIT_COLORS) 
    ? (habitColor as HabitColor) 
    : DEFAULT_HABIT_COLOR;
  
  // Force cast to avoid "never" type inference
  const colorConfig = HABIT_COLORS[safeColorKey as keyof typeof HABIT_COLORS] as unknown as ColorDefinition;

  // Specific styles for completed state
  const completedBg = colorConfig.bg;
  const completedText = "text-white"; 
  
  // Styles from centralized config
  const cardBg = colorConfig.softBg || (colorConfig.bg + "/10");
  const cardBorder = colorConfig.border || "";

  const handleToggle = async () => {
    if (isLoading) return;

    // Optimistic update
    const newCompleted = !localCompleted;
    setLocalCompleted(newCompleted);
    setAnimating(true);

    try {
      await onToggle(habit.id, newCompleted);
    } catch {
      // Revert on error
      setLocalCompleted(!newCompleted);
    } finally {
      setTimeout(() => setAnimating(false), 300);
    }
  };

  return (
    <Card
      className={cn(
        "p-4 flex items-center gap-4 transition-all duration-200 border-l-4",
        cardBg, // Fondo suave siempre
        cardBorder // Borde izquierdo de color
      )}
    >
      {/* Check Button */}
      <button
        onClick={handleToggle}
        disabled={isLoading}
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-200",
          localCompleted
            ? cn(completedBg, completedText, "border-transparent")
            : `border-muted-foreground/30 hover:border-muted-foreground/50 bg-background`, // Fondo blanco para check no completado para contraste
          animating && "scale-110"
        )}
        aria-label={localCompleted ? "Desmarcar hábito" : "Marcar hábito como completado"}
      >
        {localCompleted && <Check className="h-5 w-5" strokeWidth={3} />}
      </button>

      {/* Habit Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">{habit.icon}</span>
          <span
            className={cn(
              "font-medium truncate flex items-center gap-2",
              localCompleted && "text-muted-foreground line-through"
            )}
          >
            {habit.name}
            {habit.is_private ? (
              <span title="Privado (Solo tú)" className="text-muted-foreground/60">
                <Lock className="h-3 w-3" />
              </span>
            ) : (
               <span title="Público" className="text-muted-foreground/60">
                 <Globe className="h-3 w-3" />
               </span>
            )}
          </span>
        </div>
      </div>

      {/* Streak Badge */}
      {habit.currentStreak > 0 && (
        <div
          className={cn(
            "flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium bg-background/50", // Fondo semi transparente sobre el fondo de tarjeta
            colorConfig.text
          )}
        >
          <Flame className="h-4 w-4" />
          <span>{habit.currentStreak}</span>
        </div>
      )}

      {/* Actions Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-background/50">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(habit)}>
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onDelete(habit.id)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Card>
  );
});
