"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Habit } from "@/components/habits/HabitCard";
import { HABIT_COLORS, DEFAULT_HABIT_COLOR } from "@/lib/constants/habits";
import { Lock, Globe } from "lucide-react";

// Categorized emojis for better selection
const EMOJI_CATEGORIES = {
  "Populares": ["✓", "💧", "🏃", "📚", "🧘", "💊", "🥗", "😴"],
  "Salud": ["🩺", "🦷", "🧠", "❤️", "🩹", "🧬", "⚕️", "🏥"],
  "Alimentación": ["🍎", "🍌", "🥦", "🥕", "🥑", "🍳", "☕", "🍵", "🥤", "🍇"],
  "Actividad": ["🚶", "🏃", "🏋️", "🚴", "🏊", "🤸", "💪", "⚡"],
  "Bienestar": ["☀️", "🌙", "🛁", "🧴", "📔", "🎵", "🎨", "🎯"]
};

interface CreateHabitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; icon: string; color: string; is_private: boolean }) => Promise<void>;
  editingHabit?: Habit | null;
  hidePrivacy?: boolean;
}

export function CreateHabitDialog({
  open,
  onOpenChange,
  onSubmit,
  editingHabit,
  hidePrivacy = false,
}: CreateHabitDialogProps) {
  const [name, setName] = useState(editingHabit?.name || "");
  const [icon, setIcon] = useState(editingHabit?.icon || "✓");
  const [color, setColor] = useState(editingHabit?.color || DEFAULT_HABIT_COLOR);
  const [isPrivate, setIsPrivate] = useState(editingHabit?.is_private || false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when dialog opens/closes or editing habit changes
  React.useEffect(() => {
    if (open) {
      setName(editingHabit?.name || "");
      setIcon(editingHabit?.icon || "✓");
      setColor(editingHabit?.color || DEFAULT_HABIT_COLOR);
      setIsPrivate(hidePrivacy ? false : (editingHabit?.is_private || false));
    }
  }, [open, editingHabit, hidePrivacy]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), icon, color, is_private: isPrivate });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingHabit ? "Editar hábito" : "Nuevo hábito"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="habit-name">Nombre del hábito</Label>
            <Input
              id="habit-name"
              placeholder="Ej: Beber 2L de agua"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              maxLength={100}
            />
          </div>

          {/* Icon picker */}
          <div className="space-y-2">
            <Label>Icono</Label>
            <div className="flex flex-wrap gap-2">
              {!Object.values(EMOJI_CATEGORIES).flat().includes(icon) && (
                <button
                  type="button"
                  className="w-10 h-10 rounded-lg text-lg flex items-center justify-center bg-primary/20 ring-2 ring-primary transition-all"
                >
                  {icon}
                </button>
              )}

              {EMOJI_CATEGORIES["Populares"].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={cn(
                    "w-10 h-10 rounded-lg text-lg flex items-center justify-center transition-all",
                    icon === emoji
                      ? "bg-primary/20 ring-2 ring-primary"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  {emoji}
                </button>
              ))}

              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "w-10 h-10 rounded-lg text-lg flex items-center justify-center transition-all bg-muted hover:bg-muted/80"
                    )}
                    title="Más emojis"
                  >
                    +
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4" align="start">
                  <div className="space-y-4">
                    <div className="space-y-2">
                       <Label className="text-xs text-muted-foreground">Manual</Label>
                       <Input 
                        placeholder="Escribe o pega un emoji..." 
                        maxLength={2}
                        className="text-center text-xl h-12"
                        onChange={(e) => {
                          if(e.target.value) setIcon(e.target.value)
                        }}
                       />
                    </div>
                    
                    <div className="h-[200px] overflow-y-auto space-y-4 pr-2">
                      {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
                        <div key={category}>
                          <Label className="text-xs text-muted-foreground mb-2 block">{category}</Label>
                          <div className="grid grid-cols-6 gap-2">
                            {emojis.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => setIcon(emoji)}
                                className={cn(
                                  "w-8 h-8 rounded-md text-base flex items-center justify-center transition-all",
                                  icon === emoji
                                    ? "bg-primary/20 text-primary"
                                    : "hover:bg-muted"
                                )}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Color picker */}
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(HABIT_COLORS).map(([key, value]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setColor(key)}
                  className={cn(
                    "w-8 h-8 rounded-full transition-all",
                    value.bg,
                    color === key
                      ? "ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110"
                      : "opacity-60 hover:opacity-100"
                  )}
                  title={value.label}
                />
              ))}
            </div>
          </div>

          {/* Privacy Toggle changed to Tabs */}
          {!hidePrivacy && (
            <div className="space-y-3">
               <Label>Privacidad</Label>
               <Tabs 
                 value={isPrivate ? "private" : "public"} 
                 onValueChange={(v) => setIsPrivate(v === "private")}
                 className="w-full"
               >
                 <TabsList className="grid w-full grid-cols-2">
                   <TabsTrigger value="public" className="gap-2">
                     <Globe className="w-4 h-4" /> Público
                   </TabsTrigger>
                   <TabsTrigger value="private" className="gap-2">
                     <Lock className="w-4 h-4" /> Privado
                   </TabsTrigger>
                 </TabsList>
               </Tabs>
               <p className="text-xs text-muted-foreground">
                  {isPrivate 
                    ? "Solo tú podrás ver este hábito y su progreso." 
                    : "Tu nutricionista podrá ver este hábito y ayudarte en el seguimiento."}
               </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting
                ? "Guardando..."
                : editingHabit
                ? "Guardar cambios"
                : "Crear hábito"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
