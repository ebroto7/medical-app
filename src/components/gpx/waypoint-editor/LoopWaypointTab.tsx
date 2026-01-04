"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Repeat } from "lucide-react";

interface LoopWaypointTabProps {
  repeatStartTime: string;
  repeatInterval: string;
  repeatCount: string;
  onStartTimeChange: (value: string) => void;
  onIntervalChange: (value: string) => void;
  onCountChange: (value: string) => void;
  estimatedDuration?: number;
  disabled?: boolean;
}

/**
 * Form fields for temporal loop (repeating) waypoints
 */
export function LoopWaypointTab({
  repeatStartTime,
  repeatInterval,
  repeatCount,
  onStartTimeChange,
  onIntervalChange,
  onCountChange,
  estimatedDuration,
  disabled,
}: LoopWaypointTabProps) {
  // Auto-calculate repetitions based on estimated duration
  const autoCalculateRepetitions = (): number | null => {
    if (!estimatedDuration || !repeatStartTime || !repeatInterval) return null;
    const start = parseInt(repeatStartTime);
    const interval = parseInt(repeatInterval);
    if (isNaN(start) || isNaN(interval) || interval <= 0) return null;
    const reps = Math.floor((estimatedDuration - start) / interval) + 1;
    return Math.min(Math.max(reps, 1), 50);
  };

  const isUsingAutoCalculation = !repeatCount && autoCalculateRepetitions() !== null;

  // Calculate loop preview times
  const loopPreviewTimes = () => {
    const count = repeatCount ? parseInt(repeatCount) : autoCalculateRepetitions();
    if (!repeatStartTime || !repeatInterval || !count) return [];
    const start = parseInt(repeatStartTime);
    const interval = parseInt(repeatInterval);
    return Array.from({ length: count }, (_, i) => start + i * interval);
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="bg-purple-50 border border-purple-200 rounded p-3 text-sm text-purple-800">
        <strong>Waypoint Repetitivo:</strong> Crea m&uacute;ltiples waypoints temporales a intervalos regulares.
        &Uacute;til para hidrataci&oacute;n recurrente.
      </div>

      <div>
        <Label htmlFor="loop-start">Tiempo de inicio (minutos) *</Label>
        <Input
          id="loop-start"
          type="number"
          value={repeatStartTime}
          onChange={(e) => onStartTimeChange(e.target.value)}
          placeholder="Ej: 20"
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground mt-1">Primer waypoint a los...</p>
      </div>

      <div>
        <Label htmlFor="loop-interval">Intervalo (minutos) *</Label>
        <Input
          id="loop-interval"
          type="number"
          value={repeatInterval}
          onChange={(e) => onIntervalChange(e.target.value)}
          placeholder="Ej: 20"
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground mt-1">Cada cu&aacute;ntos minutos...</p>
      </div>

      <div>
        <Label htmlFor="loop-count">
          N&uacute;mero de repeticiones {estimatedDuration ? "(opcional)" : "*"}
        </Label>
        <Input
          id="loop-count"
          type="number"
          value={repeatCount}
          onChange={(e) => onCountChange(e.target.value)}
          placeholder={isUsingAutoCalculation ? `Auto: ${autoCalculateRepetitions()}` : "Ej: 10"}
          disabled={disabled}
          max={50}
        />
        <p className="text-xs text-muted-foreground mt-1">
          {estimatedDuration
            ? `Cu&aacute;ntas veces (m&aacute;x 50). D&eacute;jalo vac&iacute;o para calcular seg&uacute;n tiempo estimado (${estimatedDuration} min)`
            : "Cu&aacute;ntas veces (m&aacute;x 50)..."}
        </p>
      </div>

      {/* Preview */}
      {loopPreviewTimes().length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded p-4">
          <p className="text-sm font-semibold text-indigo-900 mb-2">
            Vista previa: Se crear&aacute;n {loopPreviewTimes().length} waypoints
            {isUsingAutoCalculation && (
              <span className="text-indigo-600 font-normal ml-1">(auto-calculado)</span>
            )}
          </p>
          <p className="text-xs text-indigo-700">Minutos: {loopPreviewTimes().join(", ")}</p>
        </div>
      )}
    </div>
  );
}

export function LoopTabTrigger() {
  return (
    <span className="flex items-center gap-2">
      <Repeat className="h-4 w-4" />
      Repetir
    </span>
  );
}

// Helper to get effective repetitions
export function getEffectiveRepetitions(
  repeatCount: string,
  repeatStartTime: string,
  repeatInterval: string,
  estimatedDuration?: number
): number | null {
  if (repeatCount) {
    return parseInt(repeatCount);
  }
  if (!estimatedDuration || !repeatStartTime || !repeatInterval) return null;
  const start = parseInt(repeatStartTime);
  const interval = parseInt(repeatInterval);
  if (isNaN(start) || isNaN(interval) || interval <= 0) return null;
  const reps = Math.floor((estimatedDuration - start) / interval) + 1;
  return Math.min(Math.max(reps, 1), 50);
}
