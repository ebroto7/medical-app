"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Flame, MoreVertical, Pencil, Trash2, Lock, Globe, MessageSquare, Stethoscope } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { HABIT_COLORS, HabitColor, DEFAULT_HABIT_COLOR } from "@/lib/constants/habits";
import { useAuth } from "@/contexts/AuthContext";

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
  logsThisMonth: { completed_at: string; comment?: string }[];
  is_private?: boolean;
  created_by?: string;
  user_id?: string;
}

interface HabitCardProps {
  habit: Habit;
  onToggle: (habitId: string, completed: boolean, date?: string) => Promise<void>;
  onComment: (habitId: string, comment: string, date?: string) => Promise<void>;
  onEdit: (habit: Habit) => void;
  onDelete: (habitId: string) => void;
  readOnly?: boolean;
  isLoading?: boolean;
}

export const HabitCard = React.memo(function HabitCard({
  habit,
  onToggle,
  onEdit,
  onDelete,
  onComment,
  readOnly,
  isLoading,
}: HabitCardProps) {
  const { user } = useAuth();
  const [localCompleted, setLocalCompleted] = useState(habit.completedToday);
  const [animating, setAnimating] = useState(false);

  // Sync state when props change (navigation)
  useEffect(() => {
    setLocalCompleted(habit.completedToday);
  }, [habit.completedToday]);

  const handleComment = () => {
    const existingComment = habit.logsThisMonth.find(l => l.comment)?.comment || "";
    const comment = window.prompt("Añade un comentario sobre este hábito:", existingComment);
    if (comment !== null) {
      onComment(habit.id, comment);
    }
  };

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
    if (readOnly || isLoading) return;

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

  const isAuthor = habit.created_by 
    ? habit.created_by === user?.id 
    : habit.user_id === user?.id;

  const isProfessionalHabit = habit.created_by && habit.created_by !== habit.user_id;

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
        disabled={isLoading || readOnly}
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-200",
          readOnly && "cursor-default opacity-80",
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
          <div className="flex items-center gap-2">
            <h3 className={cn(
              "font-medium transition-all duration-300",
              localCompleted && "text-muted-foreground"
            )}>
              {habit.name}
            </h3>
            {isProfessionalHabit && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 border border-blue-200" title="Hábito asignado por tu nutricionista">
                <Stethoscope size={12} className="shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-wider">PRO</span>
              </span>
            )}
          </div>
          {habit.is_private ? (
              <span title="Privado (Solo tú)" className="text-muted-foreground/60">
                <Lock className="h-3 w-3" />
              </span>
            ) : (
               <span title="Público" className="text-muted-foreground/60">
                 <Globe className="h-3 w-3" />
               </span>
            )}
        </div>
        {/* Comment area */}
        {(() => {
          const logWithComment = habit.logsThisMonth.find(l => l.comment);
          if (logWithComment?.comment) {
            return (
              <div className="flex items-start gap-1.5 mt-1 text-xs text-muted-foreground ml-7">
                <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                <p className="italic line-clamp-1 truncate">{logWithComment.comment}</p>
              </div>
            );
          }
          return null;
        })()}
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
          <DropdownMenuItem onClick={handleComment}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Comentar
          </DropdownMenuItem>
            {isAuthor && (
              <>
                <DropdownMenuItem onClick={() => onEdit(habit)} className="gap-2">
                  <Pencil size={14} /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete(habit.id)} 
                  className="gap-2 text-destructive focus:text-destructive"
                >
                  <Trash2 size={14} /> Eliminar
                </DropdownMenuItem>
              </>
            )}
        </DropdownMenuContent>
      </DropdownMenu>
    </Card>
  );
});
