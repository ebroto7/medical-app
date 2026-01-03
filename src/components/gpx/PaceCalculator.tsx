"use client";

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Gauge, TrendingUp, Pencil, Check, X, Loader2 } from "lucide-react";

interface PaceCalculatorProps {
  distanceKm: number;
  elevationGainM: number;
  estimatedDurationMinutes: number | null;
  onDurationChange: (minutes: number) => Promise<void>;
}

type EditingField = 'duration' | 'pace' | 'elevation' | null;

export function PaceCalculator({
  distanceKm,
  elevationGainM,
  estimatedDurationMinutes,
  onDurationChange,
}: PaceCalculatorProps) {
  const [editingField, setEditingField] = useState<EditingField>(null);
  const [inputValue, setInputValue] = useState("");
  const [saving, setSaving] = useState(false);

  // Calculate derived values
  const calculations = useMemo(() => {
    if (!estimatedDurationMinutes || !distanceKm) {
      return {
        paceMinPerKm: null,
        elevationPerHour: null,
      };
    }

    const paceMinPerKm = estimatedDurationMinutes / distanceKm;
    const hours = estimatedDurationMinutes / 60;
    const elevationPerHour = hours > 0 ? elevationGainM / hours : 0;

    return {
      paceMinPerKm,
      elevationPerHour,
    };
  }, [estimatedDurationMinutes, distanceKm, elevationGainM]);

  // Format duration as HH:MM:SS
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    const secs = Math.round((minutes % 1) * 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Format pace as MM:SS /km
  const formatPace = (minPerKm: number): string => {
    const mins = Math.floor(minPerKm);
    const secs = Math.round((minPerKm % 1) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Parse pace input (MM:SS or just minutes)
  const parsePaceInput = (input: string): number | null => {
    // Try MM:SS format
    if (input.includes(':')) {
      const [mins, secs] = input.split(':').map(Number);
      if (!isNaN(mins) && !isNaN(secs)) {
        return mins + secs / 60;
      }
    }
    // Try just minutes
    const mins = parseFloat(input);
    return isNaN(mins) ? null : mins;
  };

  // Start editing a field
  const handleStartEdit = (field: EditingField) => {
    if (field === 'duration' && estimatedDurationMinutes) {
      setInputValue(estimatedDurationMinutes.toString());
    } else if (field === 'pace' && calculations.paceMinPerKm) {
      setInputValue(formatPace(calculations.paceMinPerKm));
    } else if (field === 'elevation' && calculations.elevationPerHour) {
      setInputValue(Math.round(calculations.elevationPerHour).toString());
    }
    setEditingField(field);
  };

  // Cancel editing
  const handleCancel = () => {
    setEditingField(null);
    setInputValue("");
  };

  // Save the edited value
  const handleSave = useCallback(async () => {
    if (!editingField || !inputValue) return;

    let newDurationMinutes: number | null = null;

    if (editingField === 'duration') {
      // Direct duration input in minutes
      newDurationMinutes = parseFloat(inputValue);
    } else if (editingField === 'pace') {
      // Calculate duration from pace
      const paceMinPerKm = parsePaceInput(inputValue);
      if (paceMinPerKm && distanceKm) {
        newDurationMinutes = paceMinPerKm * distanceKm;
      }
    } else if (editingField === 'elevation') {
      // Calculate duration from elevation gain per hour
      const elevPerHour = parseFloat(inputValue);
      if (elevPerHour && elevationGainM) {
        // hours = elevationGainM / elevPerHour
        // minutes = hours * 60
        newDurationMinutes = (elevationGainM / elevPerHour) * 60;
      }
    }

    if (newDurationMinutes && newDurationMinutes > 0 && newDurationMinutes <= 2880) {
      setSaving(true);
      try {
        await onDurationChange(Math.round(newDurationMinutes));
        setEditingField(null);
        setInputValue("");
      } catch (error) {
        console.error("Error saving duration:", error);
      } finally {
        setSaving(false);
      }
    }
  }, [editingField, inputValue, distanceKm, elevationGainM, onDurationChange]);

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') handleCancel();
  };

  // Render edit controls
  const renderEditControls = () => (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Check className="h-3 w-3 text-green-600" />
        )}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={handleCancel}
        disabled={saving}
      >
        <X className="h-3 w-3 text-red-600" />
      </Button>
    </div>
  );

  return (
    <Card className="hover:shadow-md transition-shadow border-gray-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          Estimaciones de Ritmo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tiempo Estimado */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-cyan-50 rounded-lg">
              <Clock className="h-4 w-4 text-cyan-600" />
            </div>
            <span className="text-sm text-gray-600">Tiempo</span>
          </div>
          {editingField === 'duration' ? (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="min"
                min={1}
                max={2880}
                className="w-20 h-8 text-sm text-right"
                autoFocus
                onKeyDown={handleKeyDown}
              />
              <span className="text-xs text-gray-500">min</span>
              {renderEditControls()}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-900">
                {estimatedDurationMinutes ? formatDuration(estimatedDurationMinutes) : "—"}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleStartEdit('duration')}
                title="Editar tiempo"
              >
                <Pencil className="h-3 w-3 text-gray-400" />
              </Button>
            </div>
          )}
        </div>

        {/* Ritmo Medio */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 rounded-lg">
              <Gauge className="h-4 w-4 text-blue-600" />
            </div>
            <span className="text-sm text-gray-600">Ritmo</span>
          </div>
          {editingField === 'pace' ? (
            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="MM:SS"
                className="w-20 h-8 text-sm text-right"
                autoFocus
                onKeyDown={handleKeyDown}
              />
              <span className="text-xs text-gray-500">/km</span>
              {renderEditControls()}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-900">
                {calculations.paceMinPerKm ? `${formatPace(calculations.paceMinPerKm)} /km` : "—"}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleStartEdit('pace')}
                title="Editar ritmo"
                disabled={!distanceKm}
              >
                <Pencil className="h-3 w-3 text-gray-400" />
              </Button>
            </div>
          )}
        </div>

        {/* Desnivel por hora */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-green-50 rounded-lg">
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <span className="text-sm text-gray-600">Desnivel/h</span>
          </div>
          {editingField === 'elevation' ? (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="m/h"
                min={1}
                className="w-20 h-8 text-sm text-right"
                autoFocus
                onKeyDown={handleKeyDown}
              />
              <span className="text-xs text-gray-500">m/h</span>
              {renderEditControls()}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-900">
                {calculations.elevationPerHour ? `${Math.round(calculations.elevationPerHour)} m/h` : "—"}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleStartEdit('elevation')}
                title="Editar desnivel/hora"
                disabled={!elevationGainM}
              >
                <Pencil className="h-3 w-3 text-gray-400" />
              </Button>
            </div>
          )}
        </div>

        {/* Help text */}
        <p className="text-xs text-gray-400 pt-2 border-t">
          Edita cualquier valor y los otros se recalcularán
        </p>
      </CardContent>
    </Card>
  );
}
