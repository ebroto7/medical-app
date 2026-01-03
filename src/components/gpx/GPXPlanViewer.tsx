"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ElevationChart } from "./ElevationChart";
import { InteractiveMap } from "./InteractiveMap";
import { MiniElevationChart } from "./MiniElevationChart";
import { TemporalTimeline } from "./TemporalTimeline";
import { WaypointEditorDialog } from "./WaypointEditorDialog";
import { WaypointsTable } from "./WaypointsTable";
import {
  EditableSportCard,
  EditableDurationCard,
  EditablePaceCard,
  EditableElevationRateCard,
  EditableName,
} from "./EditableStatCards";
import { Download, TrendingUp, Mountain, Calendar, Loader2, Trash2, Plus, Map } from "lucide-react";
import type { GPXTrackPoint } from "@/lib/gpx/parser";
import type { Waypoint } from "@/types/waypoint";

interface GPXPlan {
  id: string;
  name: string;
  description?: string;
  total_distance_km?: number;
  total_elevation_gain_m?: number;
  total_elevation_loss_m?: number;
  estimated_duration_minutes?: number;
  event_date?: string;
  event_name?: string;
  sport_type: string;
  created_at: string;
}

interface GPXPlanViewerProps {
  planId: string;
}

export function GPXPlanViewer({ planId }: GPXPlanViewerProps) {
  const { token } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  // Data states
  const [plan, setPlan] = useState<GPXPlan | null>(null);
  const [trackPoints, setTrackPoints] = useState<GPXTrackPoint[]>([]);
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);

  // Dialog states
  const [selectedPoint, setSelectedPoint] = useState<GPXTrackPoint | null>(null);
  const [editingWaypoint, setEditingWaypoint] = useState<Waypoint | null>(null);
  const [waypointDialogOpen, setWaypointDialogOpen] = useState(false);

  // Chart/Map sync state
  const [hoverPoint, setHoverPoint] = useState<GPXTrackPoint | null>(null);
  const [hoverWaypoint, setHoverWaypoint] = useState<Waypoint | null>(null);

  // View toggle state
  const [activeView, setActiveView] = useState<'map' | 'elevation'>('map');

  // Load plan data and track points
  const loadPlanData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // 1. Fetch plan metadata
      const planRes = await fetch(`/api/gpx-plans/${planId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!planRes.ok) {
        throw new Error("Failed to load plan");
      }

      const { data: planData } = await planRes.json();
      setPlan(planData);

      // 2. Fetch waypoints
      const waypointsRes = await fetch(`/api/gpx-plans/${planId}/waypoints`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (waypointsRes.ok) {
        const { data: waypointsData } = await waypointsRes.json();
        setWaypoints(waypointsData || []);
      }

      // 3. Fetch track points
      const trackRes = await fetch(`/api/gpx-plans/${planId}/track-data`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (trackRes.ok) {
        const { data: trackData } = await trackRes.json();
        setTrackPoints(trackData.trackPoints || []);
      }

    } catch (err) {
      console.error("Load error:", err);
      setError(err instanceof Error ? err.message : "Failed to load plan");
    } finally {
      setLoading(false);
    }
  }, [planId, token]);

  useEffect(() => {
    loadPlanData();
  }, [loadPlanData]);

  
  const handlePointClick = useCallback((point: GPXTrackPoint) => {
    setSelectedPoint(point);
    setEditingWaypoint(null); // Clear editing state when creating from point
    setWaypointDialogOpen(true);
  }, []);

  const handleCreateManualWaypoint = useCallback(() => {
    setSelectedPoint(null); // No pre-selected point
    setEditingWaypoint(null); // Clear editing state
    setWaypointDialogOpen(true);
  }, []);

  const handleEditWaypoint = useCallback((waypoint: Waypoint) => {
    setEditingWaypoint(waypoint);
    setSelectedPoint(null); // Clear selected point when editing
    setWaypointDialogOpen(true);
  }, []);

  const handleWaypointCreated = useCallback(() => {
    // Reload waypoints
    loadPlanData();
    // Clear states
    setEditingWaypoint(null);
    setSelectedPoint(null);
  }, [loadPlanData]);

  const handleExport = useCallback(async () => {
    if (!plan) return;

    setExporting(true);
    try {
      const response = await fetch(`/api/gpx-plans/${planId}/export`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to export GPX file");
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${plan.name.replace(/[^a-zA-Z0-9-_]/g, '_')}.gpx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Export error:", err);
      setError(err instanceof Error ? err.message : "Failed to export GPX");
    } finally {
      setExporting(false);
    }
  }, [plan, planId, token]);

  const handleDelete = useCallback(async () => {
    if (!confirm("¿Estás seguro de que quieres eliminar este plan? Esta acción no se puede deshacer.")) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/gpx-plans/${planId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete plan");
      }

      // Navigate back to plans list
      router.push("/dashboard/patient/gpx-plans");
    } catch (err) {
      console.error("Delete error:", err);
      setError(err instanceof Error ? err.message : "Failed to delete plan");
      setDeleting(false);
    }
  }, [planId, token, router]);

  const handleDeleteWaypoint = useCallback(async (waypointId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este waypoint? Esta acción no se puede deshacer.")) {
      return;
    }

    try {
      const response = await fetch(`/api/gpx-plans/${planId}/waypoints?waypoint_id=${waypointId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete waypoint");
      }

      // Reload waypoints
      await loadPlanData();
    } catch (err) {
      console.error("Delete waypoint error:", err);
      setError(err instanceof Error ? err.message : "Failed to delete waypoint");
    }
  }, [planId, token, loadPlanData]);

  // Optimistic update callbacks for stat cards
  const handleNameSave = useCallback(async (newName: string) => {
    if (!plan) return;
    const oldName = plan.name;

    // Optimistic update
    setPlan(prev => prev ? { ...prev, name: newName } : null);

    try {
      const response = await fetch(`/api/gpx-plans/${planId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newName }),
      });
      if (!response.ok) throw new Error("Failed to update name");
    } catch (error) {
      // Rollback on error
      setPlan(prev => prev ? { ...prev, name: oldName } : null);
      throw error;
    }
  }, [plan, planId, token]);

  const handleSportTypeSave = useCallback(async (newSportType: string) => {
    if (!plan) return;
    const oldSportType = plan.sport_type;

    // Optimistic update
    setPlan(prev => prev ? { ...prev, sport_type: newSportType } : null);

    try {
      const response = await fetch(`/api/gpx-plans/${planId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sport_type: newSportType }),
      });
      if (!response.ok) throw new Error("Failed to update sport type");
    } catch (error) {
      // Rollback on error
      setPlan(prev => prev ? { ...prev, sport_type: oldSportType } : null);
      throw error;
    }
  }, [plan, planId, token]);

  const handleDurationSave = useCallback(async (minutes: number) => {
    if (!plan) return;
    const oldDuration = plan.estimated_duration_minutes;

    // Optimistic update
    setPlan(prev => prev ? { ...prev, estimated_duration_minutes: minutes } : null);

    try {
      const response = await fetch(`/api/gpx-plans/${planId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ estimated_duration_minutes: minutes }),
      });
      if (!response.ok) throw new Error("Failed to update duration");
    } catch (error) {
      // Rollback on error
      setPlan(prev => prev ? { ...prev, estimated_duration_minutes: oldDuration } : null);
      throw error;
    }
  }, [plan, planId, token]);

  // Format waypoint name - now a free-form text field
  // Kept for backwards compatibility with legacy data using enum values
  const formatWaypointName = useCallback((name: string) => {
    // Legacy enum values translated to Spanish for existing data
    const legacyTypes: Record<string, string> = {
      hydration: "Hidratación",
      isotonic_drink: "Bebida Isotónica",
      energy_gel: "Gel Energético",
      solid_food: "Comida Sólida",
      salt_caps: "Cápsulas de Sal",
      caffeine: "Cafeína",
      custom: "Personalizado",
    };
    // Return translated legacy value or the name as-is for free-form entries
    return legacyTypes[name] || name;
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <p className="text-red-800">{error || "Plan no encontrado"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <EditableName
            name={plan.name}
            onSave={handleNameSave}
            className="text-3xl"
          />
          {plan.description && (
            <p className="text-muted-foreground mt-2">{plan.description}</p>
          )}
          {plan.event_name && (
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{plan.event_name}</span>
              {plan.event_date && (
                <span>
                  - {new Date(plan.event_date).toLocaleDateString("es-ES", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Exportar GPX
              </>
            )}
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Distancia Total */}
        <Card className="hover:shadow-md transition-shadow border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Distancia</CardTitle>
            <div className="p-2 bg-blue-50 rounded-lg">
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {plan.total_distance_km?.toFixed(1) || "0"} km
            </div>
          </CardContent>
        </Card>

        {/* Desnivel Positivo */}
        <Card className="hover:shadow-md transition-shadow border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Desnivel +</CardTitle>
            <div className="p-2 bg-green-50 rounded-lg">
              <Mountain className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {plan.total_elevation_gain_m || 0} m
            </div>
          </CardContent>
        </Card>

        {/* Deporte - Editable */}
        <EditableSportCard
          sportType={plan.sport_type}
          onSave={handleSportTypeSave}
        />

        {/* Tiempo - Editable */}
        <EditableDurationCard
          durationMinutes={plan.estimated_duration_minutes || null}
          onSave={handleDurationSave}
        />

        {/* Ritmo - Editable (recalculates duration) */}
        <EditablePaceCard
          distanceKm={plan.total_distance_km || 0}
          durationMinutes={plan.estimated_duration_minutes || null}
          onSave={handleDurationSave}
        />

        {/* Desnivel/hora - Editable (recalculates duration) */}
        <EditableElevationRateCard
          elevationGainM={plan.total_elevation_gain_m || 0}
          durationMinutes={plan.estimated_duration_minutes || null}
          onSave={handleDurationSave}
        />
      </div>

      {/* View Toggle */}
      {trackPoints.length > 0 && (
        <div className="flex gap-2">
          <Button
            variant={activeView === 'map' ? 'default' : 'outline'}
            onClick={() => setActiveView('map')}
          >
            <Map className="h-4 w-4 mr-2" /> Vista Mapa
          </Button>
          <Button
            variant={activeView === 'elevation' ? 'default' : 'outline'}
            onClick={() => setActiveView('elevation')}
          >
            <TrendingUp className="h-4 w-4 mr-2" /> Vista Elevación
          </Button>
        </div>
      )}

      {/* Elevation Chart & Interactive Map */}
      {trackPoints.length > 0 ? (
        activeView === 'map' ? (
          <>
            <Card className="relative">
              <CardHeader>
                <CardTitle>Mapa Interactivo</CardTitle>
                <CardDescription>
                  Haz click en la ruta para agregar un waypoint
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <InteractiveMap
                  trackPoints={trackPoints}
                  waypoints={waypoints}
                  hoverPoint={hoverPoint}
                  hoverWaypoint={hoverWaypoint}
                  onHover={setHoverPoint}
                  onWaypointHover={setHoverWaypoint}
                  onWaypointClick={handleEditWaypoint}
                  onPointClick={handlePointClick}
                  height={600}
                />
              </CardContent>
            </Card>

            {/* Mini elevation chart - below map */}
            <div className="w-full">
              <MiniElevationChart
                trackPoints={trackPoints}
                waypoints={waypoints}
                hoverPoint={hoverPoint}
                hoverWaypoint={hoverWaypoint}
                onHover={setHoverPoint}
                onWaypointHover={setHoverWaypoint}
                onWaypointClick={handleEditWaypoint}
                height={120}
              />
            </div>
          </>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Perfil de Elevación</CardTitle>
              <CardDescription>
                Haz click en el gráfico para agregar un waypoint
              </CardDescription>
            </CardHeader>
            {/* <CardContent> */}
              <ElevationChart
                trackPoints={trackPoints}
                waypoints={waypoints}
                onPointClick={handlePointClick}
                onWaypointClick={handleEditWaypoint}
                onWaypointHover={setHoverWaypoint}
                hoverWaypoint={hoverWaypoint}
                onHover={setHoverPoint}
                hoverPoint={hoverPoint}
                height={600}
              />
            {/* </CardContent> */}
          </Card>
        )
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Mountain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Cargando datos del track...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Temporal Timeline (for time-based waypoints) */}
      <TemporalTimeline
        waypoints={waypoints}
        totalDuration={plan.estimated_duration_minutes || 240}
        onWaypointClick={(waypoint) => handleEditWaypoint(waypoint)}
      />

      {/* Waypoints Table */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Waypoints</CardTitle>
              <CardDescription>
                Haz click en el gráfico o usa el botón para agregar waypoints. Click en las columnas KM o Tiempo para ordenar.
              </CardDescription>
            </div>
            <Button onClick={handleCreateManualWaypoint} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Waypoint
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <WaypointsTable
            waypoints={waypoints}
            onEdit={handleEditWaypoint}
            onDelete={handleDeleteWaypoint}
          />
        </CardContent>
      </Card>

      {/* Waypoint Editor Dialog */}
      <WaypointEditorDialog
        open={waypointDialogOpen}
        onOpenChange={setWaypointDialogOpen}
        planId={planId}
        trackPoints={trackPoints}
        selectedPoint={selectedPoint}
        editingWaypoint={editingWaypoint}
        onWaypointCreated={handleWaypointCreated}
        estimatedDuration={plan.estimated_duration_minutes}
      />
    </div>
  );
}
