"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Clock, Repeat } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { GPXTrackPoint } from "@/lib/gpx/parser";
import type { Waypoint } from "@/types/waypoint";
import { isSpatialWaypoint, isRepeatingWaypoint } from "@/types/waypoint";

interface WaypointEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  trackPoints: GPXTrackPoint[];
  selectedPoint: GPXTrackPoint | null;
  editingWaypoint?: Waypoint | null;
  onWaypointCreated: () => void;
  estimatedDuration?: number;  // Plan's estimated duration in minutes (for auto-calculating loop repetitions)
}

// Removed NUTRITION_TYPES - now using free-form name field instead

const LOOP_COLORS = [
  { value: '#3b82f6', label: 'Azul' },
  { value: '#10b981', label: 'Verde' },
  { value: '#f59e0b', label: 'Ámbar' },
  { value: '#ef4444', label: 'Rojo' },
  { value: '#8b5cf6', label: 'Morado' },
  { value: '#ec4899', label: 'Rosa' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#f97316', label: 'Naranja' },
];

export function WaypointEditorDialog({
  open,
  onOpenChange,
  planId,
  trackPoints,
  selectedPoint,
  editingWaypoint,
  onWaypointCreated,
  estimatedDuration,
}: WaypointEditorDialogProps) {
  const { token } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  // Tab selection
  const [waypointType, setWaypointType] = useState<'spatial' | 'temporal' | 'loop'>('spatial');

  // Common form fields
  const [waypointName, setWaypointName] = useState<string>("");
  const [description, setDescription] = useState("");
  const [miniDescription, setMiniDescription] = useState("");  // For watch display (max 20 chars)
  const [waypointColor, setWaypointColor] = useState("#ef4444");  // Default red
  const [calories, setCalories] = useState("");
  const [carbs, setCarbs] = useState("");
  const [protein, setProtein] = useState("");
  const [fat, setFat] = useState("");
  const [sodiumMg, setSodiumMg] = useState("");
  const [caffeineMg, setCaffeineMg] = useState("");
  const [quantity, setQuantity] = useState("");
  const [quantityUnit, setQuantityUnit] = useState("ml");
  const [notes, setNotes] = useState("");

  // Spatial waypoint fields
  const [triggerDistance, setTriggerDistance] = useState("");

  // Temporal single waypoint fields
  const [triggerTime, setTriggerTime] = useState("");

  // Temporal loop fields
  const [repeatStartTime, setRepeatStartTime] = useState("");
  const [repeatInterval, setRepeatInterval] = useState("");
  const [repeatCount, setRepeatCount] = useState("");
  const [loopColor, setLoopColor] = useState("#3b82f6");

  // Pre-fill distance when point is selected and switch to spatial tab
  useEffect(() => {
    if (selectedPoint && open && !editingWaypoint) {
      const distanceKm = selectedPoint.distanceFromStart?.toFixed(2) || "0";
      setTriggerDistance(distanceKm);
      setWaypointType('spatial');
    }
  }, [selectedPoint, open, editingWaypoint]);

  // Pre-fill all fields when editing existing waypoint
  useEffect(() => {
    if (editingWaypoint && open) {
      // Common fields
      setWaypointName(editingWaypoint.name || "Nuevo Waypoint");  // Use name field
      setDescription(editingWaypoint.product_name || "");  // product_name becomes description
      setMiniDescription(editingWaypoint.notes?.substring(0, 20) || "");  // First 20 chars of notes
      setWaypointColor(editingWaypoint.color || "#ef4444");
      setCalories(editingWaypoint.calories?.toString() || "");
      setCarbs(editingWaypoint.carbs?.toString() || "");
      setProtein(editingWaypoint.protein?.toString() || "");
      setFat(editingWaypoint.fat?.toString() || "");
      setSodiumMg(editingWaypoint.sodium_mg?.toString() || "");
      setCaffeineMg(editingWaypoint.caffeine_mg?.toString() || "");
      setQuantity(editingWaypoint.quantity?.toString() || "");
      setQuantityUnit(editingWaypoint.quantity_unit || "ml");
      setNotes(editingWaypoint.notes || "");

      // Determine waypoint type and fill specific fields
      if (isSpatialWaypoint(editingWaypoint)) {
        setWaypointType('spatial');
        setTriggerDistance(editingWaypoint.distance_from_start_km.toFixed(2));
      } else if (isRepeatingWaypoint(editingWaypoint)) {
        setWaypointType('loop');
        setRepeatStartTime(editingWaypoint.repeat_config.start_time_min.toString());
        setRepeatInterval(editingWaypoint.repeat_config.interval_min.toString());
        setRepeatCount(editingWaypoint.repeat_config.repetitions.toString());
        setLoopColor(editingWaypoint.color);
      } else {
        // Temporal single
        setWaypointType('temporal');
        setTriggerTime(editingWaypoint.trigger_time_min?.toString() || "");
      }
    }
  }, [editingWaypoint, open]);

  const resetForm = () => {
    setWaypointType('spatial');
    setWaypointName("Nuevo Waypoint");
    setDescription("");
    setMiniDescription("");
    setWaypointColor("#ef4444");
    setTriggerDistance("");
    setTriggerTime("");
    setRepeatStartTime("");
    setRepeatInterval("");
    setRepeatCount("");
    setLoopColor("#3b82f6");
    setCalories("");
    setCarbs("");
    setProtein("");
    setFat("");
    setSodiumMg("");
    setCaffeineMg("");
    setQuantity("");
    setQuantityUnit("ml");
    setNotes("");
    setError("");
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError("");

    try {
      // Build waypoint data based on type
      let waypointData: any;

      if (waypointType === 'spatial') {
        // Spatial waypoint validation
        if (!triggerDistance) {
          setError("Debes especificar la distancia para un waypoint espacial");
          setIsSaving(false);
          return;
        }

        // Find the closest track point if not selected from chart
        let pointToUse = selectedPoint;
        if (!pointToUse && trackPoints.length > 0) {
          const targetDistance = parseFloat(triggerDistance);
          pointToUse = trackPoints.reduce((prev, curr) => {
            const prevDist = Math.abs((prev.distanceFromStart || 0) - targetDistance);
            const currDist = Math.abs((curr.distanceFromStart || 0) - targetDistance);
            return currDist < prevDist ? curr : prev;
          });
        }

        if (!pointToUse) {
          setError("No se encontró un punto en el track para esta distancia");
          setIsSaving(false);
          return;
        }

        // Validate coordinates are valid numbers
        if (typeof pointToUse.lat !== 'number' || typeof pointToUse.lon !== 'number') {
          console.error('Invalid track point:', pointToUse);
          setError("El punto seleccionado no tiene coordenadas válidas");
          setIsSaving(false);
          return;
        }

        const distance = pointToUse.distanceFromStart ?? parseFloat(triggerDistance);
        if (typeof distance !== 'number' || isNaN(distance)) {
          console.error('Invalid distance:', { distanceFromStart: pointToUse.distanceFromStart, triggerDistance });
          setError("La distancia no es válida");
          setIsSaving(false);
          return;
        }

        // Validate waypoint name
        if (!waypointName.trim()) {
          setError("Debes especificar un nombre para el waypoint");
          setIsSaving(false);
          return;
        }

        // Validate mini description
        if (!miniDescription.trim()) {
          setError("Debes especificar una minidescripción para el reloj");
          setIsSaving(false);
          return;
        }

        waypointData = {
          type: 'spatial' as const,
          latitude: pointToUse.lat,
          longitude: pointToUse.lon,
          elevation_m: pointToUse.ele !== undefined ? pointToUse.ele : undefined,
          distance_from_start_km: distance,
          name: waypointName.trim(),  // Waypoint name (free-form text)
          product_name: description || miniDescription,  // Description or miniDescription as fallback
          calories: calories ? parseInt(calories) : undefined,
          carbs: carbs ? parseFloat(carbs) : undefined,
          protein: protein ? parseFloat(protein) : undefined,
          fat: fat ? parseFloat(fat) : undefined,
          sodium_mg: sodiumMg ? parseInt(sodiumMg) : undefined,
          caffeine_mg: caffeineMg ? parseInt(caffeineMg) : undefined,
          quantity: quantity ? parseFloat(quantity) : undefined,
          quantity_unit: quantityUnit || undefined,
          notes: miniDescription,  // Save miniDescription in notes for GPX export
          color: waypointColor,  // Save waypoint color
        };
      } else if (waypointType === 'temporal') {
        // Temporal single waypoint validation
        if (!triggerTime) {
          setError("Debes especificar el tiempo para un waypoint temporal");
          setIsSaving(false);
          return;
        }

        // Validate waypoint name
        if (!waypointName.trim()) {
          setError("Debes especificar un nombre para el waypoint");
          setIsSaving(false);
          return;
        }

        // Validate mini description
        if (!miniDescription.trim()) {
          setError("Debes especificar una minidescripción para el reloj");
          setIsSaving(false);
          return;
        }

        waypointData = {
          type: 'temporal' as const,
          trigger_time_min: parseInt(triggerTime),
          name: waypointName.trim(),  // Waypoint name (free-form text)
          product_name: description || miniDescription,  // Description or miniDescription as fallback
          calories: calories ? parseInt(calories) : undefined,
          carbs: carbs ? parseFloat(carbs) : undefined,
          protein: protein ? parseFloat(protein) : undefined,
          fat: fat ? parseFloat(fat) : undefined,
          sodium_mg: sodiumMg ? parseInt(sodiumMg) : undefined,
          caffeine_mg: caffeineMg ? parseInt(caffeineMg) : undefined,
          quantity: quantity ? parseFloat(quantity) : undefined,
          quantity_unit: quantityUnit || undefined,
          notes: miniDescription,  // Save miniDescription in notes for GPX export
          color: waypointColor,  // Save waypoint color
        };
      } else {
        // Temporal loop validation
        if (!repeatStartTime || !repeatInterval) {
          setError("Debes especificar tiempo de inicio e intervalo");
          setIsSaving(false);
          return;
        }

        // Get effective repetitions (user input or auto-calculated)
        const effectiveReps = getEffectiveRepetitions();
        if (!effectiveReps) {
          setError("Debes indicar número de repeticiones o establecer un tiempo estimado en el plan");
          setIsSaving(false);
          return;
        }

        // Validate waypoint name
        if (!waypointName.trim()) {
          setError("Debes especificar un nombre para el waypoint");
          setIsSaving(false);
          return;
        }

        // Validate mini description
        if (!miniDescription.trim()) {
          setError("Debes especificar una minidescripción para el reloj");
          setIsSaving(false);
          return;
        }

        waypointData = {
          type: 'temporal' as const,
          is_repeating: true,
          repeat_config: {
            start_time_min: parseInt(repeatStartTime),
            interval_min: parseInt(repeatInterval),
            // Only include repetitions if user specified them (backend will calculate if missing)
            ...(repeatCount ? { repetitions: parseInt(repeatCount) } : {}),
          },
          color: loopColor,  // Loop uses loopColor instead of waypointColor
          name: waypointName.trim(),  // Waypoint name (free-form text)
          product_name: description || miniDescription,  // Description or miniDescription as fallback
          calories: calories ? parseInt(calories) : undefined,
          carbs: carbs ? parseFloat(carbs) : undefined,
          protein: protein ? parseFloat(protein) : undefined,
          fat: fat ? parseFloat(fat) : undefined,
          sodium_mg: sodiumMg ? parseInt(sodiumMg) : undefined,
          caffeine_mg: caffeineMg ? parseInt(caffeineMg) : undefined,
          quantity: quantity ? parseFloat(quantity) : undefined,
          quantity_unit: quantityUnit || undefined,
          notes: miniDescription,  // Save miniDescription in notes for GPX export
        };
      }

      // Determine if creating or updating
      const isEditing = !!editingWaypoint;
      const method = isEditing ? "PATCH" : "POST";
      const url = isEditing
        ? `/api/gpx-plans/${planId}/waypoints?waypoint_id=${editingWaypoint.id}`
        : `/api/gpx-plans/${planId}/waypoints`;

      // Prepare request body
      let requestBody;
      if (isEditing) {
        // For PATCH: only send allowed update fields
        requestBody = {
          waypoint_id: editingWaypoint.id,
          name: waypointName.trim(),  // Updated field
          product_name: description || miniDescription,  // Updated field
          calories: waypointData.calories,
          carbs: waypointData.carbs,
          protein: waypointData.protein,
          fat: waypointData.fat,
          sodium_mg: waypointData.sodium_mg,
          caffeine_mg: waypointData.caffeine_mg,
          quantity: waypointData.quantity,
          quantity_unit: waypointData.quantity_unit,
          notes: miniDescription,  // Updated to save miniDescription
          color: waypointType === 'loop' ? loopColor : waypointColor,  // Updated color
        };
      } else {
        // For POST: send full waypoint data
        requestBody = waypointData;
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMsg = isEditing ? "Error al actualizar el waypoint" : "Error al crear el waypoint";
        // Include validation details if available
        if (errorData.details) {
          const detailsStr = errorData.details.map((d: any) => `${d.path?.join('.')}: ${d.message}`).join(', ');
          throw new Error(`${errorData.error}: ${detailsStr}`);
        }
        throw new Error(errorData.error || errorMsg);
      }

      // Success
      resetForm();
      onOpenChange(false);
      onWaypointCreated();
    } catch (err) {
      console.error("Save error:", err);
      setError(err instanceof Error ? err.message : "Error al guardar el waypoint");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!isSaving) {
      resetForm();
      onOpenChange(open);
    }
  };

  // Auto-calculate repetitions based on estimated duration
  const autoCalculateRepetitions = (): number | null => {
    if (!estimatedDuration || !repeatStartTime || !repeatInterval) return null;
    const start = parseInt(repeatStartTime);
    const interval = parseInt(repeatInterval);
    if (isNaN(start) || isNaN(interval) || interval <= 0) return null;
    // Calculate how many repetitions fit within the estimated duration
    const reps = Math.floor((estimatedDuration - start) / interval) + 1;
    return Math.min(Math.max(reps, 1), 50); // Clamp between 1 and 50
  };

  // Get effective repetition count (user input or auto-calculated)
  const getEffectiveRepetitions = (): number | null => {
    if (repeatCount) {
      return parseInt(repeatCount);
    }
    return autoCalculateRepetitions();
  };

  // Check if using auto-calculated repetitions
  const isUsingAutoCalculation = !repeatCount && autoCalculateRepetitions() !== null;

  // Calculate loop preview times
  const loopPreviewTimes = () => {
    const count = getEffectiveRepetitions();
    if (!repeatStartTime || !repeatInterval || !count) return [];
    const start = parseInt(repeatStartTime);
    const interval = parseInt(repeatInterval);
    return Array.from({ length: count }, (_, i) => start + (i * interval));
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">
            {editingWaypoint ? "Editar Waypoint" : "Nuevo Waypoint"}
          </DialogTitle>

          {/* Editable title with color picker */}
          <div className="flex items-center gap-3 mb-2">
            <div className="relative group">
              <button
                type="button"
                onClick={() => {
                  // Toggle color picker
                  const colorPicker = document.getElementById('waypoint-color-picker');
                  if (colorPicker) {
                    colorPicker.classList.toggle('hidden');
                  }
                }}
                className="w-8 h-8 rounded-full border-2 border-white shadow-md hover:scale-110 transition-transform cursor-pointer"
                style={{ backgroundColor: waypointType === 'loop' ? loopColor : waypointColor }}
                title="Cambiar color"
                aria-label="Cambiar color del waypoint"
              />

              {/* Color picker dropdown */}
              <div
                id="waypoint-color-picker"
                className="hidden absolute top-10 left-0 bg-white border border-gray-300 rounded-lg shadow-lg p-3 z-50"
              >
                <div className="flex gap-2 flex-wrap" style={{ width: '200px' }}>
                  {LOOP_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => {
                        if (waypointType === 'loop') {
                          setLoopColor(color.value);
                        } else {
                          setWaypointColor(color.value);
                        }
                        document.getElementById('waypoint-color-picker')?.classList.add('hidden');
                      }}
                      className="w-8 h-8 rounded-full border-2 border-gray-200 hover:border-gray-900 transition-colors"
                      style={{ backgroundColor: color.value }}
                      title={color.label}
                      aria-label={`Seleccionar color ${color.label}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-1">
              <Input
                value={waypointName}
                onChange={(e) => setWaypointName(e.target.value)}
                className="text-lg font-semibold border-none shadow-none focus-visible:ring-0 px-0"
                placeholder="Nombre del waypoint"
                disabled={isSaving}
                maxLength={50}
                aria-label="Nombre del waypoint"
              />
            </div>
          </div>

          <DialogDescription>
            {selectedPoint ? (
              <span className="flex items-center gap-1 mt-1">
                <MapPin className="h-4 w-4" />
                KM {selectedPoint.distanceFromStart?.toFixed(2)} | {Math.round(selectedPoint.ele || 0)}m
              </span>
            ) : (
              <span className="mt-1">Elige el tipo de waypoint: por distancia, tiempo o repetición</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          {/* Waypoint Type Tabs */}
          <Tabs value={waypointType} onValueChange={(v) => setWaypointType(v as 'spatial' | 'temporal' | 'loop')}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="spatial" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Distancia
              </TabsTrigger>
              <TabsTrigger value="temporal" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Tiempo
              </TabsTrigger>
              <TabsTrigger value="loop" className="flex items-center gap-2">
                <Repeat className="h-4 w-4" />
                Repetir
              </TabsTrigger>
            </TabsList>

            {/* SPATIAL TAB */}
            <TabsContent value="spatial" className="space-y-4 mt-4">
              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
                <strong>Waypoint Espacial:</strong> Se activa en un punto específico de la ruta (por kilómetro).
                Aparece en el mapa y en el gráfico de elevación.
              </div>

              <div>
                <Label htmlFor="spatial-distance">Distancia (km) *</Label>
                <Input
                  id="spatial-distance"
                  type="number"
                  step="0.1"
                  value={triggerDistance}
                  onChange={(e) => setTriggerDistance(e.target.value)}
                  placeholder="Ej: 25.5"
                  disabled={isSaving}
                />
                <p className="text-xs text-muted-foreground mt-1">En el kilómetro...</p>
              </div>
            </TabsContent>

            {/* TEMPORAL TAB */}
            <TabsContent value="temporal" className="space-y-4 mt-4">
              <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-800">
                <strong>Waypoint Temporal:</strong> Se activa en un momento específico (por minutos transcurridos).
                Aparece en la línea temporal, no en el mapa.
              </div>

              <div>
                <Label htmlFor="temporal-time">Tiempo (minutos) *</Label>
                <Input
                  id="temporal-time"
                  type="number"
                  value={triggerTime}
                  onChange={(e) => setTriggerTime(e.target.value)}
                  placeholder="Ej: 60"
                  disabled={isSaving}
                />
                <p className="text-xs text-muted-foreground mt-1">A los X minutos desde el inicio...</p>
              </div>
            </TabsContent>

            {/* LOOP TAB */}
            <TabsContent value="loop" className="space-y-4 mt-4">
              <div className="bg-purple-50 border border-purple-200 rounded p-3 text-sm text-purple-800">
                <strong>Waypoint Repetitivo:</strong> Crea múltiples waypoints temporales a intervalos regulares.
                Útil para hidratación recurrente.
              </div>

              <div>
                <Label htmlFor="loop-start">Tiempo de inicio (minutos) *</Label>
                <Input
                  id="loop-start"
                  type="number"
                  value={repeatStartTime}
                  onChange={(e) => setRepeatStartTime(e.target.value)}
                  placeholder="Ej: 20"
                  disabled={isSaving}
                />
                <p className="text-xs text-muted-foreground mt-1">Primer waypoint a los...</p>
              </div>

              <div>
                <Label htmlFor="loop-interval">Intervalo (minutos) *</Label>
                <Input
                  id="loop-interval"
                  type="number"
                  value={repeatInterval}
                  onChange={(e) => setRepeatInterval(e.target.value)}
                  placeholder="Ej: 20"
                  disabled={isSaving}
                />
                <p className="text-xs text-muted-foreground mt-1">Cada cuántos minutos...</p>
              </div>

              <div>
                <Label htmlFor="loop-count">
                  Número de repeticiones {estimatedDuration ? "(opcional)" : "*"}
                </Label>
                <Input
                  id="loop-count"
                  type="number"
                  value={repeatCount}
                  onChange={(e) => setRepeatCount(e.target.value)}
                  placeholder={isUsingAutoCalculation ? `Auto: ${autoCalculateRepetitions()}` : "Ej: 10"}
                  disabled={isSaving}
                  max={50}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {estimatedDuration
                    ? `Cuántas veces (máx 50). Déjalo vacío para calcular según tiempo estimado (${estimatedDuration} min)`
                    : "Cuántas veces (máx 50)..."
                  }
                </p>
              </div>

              {/* Color selector removed - now in header */}

              {/* Preview */}
              {loopPreviewTimes().length > 0 && (
                <div className="bg-indigo-50 border border-indigo-200 rounded p-4">
                  <p className="text-sm font-semibold text-indigo-900 mb-2">
                    📋 Vista previa: Se crearán {loopPreviewTimes().length} waypoints
                    {isUsingAutoCalculation && (
                      <span className="text-indigo-600 font-normal ml-1">(auto-calculado)</span>
                    )}
                  </p>
                  <p className="text-xs text-indigo-700">
                    Minutos: {loopPreviewTimes().join(', ')}
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Common waypoint fields */}
          <div className="border-t pt-4 space-y-4">
            <h3 className="font-semibold text-sm text-gray-700">Información del Waypoint</h3>

            {/* Mini Description (for watch display) */}
            <div>
              <Label htmlFor="mini-description">Minidescripción (para reloj) *</Label>
              <Input
                id="mini-description"
                value={miniDescription}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= 20) {
                    setMiniDescription(value);
                  }
                }}
                placeholder="Ej: Gel Maurten"
                disabled={isSaving}
                maxLength={20}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Máximo 20 caracteres - Texto que aparece en el reloj GPS ({miniDescription.length}/20)
              </p>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej: Maurten Gel 100 CAF, sabor vainilla"
                disabled={isSaving}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Descripción detallada del waypoint
              </p>
            </div>

          {/* Macronutrients */}
          <div>
            <Label className="mb-2 block">Macronutrientes (opcional)</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="calories" className="text-xs">Calorías (kcal)</Label>
                <Input
                  id="calories"
                  type="number"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  placeholder="87"
                  disabled={isSaving}
                />
              </div>
              <div>
                <Label htmlFor="carbs" className="text-xs">Carbohidratos (g)</Label>
                <Input
                  id="carbs"
                  type="number"
                  step="0.1"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  placeholder="22"
                  disabled={isSaving}
                />
              </div>
              <div>
                <Label htmlFor="protein" className="text-xs">Proteína (g)</Label>
                <Input
                  id="protein"
                  type="number"
                  step="0.1"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                  placeholder="0"
                  disabled={isSaving}
                />
              </div>
              <div>
                <Label htmlFor="fat" className="text-xs">Grasa (g)</Label>
                <Input
                  id="fat"
                  type="number"
                  step="0.1"
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                  placeholder="0"
                  disabled={isSaving}
                />
              </div>
              <div>
                <Label htmlFor="sodium" className="text-xs">Sodio (mg)</Label>
                <Input
                  id="sodium"
                  type="number"
                  value={sodiumMg}
                  onChange={(e) => setSodiumMg(e.target.value)}
                  placeholder="200"
                  disabled={isSaving}
                />
              </div>
              <div>
                <Label htmlFor="caffeine" className="text-xs">Cafeína (mg)</Label>
                <Input
                  id="caffeine"
                  type="number"
                  value={caffeineMg}
                  onChange={(e) => setCaffeineMg(e.target.value)}
                  placeholder="75"
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>

          {/* Quantity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantity">Cantidad</Label>
              <Input
                id="quantity"
                type="number"
                step="0.1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Ej: 200"
                disabled={isSaving}
              />
            </div>
            <div>
              <Label htmlFor="quantity-unit">Unidad</Label>
              <Select
                id="quantity-unit"
                value={quantityUnit}
                onChange={(e) => setQuantityUnit(e.target.value)}
                disabled={isSaving}
                className="mt-1"
              >
                <option value="ml">ml</option>
                <option value="g">g</option>
                <option value="units">unidades</option>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Instrucciones adicionales..."
              rows={2}
              disabled={isSaving}
              maxLength={1000}
            />
          </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Guardando..." : (editingWaypoint ? "Actualizar Waypoint" : "Crear Waypoint")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
