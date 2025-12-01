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
import { Database } from "@/types/database";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Dumbbell, Heart, Zap, Activity, Sparkles, MoreHorizontal } from "lucide-react";

type TrainingSession = Database["public"]["Tables"]["training_sessions"]["Row"];
type TrainingType = "cardio" | "strength" | "flexibility" | "hiit" | "yoga" | "other";

const trainingTypeOptions: { value: TrainingType; label: string; icon: React.ElementType }[] = [
  { value: "cardio", label: "Cardio", icon: Heart },
  { value: "strength", label: "Fuerza", icon: Dumbbell },
  { value: "flexibility", label: "Flexibilidad", icon: Activity },
  { value: "hiit", label: "HIIT", icon: Zap },
  { value: "yoga", label: "Yoga", icon: Sparkles },
  { value: "other", label: "Otro", icon: MoreHorizontal },
];

interface EditTrainingDialogProps {
  session: TrainingSession;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function EditTrainingDialog({ session, open, onOpenChange, onSaved }: EditTrainingDialogProps) {
  const { token } = useAuth();

  const [type, setType] = useState<TrainingType>(session.type);
  const [time, setTime] = useState(session.time?.slice(0, 5) || "");
  const [durationMinutes, setDurationMinutes] = useState(session.duration_minutes?.toString() || "");
  const [description, setDescription] = useState(session.description || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!time) {
      alert("La hora es obligatoria");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/training/sessions/${session.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type,
          time,
          durationMinutes: durationMinutes ? parseInt(durationMinutes) : null,
          description: description || null,
        }),
      });

      if (res.ok) {
        onSaved();
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Error saving:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Entrenamiento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Training Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de entrenamiento
            </label>
            <div className="grid grid-cols-3 gap-2">
              {trainingTypeOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = type === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setType(opt.value)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? "border-amber-500 bg-amber-50 text-amber-700"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs font-medium">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hora *
            </label>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duración (minutos)
            </label>
            <Input
              type="number"
              min="1"
              max="480"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              placeholder="Ej: 45"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Comentario
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe tu entrenamiento..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
