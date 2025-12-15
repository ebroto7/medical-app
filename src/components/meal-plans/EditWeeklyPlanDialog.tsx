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
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { WeeklyPlanGrid, WeeklySlot } from "./WeeklyPlanGrid";

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

  useEffect(() => {
    if (open && plan.weekly_slots) {
      // Clone the slots with new IDs for local state
      // Actually, we should keep IDs if we want to update properly, but for this simpler implementation 
      // where we replace all slots, cloning is fine or keeping as is.
      // Wait, the API endpoint is `PUT /api/meal-plans/${plan.id}/slots`, which replaces all slots usually?
      // Let's check logic: "weekly_slots: slots.map(({ id, ...slot }) => slot)"
      // So it strips IDs anyway and sends raw slots. OK.
      setSlots(plan.weekly_slots.map(s => ({ ...s })));
    }
  }, [open, plan]);

  const handleSave = async () => {
    if (slots.length === 0) return;

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Pauta Semanal</DialogTitle>
          <p className="text-sm text-muted-foreground">{plan.name}</p>
        </DialogHeader>

        <div className="space-y-6">
          <WeeklyPlanGrid
            slots={slots}
            onSlotsChange={setSlots}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || slots.length === 0}
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
