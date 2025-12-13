"use client";

import { useState } from "react";
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
import { Loader2, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import {
  PlanMealType,
  PLAN_MEAL_TYPE_CONFIG,
  PLAN_MEAL_TYPES,
  getMealTypeLabel,
} from "@/config/meal-plan-types";

interface SituationalSlot {
  id: string;
  meal_type: PlanMealType;
  meal_name: string;
  description?: string;
  notes?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

interface SituationalPlan {
  id: string;
  title: string;
  description?: string;
  slots: SituationalSlot[];
  isExpanded: boolean;
}

interface CreateSituationalPlanDialogProps {
  patientId: string;
  patientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateSituationalPlanDialog({
  patientId,
  patientName,
  open,
  onOpenChange,
  onCreated,
}: CreateSituationalPlanDialogProps) {
  const { token } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [situationalPlans, setSituationalPlans] = useState<SituationalPlan[]>([]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setSituationalPlans([]);
  };

  const addSituationalPlan = () => {
    const newPlan: SituationalPlan = {
      id: crypto.randomUUID(),
      title: "",
      slots: [],
      isExpanded: true,
    };
    setSituationalPlans([...situationalPlans, newPlan]);
  };

  const updateSituationalPlan = (id: string, updates: Partial<SituationalPlan>) => {
    setSituationalPlans(plans =>
      plans.map(p => p.id === id ? { ...p, ...updates } : p)
    );
  };

  const removeSituationalPlan = (id: string) => {
    setSituationalPlans(plans => plans.filter(p => p.id !== id));
  };

  const toggleExpand = (id: string) => {
    setSituationalPlans(plans =>
      plans.map(p => p.id === id ? { ...p, isExpanded: !p.isExpanded } : p)
    );
  };

  const addSlotToPlan = (planId: string, mealType: PlanMealType) => {
    const newSlot: SituationalSlot = {
      id: crypto.randomUUID(),
      meal_type: mealType,
      meal_name: "",
    };
    setSituationalPlans(plans =>
      plans.map(p => p.id === planId
        ? { ...p, slots: [...p.slots, newSlot] }
        : p
      )
    );
  };

  const updateSlot = (planId: string, slotId: string, updates: Partial<SituationalSlot>) => {
    setSituationalPlans(plans =>
      plans.map(p => p.id === planId
        ? { ...p, slots: p.slots.map(s => s.id === slotId ? { ...s, ...updates } : s) }
        : p
      )
    );
  };

  const removeSlot = (planId: string, slotId: string) => {
    setSituationalPlans(plans =>
      plans.map(p => p.id === planId
        ? { ...p, slots: p.slots.filter(s => s.id !== slotId) }
        : p
      )
    );
  };

  const handleSave = async () => {
    if (!name.trim() || situationalPlans.length === 0) return;

    // Validate all plans have titles and at least one slot
    const isValid = situationalPlans.every(p =>
      p.title.trim() && p.slots.length > 0 && p.slots.every(s => s.meal_name.trim())
    );
    if (!isValid) {
      alert("Cada situación debe tener un título y al menos una comida con nombre");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/meal-plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patient_id: patientId,
          type: "situational",
          name,
          description,
          situational_plans: situationalPlans.map(({ id: _id, isExpanded: _isExpanded, ...plan }, index) => ({
            ...plan,
            sort_order: index,
            slots: plan.slots.map(({ id: _slotId, ...slot }, slotIndex) => ({
              ...slot,
              sort_order: slotIndex,
            })),
          })),
        }),
      });

      if (res.ok) {
        resetForm();
        onCreated();
        onOpenChange(false);
      } else {
        const data = await res.json();
        alert(data.error || "Error al crear la pauta");
      }
    } catch (error) {
      console.error("Error creating plan:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Pauta Situacional</DialogTitle>
          <p className="text-sm text-muted-foreground">Para: {patientName}</p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Plan Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre de la pauta *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Pauta según actividad"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Descripción</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción opcional"
              />
            </div>
          </div>

          {/* Add Situation Button */}
          <Button onClick={addSituationalPlan} variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" /> Añadir Situación
          </Button>

          {/* Situational Plans */}
          <div className="space-y-4">
            {situationalPlans.map((plan, index) => (
              <div key={plan.id} className="border rounded-lg overflow-hidden">
                {/* Plan Header */}
                <div className="flex items-center gap-3 p-4 bg-muted/50">
                  <button
                    onClick={() => toggleExpand(plan.id)}
                    className="p-1 hover:bg-muted rounded"
                  >
                    {plan.isExpanded
                      ? <ChevronUp className="h-4 w-4" />
                      : <ChevronDown className="h-4 w-4" />
                    }
                  </button>
                  <span className="bg-primary text-primary-foreground px-2 py-1 rounded text-sm font-medium">
                    {index + 1}
                  </span>
                  <Input
                    value={plan.title}
                    onChange={(e) => updateSituationalPlan(plan.id, { title: e.target.value })}
                    placeholder="Título de la situación (Ej: Día de entreno - Mañana)"
                    className="flex-1 font-medium"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSituationalPlan(plan.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Plan Content */}
                {plan.isExpanded && (
                  <div className="p-4 space-y-4">
                    <Input
                      value={plan.description || ""}
                      onChange={(e) => updateSituationalPlan(plan.id, { description: e.target.value })}
                      placeholder="Descripción de esta situación (opcional)"
                      className="text-sm"
                    />

                    {/* Add Meal Selector */}
                    <div className="flex gap-2 flex-wrap">
                      {PLAN_MEAL_TYPES.map((type) => (
                        <Button
                          key={type}
                          variant="outline"
                          size="sm"
                          onClick={() => addSlotToPlan(plan.id, type)}
                        >
                          {PLAN_MEAL_TYPE_CONFIG[type].emoji} {PLAN_MEAL_TYPE_CONFIG[type].label}
                        </Button>
                      ))}
                    </div>

                    {/* Slots */}
                    <div className="space-y-3">
                      {plan.slots
                        .sort((a, b) =>
                          PLAN_MEAL_TYPE_CONFIG[a.meal_type].sortOrder - PLAN_MEAL_TYPE_CONFIG[b.meal_type].sortOrder
                        )
                        .map((slot) => (
                          <div key={slot.id} className="flex gap-3 items-start p-3 bg-background border rounded-md">
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
                                onChange={(e) => updateSlot(plan.id, slot.id, { meal_name: e.target.value })}
                                placeholder="Nombre del plato *"
                                className="font-medium"
                              />
                              <Textarea
                                value={slot.description || ""}
                                onChange={(e) => updateSlot(plan.id, slot.id, { description: e.target.value })}
                                placeholder="Descripción / ingredientes..."
                                rows={2}
                                className="text-sm"
                              />
                              <div className="grid grid-cols-4 gap-2">
                                <div>
                                  <label className="text-xs text-muted-foreground">Kcal</label>
                                  <Input
                                    type="number"
                                    value={slot.calories || ""}
                                    onChange={(e) => updateSlot(plan.id, slot.id, { calories: e.target.value ? Number(e.target.value) : undefined })}
                                    placeholder="0"
                                    className="text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground">Prot (g)</label>
                                  <Input
                                    type="number"
                                    value={slot.protein || ""}
                                    onChange={(e) => updateSlot(plan.id, slot.id, { protein: e.target.value ? Number(e.target.value) : undefined })}
                                    placeholder="0"
                                    className="text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground">Carbs (g)</label>
                                  <Input
                                    type="number"
                                    value={slot.carbs || ""}
                                    onChange={(e) => updateSlot(plan.id, slot.id, { carbs: e.target.value ? Number(e.target.value) : undefined })}
                                    placeholder="0"
                                    className="text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground">Grasa (g)</label>
                                  <Input
                                    type="number"
                                    value={slot.fat || ""}
                                    onChange={(e) => updateSlot(plan.id, slot.id, { fat: e.target.value ? Number(e.target.value) : undefined })}
                                    placeholder="0"
                                    className="text-sm"
                                  />
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSlot(plan.id, slot.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}

                      {plan.slots.length === 0 && (
                        <div className="text-center py-4 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                          Añade comidas usando los botones de arriba
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {situationalPlans.length === 0 && (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                <p>No hay situaciones creadas</p>
                <p className="text-sm">Añade situaciones como &quot;Día de entreno&quot;, &quot;Día de oficina&quot;, etc.</p>
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
            disabled={isSaving || !name.trim() || situationalPlans.length === 0}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              "Crear Pauta"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
