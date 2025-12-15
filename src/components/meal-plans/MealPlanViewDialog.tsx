"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Calendar, List, Pencil, History, Trash2 } from "lucide-react";
import { WeeklyPlanGrid, WeeklySlot } from "./WeeklyPlanGrid";
import {
  PLAN_MEAL_TYPE_CONFIG,
  getMealTypeLabel,
  PlanMealType,
} from "@/config/meal-plan-types";
import { EditWeeklyPlanDialog } from "./EditWeeklyPlanDialog";
import { EditSituationalPlanDialog } from "./EditSituationalPlanDialog";
import { VersionHistoryDialog } from "./VersionHistoryDialog";

// removed WeeklySlot definition as it is imported


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
}

interface MealPlanFull {
  id: string;
  name: string;
  description?: string;
  type: "weekly" | "situational";
  patient?: { id: string; full_name: string };
  nutritionist?: { id: string; full_name: string };
  weekly_slots?: WeeklySlot[];
  situational_plans?: SituationalPlan[];
}

interface MealPlanViewDialogProps {
  planId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit?: boolean;
  onUpdated?: () => void;
  onDelete?: () => Promise<void>;
}

export function MealPlanViewDialog({
  planId,
  open,
  onOpenChange,
  canEdit = false,
  onUpdated,
  onDelete,
}: MealPlanViewDialogProps) {
  const { token } = useAuth();
  const [plan, setPlan] = useState<MealPlanFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditWeekly, setShowEditWeekly] = useState(false);
  const [showEditSituational, setShowEditSituational] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  useEffect(() => {
    if (open && planId) {
      fetchPlan();
    }
  }, [open, planId]);

  const handleUpdated = () => {
    fetchPlan();
    onUpdated?.();
  };

  const fetchPlan = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/meal-plans/${planId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const { data } = await res.json();
        setPlan(data);
      }
    } catch (error) {
      console.error("Error fetching plan:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderMacros = (slot: WeeklySlot | SituationalSlot) => {
    if (!slot.calories && !slot.protein && !slot.carbs && !slot.fat) return null;
    return (
      <div className="flex gap-3 text-xs text-muted-foreground mt-1">
        {slot.calories && <span>{slot.calories} kcal</span>}
        {slot.protein && <span>P: {slot.protein}g</span>}
        {slot.carbs && <span>C: {slot.carbs}g</span>}
        {slot.fat && <span>G: {slot.fat}g</span>}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              {loading ? (
                <span>Cargando pauta...</span>
              ) : plan ? (
                <>
                  {plan.type === "weekly" ? (
                    <Calendar className="h-5 w-5 text-blue-600" />
                  ) : (
                    <List className="h-5 w-5 text-purple-600" />
                  )}
                  {plan.name}
                </>
              ) : (
                <span>Error</span>
              )}
            </DialogTitle>
            {!loading && plan && canEdit && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowVersionHistory(true)}
                >
                  <History className="h-4 w-4 mr-1" />
                  Historial
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    plan.type === "weekly"
                      ? setShowEditWeekly(true)
                      : setShowEditSituational(true)
                  }
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Editar
                </Button>
                {onDelete && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      if (confirm("¿Estás seguro de que quieres eliminar esta pauta? Esta acción no se puede deshacer.")) {
                        await onDelete();
                        onOpenChange(false);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Eliminar
                  </Button>
                )}
              </div>
            )}
          </div>
          {!loading && plan && (
            <>
              {plan.description && (
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              )}
              {plan.nutritionist && (
                <p className="text-xs text-muted-foreground">
                  Creada por: {plan.nutritionist.full_name}
                </p>
              )}
            </>
          )}
        </DialogHeader>

        <div className="mt-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : plan ? (
            <div className="space-y-4">
              {plan.type === "weekly" && plan.weekly_slots && (
                <div className="overflow-x-auto">
                  <WeeklyPlanGrid
                    slots={plan.weekly_slots}
                    readOnly={true}
                  />
                </div>
              )}

              {plan.type === "situational" && plan.situational_plans && (
                <>
                  {plan.situational_plans.map((sitPlan, index) => (
                    <div key={sitPlan.id} className="border rounded-lg p-4">
                      <h3 className="font-semibold text-lg mb-1 flex items-center gap-2">
                        <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-sm">
                          {index + 1}
                        </span>
                        {sitPlan.title}
                      </h3>
                      {sitPlan.description && (
                        <p className="text-sm text-muted-foreground mb-3">{sitPlan.description}</p>
                      )}
                      <div className="space-y-3">
                        {sitPlan.slots
                          .sort((a, b) =>
                            PLAN_MEAL_TYPE_CONFIG[a.meal_type].sortOrder - PLAN_MEAL_TYPE_CONFIG[b.meal_type].sortOrder
                          )
                          .map((slot) => (
                            <div key={slot.id} className="flex gap-3 p-3 bg-muted/30 rounded-md">
                              <div className="text-2xl">
                                {PLAN_MEAL_TYPE_CONFIG[slot.meal_type].emoji}
                              </div>
                              <div className="flex-1">
                                <div className="text-xs text-muted-foreground">
                                  {getMealTypeLabel(slot.meal_type)}
                                </div>
                                <div className="font-medium">{slot.meal_name}</div>
                                {slot.description && (
                                  <p className="text-sm text-muted-foreground">{slot.description}</p>
                                )}
                                {renderMacros(slot)}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Error al cargar la pauta
            </div>
          )}
        </div>
      </DialogContent>

      {/* Edit Dialogs */}
      {plan && plan.type === "weekly" && (
        <EditWeeklyPlanDialog
          plan={plan}
          open={showEditWeekly}
          onOpenChange={setShowEditWeekly}
          onUpdated={handleUpdated}
        />
      )}

      {plan && plan.type === "situational" && (
        <EditSituationalPlanDialog
          plan={plan}
          open={showEditSituational}
          onOpenChange={setShowEditSituational}
          onUpdated={handleUpdated}
        />
      )}

      {plan && (
        <VersionHistoryDialog
          planId={plan.id}
          planType={plan.type}
          open={showVersionHistory}
          onOpenChange={setShowVersionHistory}
        />
      )}
    </Dialog>
  );
}
