"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Calendar, List } from "lucide-react";
import { MealPlanViewDialog } from "@/components/meal-plans/MealPlanViewDialog";

interface MealPlan {
  id: string;
  name: string;
  description: string | null;
  type: "weekly" | "situational";
  is_active: boolean;
  created_at: string;
  nutritionist?: { id: string; full_name: string };
}

export default function PatientMealPlansPage() {
  const { token } = useAuth();
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await fetch("/api/meal-plans", {
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
    if (token) fetchPlans();
  }, [token]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Mis Pautas Nutricionales</h1>
          <p className="text-muted-foreground mt-1">
            Pautas creadas por tu nutricionista
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : plans.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No tienes pautas asignadas</p>
              <p className="text-sm">Tu nutricionista aún no ha creado ninguna pauta para ti</p>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className="p-6 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedPlanId(plan.id)}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${plan.type === "weekly" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                    {plan.type === "weekly" ? (
                      <Calendar className="h-6 w-6" />
                    ) : (
                      <List className="h-6 w-6" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{plan.name}</h3>
                    {plan.description && (
                      <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs px-2 py-1 rounded ${plan.type === "weekly" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"}`}>
                        {plan.type === "weekly" ? "Semanal" : "Situacional"}
                      </span>
                    </div>
                    {plan.nutritionist && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Por: {plan.nutritionist.full_name}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {selectedPlanId && (
        <MealPlanViewDialog
          planId={selectedPlanId}
          open={!!selectedPlanId}
          onOpenChange={(open) => !open && setSelectedPlanId(null)}
        />
      )}
    </DashboardLayout>
  );
}
