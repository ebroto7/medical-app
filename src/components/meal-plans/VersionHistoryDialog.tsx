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
import { Loader2, History, Eye, Calendar, List } from "lucide-react";
import {
  PLAN_MEAL_TYPE_CONFIG,
  DAYS_OF_WEEK,
  getMealTypeLabel,
  PlanMealType,
} from "@/config/meal-plan-types";

interface Version {
  id: string;
  version_number: number;
  name: string;
  change_notes?: string;
  created_at: string;
}

interface VersionSnapshot {
  weekly_slots?: Array<{
    day_of_week: number;
    meal_type: PlanMealType;
    meal_name: string;
    description?: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  }>;
  situational_plans?: Array<{
    title: string;
    description?: string;
    slots: Array<{
      meal_type: PlanMealType;
      meal_name: string;
      description?: string;
      calories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
    }>;
  }>;
}

interface VersionHistoryDialogProps {
  planId: string;
  planType: "weekly" | "situational";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VersionHistoryDialog({
  planId,
  planType,
  open,
  onOpenChange,
}: VersionHistoryDialogProps) {
  const { token } = useAuth();
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [snapshot, setSnapshot] = useState<VersionSnapshot | null>(null);
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);

  useEffect(() => {
    if (open) {
      fetchVersions();
      setSelectedVersion(null);
      setSnapshot(null);
    }
  }, [open, planId]);

  const fetchVersions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/meal-plans/${planId}/versions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const { data } = await res.json();
        setVersions(data || []);
      }
    } catch (error) {
      console.error("Error fetching versions:", error);
    } finally {
      setLoading(false);
    }
  };

  const viewVersion = async (version: Version) => {
    setSelectedVersion(version);
    setLoadingSnapshot(true);
    try {
      const res = await fetch(`/api/meal-plans/${planId}/versions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ version_id: version.id }),
      });
      if (res.ok) {
        const { data } = await res.json();
        setSnapshot(data.snapshot);
      }
    } catch (error) {
      console.error("Error fetching version snapshot:", error);
    } finally {
      setLoadingSnapshot(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderMacros = (slot: { calories?: number; protein?: number; carbs?: number; fat?: number }) => {
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historial de Versiones
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay versiones anteriores</p>
            <p className="text-sm">El historial se creara cuando edites la pauta</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Version List */}
            <div className="space-y-2 border-r pr-4">
              <h3 className="font-medium text-sm text-muted-foreground mb-3">Versiones</h3>
              {versions.map((version) => (
                <button
                  key={version.id}
                  onClick={() => viewVersion(version)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedVersion?.id === version.id
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="bg-muted px-2 py-0.5 rounded text-xs font-medium">
                      v{version.version_number}
                    </span>
                    <span className="text-sm font-medium truncate">{version.name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatDate(version.created_at)}
                  </div>
                  {version.change_notes && (
                    <div className="text-xs text-muted-foreground mt-1 truncate">
                      {version.change_notes}
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Version Preview */}
            <div className="md:col-span-2">
              {selectedVersion ? (
                loadingSnapshot ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : snapshot ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      {planType === "weekly" ? (
                        <Calendar className="h-5 w-5 text-blue-600" />
                      ) : (
                        <List className="h-5 w-5 text-purple-600" />
                      )}
                      <h3 className="font-semibold">
                        Version {selectedVersion.version_number}: {selectedVersion.name}
                      </h3>
                    </div>

                    {/* Weekly Slots Preview */}
                    {planType === "weekly" && snapshot.weekly_slots && (
                      <div className="space-y-3">
                        {DAYS_OF_WEEK.map((day) => {
                          const daySlots = snapshot.weekly_slots!
                            .filter(s => s.day_of_week === day.value)
                            .sort((a, b) =>
                              PLAN_MEAL_TYPE_CONFIG[a.meal_type].sortOrder - PLAN_MEAL_TYPE_CONFIG[b.meal_type].sortOrder
                            );
                          if (daySlots.length === 0) return null;
                          return (
                            <div key={day.value} className="border rounded-lg p-3">
                              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
                                  {day.short}
                                </span>
                                {day.label}
                              </h4>
                              <div className="space-y-2">
                                {daySlots.map((slot, idx) => (
                                  <div key={idx} className="flex gap-2 p-2 bg-muted/30 rounded text-sm">
                                    <span>{PLAN_MEAL_TYPE_CONFIG[slot.meal_type].emoji}</span>
                                    <div className="flex-1">
                                      <div className="font-medium">{slot.meal_name}</div>
                                      {slot.description && (
                                        <div className="text-xs text-muted-foreground">{slot.description}</div>
                                      )}
                                      {renderMacros(slot)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Situational Plans Preview */}
                    {planType === "situational" && snapshot.situational_plans && (
                      <div className="space-y-3">
                        {snapshot.situational_plans.map((sitPlan, idx) => (
                          <div key={idx} className="border rounded-lg p-3">
                            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                              <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs">
                                {idx + 1}
                              </span>
                              {sitPlan.title}
                            </h4>
                            {sitPlan.description && (
                              <p className="text-xs text-muted-foreground mb-2">{sitPlan.description}</p>
                            )}
                            <div className="space-y-2">
                              {sitPlan.slots
                                .sort((a, b) =>
                                  PLAN_MEAL_TYPE_CONFIG[a.meal_type].sortOrder - PLAN_MEAL_TYPE_CONFIG[b.meal_type].sortOrder
                                )
                                .map((slot, slotIdx) => (
                                  <div key={slotIdx} className="flex gap-2 p-2 bg-muted/30 rounded text-sm">
                                    <span>{PLAN_MEAL_TYPE_CONFIG[slot.meal_type].emoji}</span>
                                    <div className="flex-1">
                                      <div className="font-medium">{slot.meal_name}</div>
                                      {slot.description && (
                                        <div className="text-xs text-muted-foreground">{slot.description}</div>
                                      )}
                                      {renderMacros(slot)}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    Error al cargar la version
                  </div>
                )
              ) : (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <div className="text-center">
                    <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Selecciona una version para ver su contenido</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
