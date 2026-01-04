"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";

export interface NutritionFormData {
  miniDescription: string;
  description: string;
  calories: string;
  carbs: string;
  protein: string;
  fat: string;
  sodiumMg: string;
  caffeineMg: string;
  quantity: string;
  quantityUnit: string;
  notes: string;
}

interface NutritionFieldsFormProps {
  data: NutritionFormData;
  onChange: (field: keyof NutritionFormData, value: string) => void;
  disabled?: boolean;
}

/**
 * Reusable nutrition fields form component for waypoint editor
 * Extracted from WaypointEditorDialog for better separation of concerns
 */
export function NutritionFieldsForm({ data, onChange, disabled }: NutritionFieldsFormProps) {
  return (
    <div className="border-t pt-4 space-y-4">
      <h3 className="font-semibold text-sm text-gray-700">Informaci&oacute;n del Waypoint</h3>

      {/* Mini Description (for watch display) */}
      <div>
        <Label htmlFor="mini-description">Minidescripci&oacute;n (para reloj) *</Label>
        <Input
          id="mini-description"
          value={data.miniDescription}
          onChange={(e) => {
            const value = e.target.value;
            if (value.length <= 20) {
              onChange("miniDescription", value);
            }
          }}
          placeholder="Ej: Gel Maurten"
          disabled={disabled}
          maxLength={20}
        />
        <p className="text-xs text-muted-foreground mt-1">
          M&aacute;ximo 20 caracteres - Texto que aparece en el reloj GPS ({data.miniDescription.length}/20)
        </p>
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description">Descripci&oacute;n (opcional)</Label>
        <Input
          id="description"
          value={data.description}
          onChange={(e) => onChange("description", e.target.value)}
          placeholder="Ej: Maurten Gel 100 CAF, sabor vainilla"
          disabled={disabled}
          maxLength={200}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Descripci&oacute;n detallada del waypoint
        </p>
      </div>

      {/* Macronutrients */}
      <div>
        <Label className="mb-2 block">Macronutrientes (opcional)</Label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="calories" className="text-xs">Calor&iacute;as (kcal)</Label>
            <Input
              id="calories"
              type="number"
              value={data.calories}
              onChange={(e) => onChange("calories", e.target.value)}
              placeholder="87"
              disabled={disabled}
            />
          </div>
          <div>
            <Label htmlFor="carbs" className="text-xs">Carbohidratos (g)</Label>
            <Input
              id="carbs"
              type="number"
              step="0.1"
              value={data.carbs}
              onChange={(e) => onChange("carbs", e.target.value)}
              placeholder="22"
              disabled={disabled}
            />
          </div>
          <div>
            <Label htmlFor="protein" className="text-xs">Prote&iacute;na (g)</Label>
            <Input
              id="protein"
              type="number"
              step="0.1"
              value={data.protein}
              onChange={(e) => onChange("protein", e.target.value)}
              placeholder="0"
              disabled={disabled}
            />
          </div>
          <div>
            <Label htmlFor="fat" className="text-xs">Grasa (g)</Label>
            <Input
              id="fat"
              type="number"
              step="0.1"
              value={data.fat}
              onChange={(e) => onChange("fat", e.target.value)}
              placeholder="0"
              disabled={disabled}
            />
          </div>
          <div>
            <Label htmlFor="sodium" className="text-xs">Sodio (mg)</Label>
            <Input
              id="sodium"
              type="number"
              value={data.sodiumMg}
              onChange={(e) => onChange("sodiumMg", e.target.value)}
              placeholder="200"
              disabled={disabled}
            />
          </div>
          <div>
            <Label htmlFor="caffeine" className="text-xs">Cafe&iacute;na (mg)</Label>
            <Input
              id="caffeine"
              type="number"
              value={data.caffeineMg}
              onChange={(e) => onChange("caffeineMg", e.target.value)}
              placeholder="75"
              disabled={disabled}
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
            value={data.quantity}
            onChange={(e) => onChange("quantity", e.target.value)}
            placeholder="Ej: 200"
            disabled={disabled}
          />
        </div>
        <div>
          <Label htmlFor="quantity-unit">Unidad</Label>
          <Select
            id="quantity-unit"
            value={data.quantityUnit}
            onChange={(e) => onChange("quantityUnit", e.target.value)}
            disabled={disabled}
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
          value={data.notes}
          onChange={(e) => onChange("notes", e.target.value)}
          placeholder="Instrucciones adicionales..."
          rows={2}
          disabled={disabled}
          maxLength={1000}
        />
      </div>
    </div>
  );
}

export const createEmptyNutritionData = (): NutritionFormData => ({
  miniDescription: "",
  description: "",
  calories: "",
  carbs: "",
  protein: "",
  fat: "",
  sodiumMg: "",
  caffeineMg: "",
  quantity: "",
  quantityUnit: "ml",
  notes: "",
});
