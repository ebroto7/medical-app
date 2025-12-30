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
  selectedPoint: GPXTrackPoint | null;
  editingWaypoint?: Waypoint | null;
  onWaypointCreated: () => void;
}

const NUTRITION_TYPES = [
  { value: 'hydration', label: 'Hidratación (Agua)' },
  { value: 'isotonic_drink', label: 'Bebida Isotónica' },
  { value: 'energy_gel', label: 'Gel Energético' },
  { value: 'solid_food', label: 'Comida Sólida' },
  { value: 'salt_caps', label: 'Cápsulas de Sal' },
  { value: 'caffeine', label: 'Cafeína' },
  { value: 'custom', label: 'Personalizado' },
];

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
  selectedPoint,
  editingWaypoint,
  onWaypointCreated,
}: WaypointEditorDialogProps) {
  const { token } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  // Tab selection
  const [waypointType, setWaypointType] = useState<'spatial' | 'temporal' | 'loop'>('spatial');

  // Common form fields
  const [nutritionType, setNutritionType] = useState<string>("hydration");
  const [productName, setProductName] = useState("");
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
      const distanceKm = selectedPoint.distanceFromStart?.toFixed(1) || "0";
      setTriggerDistance(distanceKm);
      setWaypointType('spatial');
    }
  }, [selectedPoint, open, editingWaypoint]);

  // Pre-fill all fields when editing existing waypoint
  useEffect(() => {
    if (editingWaypoint && open) {
      // Common fields
      setNutritionType(editingWaypoint.nutrition_type);
      setProductName(editingWaypoint.product_name || "");
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
        setTriggerDistance(editingWaypoint.distance_from_start_km.toFixed(1));
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
    setNutritionType("hydration");
    setProductName("");
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

        waypointData = {
          type: 'spatial' as const,
          latitude: selectedPoint?.lat || 0,
          longitude: selectedPoint?.lon || 0,
          elevation_m: selectedPoint?.ele || undefined,
          distance_from_start_km: selectedPoint?.distanceFromStart || parseFloat(triggerDistance),
          nutrition_type: nutritionType,
          product_name: productName || undefined,
          calories: calories ? parseInt(calories) : undefined,
          carbs: carbs ? parseFloat(carbs) : undefined,
          protein: protein ? parseFloat(protein) : undefined,
          fat: fat ? parseFloat(fat) : undefined,
          sodium_mg: sodiumMg ? parseInt(sodiumMg) : undefined,
          caffeine_mg: caffeineMg ? parseInt(caffeineMg) : undefined,
          quantity: quantity ? parseFloat(quantity) : undefined,
          quantity_unit: quantityUnit || undefined,
          notes: notes || undefined,
        };
      } else if (waypointType === 'temporal') {
        // Temporal single waypoint validation
        if (!triggerTime) {
          setError("Debes especificar el tiempo para un waypoint temporal");
          setIsSaving(false);
          return;
        }

        waypointData = {
          type: 'temporal' as const,
          trigger_time_min: parseInt(triggerTime),
          nutrition_type: nutritionType,
          product_name: productName || undefined,
          calories: calories ? parseInt(calories) : undefined,
          carbs: carbs ? parseFloat(carbs) : undefined,
          protein: protein ? parseFloat(protein) : undefined,
          fat: fat ? parseFloat(fat) : undefined,
          sodium_mg: sodiumMg ? parseInt(sodiumMg) : undefined,
          caffeine_mg: caffeineMg ? parseInt(caffeineMg) : undefined,
          quantity: quantity ? parseFloat(quantity) : undefined,
          quantity_unit: quantityUnit || undefined,
          notes: notes || undefined,
        };
      } else {
        // Temporal loop validation
        if (!repeatStartTime || !repeatInterval || !repeatCount) {
          setError("Debes especificar tiempo de inicio, intervalo y número de repeticiones");
          setIsSaving(false);
          return;
        }

        waypointData = {
          type: 'temporal' as const,
          is_repeating: true,
          repeat_config: {
            start_time_min: parseInt(repeatStartTime),
            interval_min: parseInt(repeatInterval),
            repetitions: parseInt(repeatCount),
          },
          color: loopColor,
          nutrition_type: nutritionType,
          product_name: productName || undefined,
          calories: calories ? parseInt(calories) : undefined,
          carbs: carbs ? parseFloat(carbs) : undefined,
          protein: protein ? parseFloat(protein) : undefined,
          fat: fat ? parseFloat(fat) : undefined,
          sodium_mg: sodiumMg ? parseInt(sodiumMg) : undefined,
          caffeine_mg: caffeineMg ? parseInt(caffeineMg) : undefined,
          quantity: quantity ? parseFloat(quantity) : undefined,
          quantity_unit: quantityUnit || undefined,
          notes: notes || undefined,
        };
      }

      // Determine if creating or updating
      const isEditing = !!editingWaypoint;
      const method = isEditing ? "PATCH" : "POST";
      const url = isEditing
        ? `/api/gpx-plans/${planId}/waypoints?waypoint_id=${editingWaypoint.id}`
        : `/api/gpx-plans/${planId}/waypoints`;

      // If editing, add waypoint_id to the data
      if (isEditing) {
        waypointData.waypoint_id = editingWaypoint.id;
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(waypointData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMsg = isEditing ? "Error al actualizar el waypoint" : "Error al crear el waypoint";
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

  // Calculate loop preview times
  const loopPreviewTimes = () => {
    if (!repeatStartTime || !repeatInterval || !repeatCount) return [];
    const start = parseInt(repeatStartTime);
    const interval = parseInt(repeatInterval);
    const count = parseInt(repeatCount);
    return Array.from({ length: count }, (_, i) => start + (i * interval));
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingWaypoint ? "Editar Waypoint Nutricional" : "Nuevo Waypoint Nutricional"}</DialogTitle>
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
                <Label htmlFor="loop-count">Número de repeticiones *</Label>
                <Input
                  id="loop-count"
                  type="number"
                  value={repeatCount}
                  onChange={(e) => setRepeatCount(e.target.value)}
                  placeholder="Ej: 10"
                  disabled={isSaving}
                  max={50}
                />
                <p className="text-xs text-muted-foreground mt-1">Cuántas veces (máx 50)...</p>
              </div>

              <div>
                <Label>Color del bucle *</Label>
                <div className="grid grid-cols-4 gap-3 mt-2">
                  {LOOP_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setLoopColor(color.value)}
                      disabled={isSaving}
                      className={`
                        relative flex items-center justify-center h-12 rounded-lg border-2 transition-all
                        ${loopColor === color.value
                          ? 'border-gray-900 ring-2 ring-gray-900 ring-offset-2 scale-105'
                          : 'border-gray-300 hover:border-gray-400 hover:scale-105'
                        }
                        ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                      title={color.label}
                    >
                      <div
                        className="w-8 h-8 rounded-full"
                        style={{ backgroundColor: color.value }}
                      />
                      {loopColor === color.value && (
                        <div className="absolute -top-1 -right-1 bg-gray-900 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                          ✓
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Elige un color para identificar este bucle en la timeline
                </p>
              </div>

              {/* Preview */}
              {loopPreviewTimes().length > 0 && (
                <div className="bg-indigo-50 border border-indigo-200 rounded p-4">
                  <p className="text-sm font-semibold text-indigo-900 mb-2">
                    📋 Vista previa: Se crearán {loopPreviewTimes().length} waypoints
                  </p>
                  <p className="text-xs text-indigo-700">
                    Minutos: {loopPreviewTimes().join(', ')}
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Common nutrition fields */}
          <div className="border-t pt-4 space-y-4">
            <h3 className="font-semibold text-sm text-gray-700">Datos Nutricionales</h3>

            {/* Nutrition Type */}
            <div>
              <Label htmlFor="nutrition-type">Tipo de Nutrición *</Label>
              <Select
                id="nutrition-type"
                value={nutritionType}
                onChange={(e) => setNutritionType(e.target.value)}
                disabled={isSaving}
                className="mt-1"
              >
                {NUTRITION_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </Select>
            </div>

            {/* Product Name */}
            <div>
              <Label htmlFor="product-name">Producto</Label>
              <Input
                id="product-name"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Ej: Gel SIS Isotónico, Aquarius, etc."
                disabled={isSaving}
                maxLength={200}
              />
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
