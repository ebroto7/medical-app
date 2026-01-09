"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Flame, MoreVertical, Pencil, Trash2, Lock, Globe, MessageSquare, Stethoscope, Calendar, CalendarDays, AlertTriangle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  streakUnit?: "days" | "weeks";
  completedToday: boolean;
  expectedToday?: boolean;
  frequencyLabel?: string;
  weeklyProgress?: {
    completed: number;
    expected: number;
    days: { day: number; completed: boolean; expected: boolean }[];
  };
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isSavingComment, setIsSavingComment] = useState(false);

  // Sync state when props change (navigation)
  useEffect(() => {
    setLocalCompleted(habit.completedToday);
  }, [habit.completedToday]);

  const handleDelete = () => {
    setIsDeleting(true);
    // Call onDelete - it may be sync or async
    Promise.resolve(onDelete(habit.id))
      .then(() => {
        setShowDeleteConfirm(false);
      })
      .finally(() => {
        setIsDeleting(false);
      });
  };

  const handleOpenCommentDialog = () => {
    const existingComment = habit.logsThisMonth.find(l => l.comment)?.comment || "";
    setCommentText(existingComment);
    setShowCommentDialog(true);
  };

  const handleSaveComment = () => {
    setIsSavingComment(true);
    Promise.resolve(onComment(habit.id, commentText))
      .then(() => {
        setShowCommentDialog(false);
      })
      .finally(() => {
        setIsSavingComment(false);
      });
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

      {/* Frequency & Streak Badges */}
      <div className="flex items-center gap-2">
        {/* Frequency Badge */}
        {habit.frequencyLabel && habit.frequency === "weekly" && (
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground"
            title={`Frecuencia: ${habit.frequencyLabel}`}
          >
            <CalendarDays className="h-3 w-3" />
            <span>{habit.frequencyLabel}</span>
          </div>
        )}

        {/* Weekly Progress (for weekly habits) */}
        {habit.weeklyProgress && habit.frequency === "weekly" && (
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground"
            title={`Esta semana: ${habit.weeklyProgress.completed}/${habit.weeklyProgress.expected} días`}
          >
            <span>{habit.weeklyProgress.completed}/{habit.weeklyProgress.expected}</span>
          </div>
        )}

        {/* Streak Badge */}
        {habit.currentStreak > 0 && (
          <div
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium bg-background/50",
              colorConfig.text
            )}
            title={habit.streakUnit === "weeks"
              ? `${habit.currentStreak} semana${habit.currentStreak > 1 ? 's' : ''} consecutiva${habit.currentStreak > 1 ? 's' : ''}`
              : `${habit.currentStreak} día${habit.currentStreak > 1 ? 's' : ''} consecutivo${habit.currentStreak > 1 ? 's' : ''}`
            }
          >
            <Flame className="h-4 w-4" />
            <span>{habit.currentStreak}{habit.streakUnit === "weeks" ? "s" : "d"}</span>
          </div>
        )}

        {/* Not expected today indicator */}
        {habit.expectedToday === false && !localCompleted && (
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-muted/50 text-muted-foreground/60"
            title="Este hábito no está programado para hoy"
          >
            <Calendar className="h-3 w-3" />
            <span>No programado</span>
          </div>
        )}
      </div>

      {/* Actions Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-background/50">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleOpenCommentDialog}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Comentar
          </DropdownMenuItem>
            {isAuthor && (
              <>
                <DropdownMenuItem onClick={() => onEdit(habit)} className="gap-2">
                  <Pencil size={14} /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowDeleteConfirm(true)}
                  className="gap-2 text-destructive focus:text-destructive"
                >
                  <Trash2 size={14} /> Eliminar
                </DropdownMenuItem>
              </>
            )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <DialogTitle>Eliminar hábito</DialogTitle>
            </div>
            <DialogDescription className="pt-2">
              ¿Estás seguro de que quieres eliminar <strong>{habit.name}</strong>?
              <br />
              <span className="text-destructive/80">Se perderá todo el historial de completados y rachas.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comment Dialog */}
      <Dialog open={showCommentDialog} onOpenChange={setShowCommentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{habit.icon}</span>
              <div>
                <DialogTitle>Comentario</DialogTitle>
                <DialogDescription>{habit.name}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="comment">Tu comentario</Label>
              <Textarea
                id="comment"
                placeholder="Añade notas sobre este hábito..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                maxLength={500}
                rows={4}
                className="resize-none"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Puedes añadir observaciones o notas personales</span>
                <span>{commentText.length}/500</span>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowCommentDialog(false)}
              disabled={isSavingComment}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveComment}
              disabled={isSavingComment}
            >
              {isSavingComment ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
});
