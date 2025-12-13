"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar, List, Loader2, Trash2, Eye } from "lucide-react";
import { MealPlanViewDialog } from "./MealPlanViewDialog";

interface MealPlan {
  id: string;
  name: string;
  description: string | null;
  type: "weekly" | "situational";
  is_active: boolean;
  created_at: string;
  patient?: { id: string; full_name: string };
  nutritionist?: { id: string; full_name: string };
}

interface MealPlansListProps {
  patientId?: string;
  showPatientName?: boolean;
  canEdit?: boolean;
  onRefresh?: number;
}

export function MealPlansList({
  patientId,
  showPatientName = false,
  canEdit = false,
  onRefresh,
}: MealPlansListProps) {
  const { token } = useAuth();
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const url = patientId
        ? `/api/meal-plans?patient_id=${patientId}`
        : "/api/meal-plans";
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const { data } = await res.json();
        setPlans(data || []);
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchPlans();
  }, [token, patientId, onRefresh]);

  const handleDelete = async (planId: string) => {
    if (!confirm("¿Eliminar esta pauta?")) return;
    setDeletingId(planId);
    try {
      const res = await fetch(`/api/meal-plans/${planId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setPlans(plans.filter(p => p.id !== planId));
      }
    } catch (error) {
      console.error("Error deleting:", error);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No hay pautas creadas</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {plans.map((plan) => (
          <Card key={plan.id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${plan.type === "weekly" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                  {plan.type === "weekly" ? <Calendar className="h-5 w-5" /> : <List className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="font-semibold">{plan.name}</h3>
                  {plan.description && (
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded ${plan.type === "weekly" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"}`}>
                      {plan.type === "weekly" ? "Semanal" : "Situacional"}
                    </span>
                    {showPatientName && plan.patient && (
                      <span className="text-xs text-muted-foreground">
                        Para: {plan.patient.full_name}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(plan.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedPlanId(plan.id)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(plan.id)}
                  disabled={deletingId === plan.id}
                  className="text-destructive hover:text-destructive"
                >
                  {deletingId === plan.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {selectedPlanId && (
        <MealPlanViewDialog
          planId={selectedPlanId}
          open={!!selectedPlanId}
          onOpenChange={(open) => !open && setSelectedPlanId(null)}
          canEdit={canEdit}
          onUpdated={fetchPlans}
        />
      )}
    </>
  );
}
