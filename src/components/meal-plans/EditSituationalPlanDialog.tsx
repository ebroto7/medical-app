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
import { Loader2, Plus, Trash2, ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import {
  PlanMealType,
  PLAN_MEAL_TYPE_CONFIG,
  PLAN_MEAL_TYPES,
  getMealTypeLabel,
} from "@/config/meal-plan-types";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
  sort_order?: number;
}

interface SituationalPlan {
  id: string;
  title: string;
  description?: string;
  slots: SituationalSlot[];
  isExpanded: boolean;
  sort_order?: number;
}

interface MealPlanData {
  id: string;
  name: string;
  description?: string;
  situational_plans?: Array<{
    id: string;
    title: string;
    description?: string;
    slots: SituationalSlot[];
    sort_order?: number;
  }>;
}

interface EditSituationalPlanDialogProps {
  plan: MealPlanData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

function SortableSlotCard({
  slot,
  onRemove,
  updateSlot,
  planId
}: {
  slot: SituationalSlot;
  onRemove: () => void;
  updateSlot: (id: string, updates: Partial<SituationalSlot>) => void;
  planId: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slot.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : "auto",
    position: isDragging ? "relative" as const : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex gap-3 items-start p-3 bg-background border rounded-md ${isDragging ? "shadow-lg ring-2 ring-primary opacity-80" : ""}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="mt-2 text-muted-foreground cursor-grab hover:text-foreground touch-none"
      >
        <GripVertical className="h-5 w-5" />
      </div>
      <div className="text-2xl pt-1">
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
        onClick={onRemove}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function EditSituationalPlanDialog({
  plan,
  open,
  onOpenChange,
  onUpdated,
}: EditSituationalPlanDialogProps) {
  const { token } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [situationalPlans, setSituationalPlans] = useState<SituationalPlan[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (open && plan.situational_plans) {
      setSituationalPlans(
        plan.situational_plans
          // Apply sort order if present
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map(sp => ({
            ...sp,
            id: sp.id || crypto.randomUUID(),
            isExpanded: true,
            slots: sp.slots
              .sort((a, b) => {
                if (a.sort_order !== undefined && b.sort_order !== undefined) {
                  return a.sort_order - b.sort_order;
                }
                return PLAN_MEAL_TYPE_CONFIG[a.meal_type].sortOrder - PLAN_MEAL_TYPE_CONFIG[b.meal_type].sortOrder;
              })
              .map(s => ({ ...s, id: s.id || crypto.randomUUID() })),
          }))
      );
    }
  }, [open, plan]);

  const addSituationalPlan = () => {
    const newPlan: SituationalPlan = {
      id: crypto.randomUUID(),
      title: "",
      slots: [],
      isExpanded: true,
      sort_order: situationalPlans.length,
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
    const targetPlan = situationalPlans.find(p => p.id === planId);
    const newSlot: SituationalSlot = {
      id: crypto.randomUUID(),
      meal_type: mealType,
      meal_name: "",
      sort_order: targetPlan ? targetPlan.slots.length : 0 // Add to end
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

  const handleDragEnd = (event: DragEndEvent, planId: string) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSituationalPlans(plans =>
        plans.map(p => {
          if (p.id !== planId) return p;

          const oldIndex = p.slots.findIndex(s => s.id === active.id);
          const newIndex = p.slots.findIndex(s => s.id === over.id);

          if (oldIndex === -1 || newIndex === -1) return p;

          const newSlots = arrayMove(p.slots, oldIndex, newIndex);

          // Update sort_order for persistence
          const updatedSlots = newSlots.map((s, idx) => ({ ...s, sort_order: idx }));

          return { ...p, slots: updatedSlots };
        })
      );
    }
  };

  const handleSave = async () => {
    if (situationalPlans.length === 0) return;

    // Validate all plans have titles and at least one slot
    const isValid = situationalPlans.every(p =>
      p.title.trim() && p.slots.length > 0 && p.slots.every(s => s.meal_name.trim())
    );
    if (!isValid) {
      alert("Cada situacion debe tener un titulo y al menos una comida con nombre");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/meal-plans/${plan.id}/slots`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Pauta Situacional</DialogTitle>
          <p className="text-sm text-muted-foreground">{plan.name}</p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add Situation Button */}
          <Button onClick={addSituationalPlan} variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" /> Anadir Situacion
          </Button>

          {/* Situational Plans */}
          <div className="space-y-4">
            {situationalPlans.map((sitPlan, index) => (
              <div key={sitPlan.id} className="border rounded-lg overflow-hidden">
                {/* Plan Header */}
                <div className="flex items-center gap-3 p-4 bg-muted/50">
                  <button
                    onClick={() => toggleExpand(sitPlan.id)}
                    className="p-1 hover:bg-muted rounded"
                  >
                    {sitPlan.isExpanded
                      ? <ChevronUp className="h-4 w-4" />
                      : <ChevronDown className="h-4 w-4" />
                    }
                  </button>
                  <span className="bg-primary text-primary-foreground px-2 py-1 rounded text-sm font-medium">
                    {index + 1}
                  </span>
                  <Input
                    value={sitPlan.title}
                    onChange={(e) => updateSituationalPlan(sitPlan.id, { title: e.target.value })}
                    placeholder="Titulo de la situacion (Ej: Dia de entreno - Manana)"
                    className="flex-1 font-medium"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSituationalPlan(sitPlan.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Plan Content */}
                {sitPlan.isExpanded && (
                  <div className="p-4 space-y-4">
                    <Input
                      value={sitPlan.description || ""}
                      onChange={(e) => updateSituationalPlan(sitPlan.id, { description: e.target.value })}
                      placeholder="Descripcion de esta situacion (opcional)"
                      className="text-sm"
                    />

                    {/* Add Meal Selector */}
                    <div className="flex gap-2 flex-wrap">
                      {PLAN_MEAL_TYPES.map((type) => (
                        <Button
                          key={type}
                          variant="outline"
                          size="sm"
                          onClick={() => addSlotToPlan(sitPlan.id, type)}
                        >
                          {PLAN_MEAL_TYPE_CONFIG[type].emoji} {PLAN_MEAL_TYPE_CONFIG[type].label}
                        </Button>
                      ))}
                    </div>

                    {/* Slots List with DnD */}
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(e) => handleDragEnd(e, sitPlan.id)}
                    >
                      <SortableContext
                        items={sitPlan.slots.map(s => s.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-3">
                          {sitPlan.slots.map((slot) => (
                            <SortableSlotCard
                              key={slot.id}
                              slot={slot}
                              onRemove={() => removeSlot(sitPlan.id, slot.id)}
                              updateSlot={(id, ups) => updateSlot(sitPlan.id, id, ups)}
                              planId={sitPlan.id}
                            />
                          ))}

                          {sitPlan.slots.length === 0 && (
                            <div className="text-center py-4 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                              Anade comidas usando los botones de arriba
                            </div>
                          )}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>
                )}
              </div>
            ))}

            {situationalPlans.length === 0 && (
              <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                <p>No hay situaciones creadas</p>
                <p className="text-sm">Anade situaciones como &quot;Dia de entreno&quot;, &quot;Dia de oficina&quot;, etc.</p>
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
            disabled={isSaving || situationalPlans.length === 0}
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
