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
import { Loader2, Calendar, List, Pencil, History } from "lucide-react";
import {
  PLAN_MEAL_TYPE_CONFIG,
  DAYS_OF_WEEK,
  getMealTypeLabel,
  PlanMealType,
} from "@/config/meal-plan-types";
import { EditWeeklyPlanDialog } from "./EditWeeklyPlanDialog";
import { EditSituationalPlanDialog } from "./EditSituationalPlanDialog";
import { VersionHistoryDialog } from "./VersionHistoryDialog";

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
}

export function MealPlanViewDialog({
  planId,
  open,
  onOpenChange,
  canEdit = false,
  onUpdated,
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : plan ? (
          <>
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center gap-2">
                  {plan.type === "weekly" ? (
                    <Calendar className="h-5 w-5 text-blue-600" />
                  ) : (
                    <List className="h-5 w-5 text-purple-600" />
                  )}
                  {plan.name}
                </DialogTitle>
                {canEdit && (
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
                  </div>
                )}
              </div>
              {plan.description && (
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              )}
              {plan.nutritionist && (
                <p className="text-xs text-muted-foreground">
                  Creada por: {plan.nutritionist.full_name}
                </p>
              )}
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {plan.type === "weekly" && plan.weekly_slots && (
                <>
                  {DAYS_OF_WEEK.map((day) => {
                    const daySlots = plan.weekly_slots!
                      .filter(s => s.day_of_week === day.value)
                      .sort((a, b) =>
                        PLAN_MEAL_TYPE_CONFIG[a.meal_type].sortOrder - PLAN_MEAL_TYPE_CONFIG[b.meal_type].sortOrder
                      );
                    if (daySlots.length === 0) return null;
                    return (
                      <div key={day.value} className="border rounded-lg p-4">
                        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm">
                            {day.short}
                          </span>
                          {day.label}
                        </h3>
                        <div className="space-y-3">
                          {daySlots.map((slot) => (
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
                    );
                  })}
                </>
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
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Error al cargar la pauta
          </div>
        )}
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
