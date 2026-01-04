"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock } from "lucide-react";

interface TemporalWaypointTabProps {
  triggerTime: string;
  onTimeChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * Form fields for temporal (time-based) single waypoints
 */
export function TemporalWaypointTab({
  triggerTime,
  onTimeChange,
  disabled,
}: TemporalWaypointTabProps) {
  return (
    <div className="space-y-4 mt-4">
      <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-800">
        <strong>Waypoint Temporal:</strong> Se activa en un momento espec&iacute;fico (por minutos transcurridos).
        Aparece en la l&iacute;nea temporal, no en el mapa.
      </div>

      <div>
        <Label htmlFor="temporal-time">Tiempo (minutos) *</Label>
        <Input
          id="temporal-time"
          type="number"
          value={triggerTime}
          onChange={(e) => onTimeChange(e.target.value)}
          placeholder="Ej: 60"
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground mt-1">A los X minutos desde el inicio...</p>
      </div>
    </div>
  );
}

export function TemporalTabTrigger() {
  return (
    <span className="flex items-center gap-2">
      <Clock className="h-4 w-4" />
      Tiempo
    </span>
  );
}
