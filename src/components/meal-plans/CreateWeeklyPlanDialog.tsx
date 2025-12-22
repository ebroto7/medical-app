"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { WeeklyPlanGrid, WeeklySlot } from "./WeeklyPlanGrid";

interface CreateWeeklyPlanDialogProps {
  patientId: string;
  patientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateWeeklyPlanDialog({
  patientId,
  patientName,
  open,
  onOpenChange,
  onCreated,
}: CreateWeeklyPlanDialogProps) {
  const { token } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [slots, setSlots] = useState<WeeklySlot[]>([]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setSlots([]);
  };

  const handleSave = async () => {
    if (!name.trim() || slots.length === 0) return;

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
          type: "weekly",
          name,
          description,
          weekly_slots: slots.map(({ id, ...slot }) => slot),
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
      <DialogContent className="max-w-[95vw] w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Pauta Semanal</DialogTitle>
          <DialogDescription>Para: {patientName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Plan Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre de la pauta *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Pauta de mantenimiento"
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

          <div className="border-t pt-4">
            <WeeklyPlanGrid
              slots={slots}
              onSlotsChange={setSlots}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !name.trim() || slots.length === 0}
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
