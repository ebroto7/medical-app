"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Activity, Clock, Gauge, TrendingUp, Pencil, Check, X, Loader2 } from "lucide-react";

// Sport type options
const SPORT_TYPES = [
  { value: "running", label: "Running" },
  { value: "trail_running", label: "Trail Running" },
  { value: "cycling", label: "Ciclismo" },
  { value: "mtb", label: "MTB" },
  { value: "hiking", label: "Senderismo" },
  { value: "swimming", label: "Natación" },
  { value: "triathlon", label: "Triatlón" },
  { value: "other", label: "Otro" },
];

// Format sport type for display
function formatSportType(type: string): string {
  const found = SPORT_TYPES.find(s => s.value === type);
  return found?.label || type;
}

// Format duration as HH:MM
function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  return `${hours}:${mins.toString().padStart(2, '0')}`;
}

// Format pace as MM:SS /km
function formatPace(minPerKm: number): string {
  const mins = Math.floor(minPerKm);
  const secs = Math.round((minPerKm % 1) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Parse pace input (MM:SS or just minutes)
function parsePaceInput(input: string): number | null {
  if (input.includes(':')) {
    const [mins, secs] = input.split(':').map(Number);
    if (!isNaN(mins) && !isNaN(secs)) {
      return mins + secs / 60;
    }
  }
  const mins = parseFloat(input);
  return isNaN(mins) ? null : mins;
}

// ============================================
// Editable Sport Card
// ============================================
interface EditableSportCardProps {
  sportType: string;
  onSave: (sportType: string) => Promise<void>;
}

export function EditableSportCard({ sportType, onSave }: EditableSportCardProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(sportType);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (value === sportType) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(value);
      setEditing(false);
    } catch (error) {
      console.error("Error saving sport type:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setValue(sportType);
    setEditing(false);
  };

  return (
    <Card className="hover:shadow-md transition-shadow border-gray-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">Deporte</CardTitle>
        <div className="p-2 bg-orange-50 rounded-lg">
          <Activity className="h-4 w-4 text-orange-600" />
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="flex items-center gap-2">
            <Select
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-8 text-sm flex-1"
            >
              {SPORT_TYPES.map((sport) => (
                <option key={sport.value} value={sport.value}>
                  {sport.label}
                </option>
              ))}
            </Select>
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
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-gray-900">
              {formatSportType(sportType)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setEditing(true)}
            >
              <Pencil className="h-3 w-3 text-gray-400" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// Editable Duration Card
// ============================================
interface EditableDurationCardProps {
  durationMinutes: number | null;
  onSave: (minutes: number) => Promise<void>;
}

export function EditableDurationCard({ durationMinutes, onSave }: EditableDurationCardProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(durationMinutes?.toString() || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const minutes = parseFloat(value);
    if (isNaN(minutes) || minutes <= 0 || minutes > 2880) return;

    setSaving(true);
    try {
      await onSave(Math.round(minutes));
      setEditing(false);
    } catch (error) {
      console.error("Error saving duration:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setValue(durationMinutes?.toString() || "");
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') handleCancel();
  };

  return (
    <Card className="hover:shadow-md transition-shadow border-gray-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">Tiempo</CardTitle>
        <div className="p-2 bg-cyan-50 rounded-lg">
          <Clock className="h-4 w-4 text-cyan-600" />
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="min"
              min={1}
              max={2880}
              className="h-8 text-sm w-20"
              autoFocus
              onKeyDown={handleKeyDown}
            />
            <span className="text-xs text-gray-500">min</span>
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
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-gray-900">
              {durationMinutes ? formatDuration(durationMinutes) : "—"}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                setValue(durationMinutes?.toString() || "");
                setEditing(true);
              }}
            >
              <Pencil className="h-3 w-3 text-gray-400" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// Editable Pace Card
// ============================================
interface EditablePaceCardProps {
  distanceKm: number;
  durationMinutes: number | null;
  onSave: (minutes: number) => Promise<void>;
}

export function EditablePaceCard({ distanceKm, durationMinutes, onSave }: EditablePaceCardProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  // Calculate current pace
  const paceMinPerKm = durationMinutes && distanceKm ? durationMinutes / distanceKm : null;

  const handleSave = async () => {
    const pace = parsePaceInput(value);
    if (!pace || !distanceKm) return;

    const newDuration = pace * distanceKm;
    if (newDuration <= 0 || newDuration > 2880) return;

    setSaving(true);
    try {
      await onSave(Math.round(newDuration));
      setEditing(false);
    } catch (error) {
      console.error("Error saving pace:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') handleCancel();
  };

  return (
    <Card className="hover:shadow-md transition-shadow border-gray-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">Ritmo</CardTitle>
        <div className="p-2 bg-blue-50 rounded-lg">
          <Gauge className="h-4 w-4 text-blue-600" />
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="flex items-center gap-2">
            <Input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="MM:SS"
              className="h-8 text-sm w-20"
              autoFocus
              onKeyDown={handleKeyDown}
            />
            <span className="text-xs text-gray-500">/km</span>
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
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-gray-900">
              {paceMinPerKm ? `${formatPace(paceMinPerKm)}` : "—"}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                setValue(paceMinPerKm ? formatPace(paceMinPerKm) : "");
                setEditing(true);
              }}
              disabled={!distanceKm}
            >
              <Pencil className="h-3 w-3 text-gray-400" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// Editable Elevation Rate Card
// ============================================
interface EditableElevationRateCardProps {
  elevationGainM: number;
  durationMinutes: number | null;
  onSave: (minutes: number) => Promise<void>;
}

export function EditableElevationRateCard({ elevationGainM, durationMinutes, onSave }: EditableElevationRateCardProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  // Calculate current elevation rate (m/h)
  const hours = durationMinutes ? durationMinutes / 60 : 0;
  const elevationPerHour = hours > 0 && elevationGainM ? elevationGainM / hours : null;

  const handleSave = async () => {
    const elevPerHour = parseFloat(value);
    if (isNaN(elevPerHour) || !elevPerHour || !elevationGainM) return;

    // Calculate new duration from elevation rate
    const newDurationMinutes = (elevationGainM / elevPerHour) * 60;
    if (newDurationMinutes <= 0 || newDurationMinutes > 2880) return;

    setSaving(true);
    try {
      await onSave(Math.round(newDurationMinutes));
      setEditing(false);
    } catch (error) {
      console.error("Error saving elevation rate:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') handleCancel();
  };

  return (
    <Card className="hover:shadow-md transition-shadow border-gray-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">D+/hora</CardTitle>
        <div className="p-2 bg-green-50 rounded-lg">
          <TrendingUp className="h-4 w-4 text-green-600" />
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="m/h"
              min={1}
              className="h-8 text-sm w-20"
              autoFocus
              onKeyDown={handleKeyDown}
            />
            <span className="text-xs text-gray-500">m/h</span>
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
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-gray-900">
              {elevationPerHour ? `${Math.round(elevationPerHour)}` : "—"}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                setValue(elevationPerHour ? Math.round(elevationPerHour).toString() : "");
                setEditing(true);
              }}
              disabled={!elevationGainM}
            >
              <Pencil className="h-3 w-3 text-gray-400" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// Editable Name (for plan name in header)
// ============================================
interface EditableNameProps {
  name: string;
  onSave: (name: string) => Promise<void>;
  className?: string;
}

export function EditableName({ name, onSave, className }: EditableNameProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === name) {
      setEditing(false);
      setValue(name);
      return;
    }
    setSaving(true);
    try {
      await onSave(trimmed);
      setEditing(false);
    } catch (error) {
      console.error("Error saving name:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setValue(name);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') handleCancel();
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={`h-10 text-xl font-bold ${className}`}
          autoFocus
          onKeyDown={handleKeyDown}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4 text-green-600" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleCancel}
          disabled={saving}
        >
          <X className="h-4 w-4 text-red-600" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 group">
      <h1 className={`text-2xl font-bold text-gray-900 ${className}`}>{name}</h1>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => setEditing(true)}
      >
        <Pencil className="h-4 w-4 text-gray-400" />
      </Button>
    </div>
  );
}
