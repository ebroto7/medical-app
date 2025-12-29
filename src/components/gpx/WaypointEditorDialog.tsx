"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { MapPin } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import type { GPXTrackPoint } from "@/lib/gpx/parser";

interface WaypointEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  selectedPoint: GPXTrackPoint | null;
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

export function WaypointEditorDialog({
  open,
  onOpenChange,
  planId,
  selectedPoint,
  onWaypointCreated,
}: WaypointEditorDialogProps) {
  const { token } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  // Form fields
  const [nutritionType, setNutritionType] = useState<string>("hydration");
  const [productName, setProductName] = useState("");
  const [triggerDistance, setTriggerDistance] = useState("");
  const [triggerTime, setTriggerTime] = useState("");
  const [calories, setCalories] = useState("");
  const [carbs, setCarbs] = useState("");
  const [protein, setProtein] = useState("");
  const [fat, setFat] = useState("");
  const [sodiumMg, setSodiumMg] = useState("");
  const [caffeineMg, setCaffeineMg] = useState("");
  const [quantity, setQuantity] = useState("");
  const [quantityUnit, setQuantityUnit] = useState("ml");
  const [notes, setNotes] = useState("");

  // Pre-fill distance when point is selected
  useEffect(() => {
    if (selectedPoint && open) {
      const distanceKm = selectedPoint.distanceFromStart?.toFixed(1) || "0";
      setTriggerDistance(distanceKm);
    }
  }, [selectedPoint, open]);

  const resetForm = () => {
    setNutritionType("hydration");
    setProductName("");
    setTriggerDistance("");
    setTriggerTime("");
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
    // Validation
    if (!triggerDistance && !triggerTime) {
      setError("Debes especificar al menos un trigger (distancia o tiempo)");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      const waypointData = {
        // If selectedPoint exists, use its coordinates; otherwise use placeholder
        latitude: selectedPoint?.lat || 0,
        longitude: selectedPoint?.lon || 0,
        elevation_m: selectedPoint?.ele || undefined,
        distance_from_start_km: selectedPoint?.distanceFromStart || (triggerDistance ? parseFloat(triggerDistance) : undefined),
        trigger_distance_km: triggerDistance ? parseFloat(triggerDistance) : undefined,
        trigger_time_min: triggerTime ? parseInt(triggerTime) : undefined,
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

      const response = await fetch(`/api/gpx-plans/${planId}/waypoints`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(waypointData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al crear el waypoint");
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Waypoint Nutricional</DialogTitle>
          <DialogDescription>
            {selectedPoint ? (
              <span className="flex items-center gap-1 mt-1">
                <MapPin className="h-4 w-4" />
                KM {selectedPoint.distanceFromStart?.toFixed(2)} | {Math.round(selectedPoint.ele || 0)}m
              </span>
            ) : (
              <span className="mt-1">Configura un waypoint especificando distancia y/o tiempo</span>
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

          {/* Triggers */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="trigger-distance">Distancia (km)</Label>
              <Input
                id="trigger-distance"
                type="number"
                step="0.1"
                value={triggerDistance}
                onChange={(e) => setTriggerDistance(e.target.value)}
                placeholder="Ej: 25.5"
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground mt-1">En el kilómetro...</p>
            </div>
            <div>
              <Label htmlFor="trigger-time">Tiempo (minutos)</Label>
              <Input
                id="trigger-time"
                type="number"
                value={triggerTime}
                onChange={(e) => setTriggerTime(e.target.value)}
                placeholder="Ej: 120"
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground mt-1">A los X minutos...</p>
            </div>
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

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Guardando..." : "Guardar Waypoint"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
