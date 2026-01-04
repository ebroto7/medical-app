"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin } from "lucide-react";

interface SpatialWaypointTabProps {
  triggerDistance: string;
  onDistanceChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * Form fields for spatial (distance-based) waypoints
 */
export function SpatialWaypointTab({
  triggerDistance,
  onDistanceChange,
  disabled,
}: SpatialWaypointTabProps) {
  return (
    <div className="space-y-4 mt-4">
      <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
        <strong>Waypoint Espacial:</strong> Se activa en un punto espec&iacute;fico de la ruta (por kil&oacute;metro).
        Aparece en el mapa y en el gr&aacute;fico de elevaci&oacute;n.
      </div>

      <div>
        <Label htmlFor="spatial-distance">Distancia (km) *</Label>
        <Input
          id="spatial-distance"
          type="number"
          step="0.1"
          value={triggerDistance}
          onChange={(e) => onDistanceChange(e.target.value)}
          placeholder="Ej: 25.5"
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground mt-1">En el kil&oacute;metro...</p>
      </div>
    </div>
  );
}

export function SpatialTabTrigger() {
  return (
    <span className="flex items-center gap-2">
      <MapPin className="h-4 w-4" />
      Distancia
    </span>
  );
}
