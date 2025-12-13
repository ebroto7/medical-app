"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  PlanMealType,
  PLAN_MEAL_TYPE_CONFIG,
  PLAN_MEAL_TYPES,
  DAYS_OF_WEEK,
  getMealTypeLabel,
} from "@/config/meal-plan-types";

interface WeeklySlot {
  id: string;
  day_of_week: number;
  meal_type: PlanMealType;
  meal_name: string;
  description?: string;
  notes?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

interface MealPlanData {
  id: string;
  name: string;
  description?: string;
  weekly_slots?: WeeklySlot[];
}

interface EditWeeklyPlanDialogProps {
  plan: MealPlanData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

export function EditWeeklyPlanDialog({
  plan,
  open,
  onOpenChange,
  onUpdated,
}: EditWeeklyPlanDialogProps) {
  const { token } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [slots, setSlots] = useState<WeeklySlot[]>([]);
  const [selectedDay, setSelectedDay] = useState<number>(0);
  const [selectedMealType, setSelectedMealType] = useState<PlanMealType>("breakfast");

  useEffect(() => {
    if (open && plan.weekly_slots) {
      // Clone the slots with new IDs for local state
      setSlots(plan.weekly_slots.map(s => ({ ...s })));
    }
  }, [open, plan]);

  const addSlot = () => {
    const newSlot: WeeklySlot = {
      id: crypto.randomUUID(),
      day_of_week: selectedDay,
      meal_type: selectedMealType,
      meal_name: "",
    };
    setSlots([...slots, newSlot]);
  };

  const updateSlot = (id: string, updates: Partial<WeeklySlot>) => {
    setSlots(slots.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const removeSlot = (id: string) => {
    setSlots(slots.filter(s => s.id !== id));
  };

  const handleSave = async () => {
    if (slots.length === 0 || slots.some(s => !s.meal_name.trim())) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/meal-plans/${plan.id}/slots`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          weekly_slots: slots.map(({ id, ...slot }) => slot),
        }),
      });

      if (res.ok) {
        onUpdated();
        onOpenChange(false);
      } else {
        const data = await res.json();
        alert(data.error || "Error al guardar los cambios");
      }
    } catch (error) {
      console.error("Error updating plan:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Group slots by day
  const slotsByDay = DAYS_OF_WEEK.map(day => ({
    ...day,
    slots: slots
      .filter(s => s.day_of_week === day.value)
      .sort((a, b) =>
        PLAN_MEAL_TYPE_CONFIG[a.meal_type].sortOrder - PLAN_MEAL_TYPE_CONFIG[b.meal_type].sortOrder
      ),
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Pauta Semanal</DialogTitle>
          <p className="text-sm text-muted-foreground">{plan.name}</p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add Slot Controls */}
          <div className="flex flex-wrap items-end gap-3 p-4 bg-muted/50 rounded-lg">
            <div>
              <label className="block text-sm font-medium mb-1">Dia</label>
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(Number(e.target.value))}
                className="rounded-md border border-input bg-background px-3 py-2"
              >
                {DAYS_OF_WEEK.map((day) => (
                  <option key={day.value} value={day.value}>{day.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Comida</label>
              <select
                value={selectedMealType}
                onChange={(e) => setSelectedMealType(e.target.value as PlanMealType)}
                className="rounded-md border border-input bg-background px-3 py-2"
              >
                {PLAN_MEAL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {PLAN_MEAL_TYPE_CONFIG[type].emoji} {PLAN_MEAL_TYPE_CONFIG[type].label}
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={addSlot} variant="outline">
              <Plus className="h-4 w-4 mr-1" /> Anadir comida
            </Button>
          </div>

          {/* Weekly Grid */}
          <div className="space-y-4">
            {slotsByDay.map((day) => (
              day.slots.length > 0 && (
                <div key={day.value} className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <span className="bg-primary text-primary-foreground px-2 py-1 rounded text-sm">
                      {day.short}
                    </span>
                    {day.label}
                  </h3>
                  <div className="space-y-3">
                    {day.slots.map((slot) => (
                      <div key={slot.id} className="flex gap-3 items-start p-3 bg-muted/30 rounded-md">
                        <div className="text-2xl">
                          {PLAN_MEAL_TYPE_CONFIG[slot.meal_type].emoji}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground">
                              {getMealTypeLabel(slot.meal_type)}
                            </span>
                          </div>
                          <Input
                            value={slot.meal_name}
                            onChange={(e) => updateSlot(slot.id, { meal_name: e.target.value })}
                            placeholder="Nombre del plato *"
                            className="font-medium"
                          />
                          <Textarea
                            value={slot.description || ""}
                            onChange={(e) => updateSlot(slot.id, { description: e.target.value })}
                            placeholder="Descripcion / ingredientes..."
                            rows={2}
                            className="text-sm"
                          />
                          <div className="grid grid-cols-4 gap-2">
                            <div>
                              <label className="text-xs text-muted-foreground">Kcal</label>
                              <Input
                                type="number"
                                value={slot.calories || ""}
                                onChange={(e) => updateSlot(slot.id, { calories: e.target.value ? Number(e.target.value) : undefined })}
                                placeholder="0"
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">Prot (g)</label>
                              <Input
                                type="number"
                                value={slot.protein || ""}
                                onChange={(e) => updateSlot(slot.id, { protein: e.target.value ? Number(e.target.value) : undefined })}
                                placeholder="0"
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">Carbs (g)</label>
                              <Input
                                type="number"
                                value={slot.carbs || ""}
                                onChange={(e) => updateSlot(slot.id, { carbs: e.target.value ? Number(e.target.value) : undefined })}
                                placeholder="0"
                                className="text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">Grasa (g)</label>
                              <Input
                                type="number"
                                value={slot.fat || ""}
                                onChange={(e) => updateSlot(slot.id, { fat: e.target.value ? Number(e.target.value) : undefined })}
                                placeholder="0"
                                className="text-sm"
                              />
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSlot(slot.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}

            {slots.length === 0 && (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                <p>No hay comidas</p>
                <p className="text-sm">Usa el selector de arriba para anadir comidas</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || slots.length === 0 || slots.some(s => !s.meal_name.trim())}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar Cambios"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
