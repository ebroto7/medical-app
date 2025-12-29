"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ElevationChart } from "./ElevationChart";
import { InteractiveMap } from "./InteractiveMap";
import { MiniElevationChart } from "./MiniElevationChart";
import { WaypointEditorDialog } from "./WaypointEditorDialog";
import { Download, MapPin, TrendingUp, Mountain, Calendar, Activity, Loader2, Trash2, Plus, Map } from "lucide-react";
import type { GPXTrackPoint } from "@/lib/gpx/parser";

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

interface Waypoint {
  id: string;
  latitude: number;
  longitude: number;
  elevation_m?: number;
  distance_from_start_km: number;
  trigger_distance_km?: number;
  trigger_time_min?: number;
  nutrition_type: string;
  product_name?: string;
  calories?: number;
  carbs?: number;
  protein?: number;
  fat?: number;
  sodium_mg?: number;
  caffeine_mg?: number;
  quantity?: number;
  quantity_unit?: string;
  notes?: string;
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
  const [waypointDialogOpen, setWaypointDialogOpen] = useState(false);

  // Chart/Map sync state
  const [hoverPoint, setHoverPoint] = useState<GPXTrackPoint | null>(null);

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
    setWaypointDialogOpen(true);
  }, []);

  const handleCreateManualWaypoint = useCallback(() => {
    setSelectedPoint(null); // No pre-selected point
    setWaypointDialogOpen(true);
  }, []);

  const handleWaypointCreated = useCallback(() => {
    // Reload waypoints
    loadPlanData();
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

  const formatSportType = useCallback((type: string) => {
    const types: Record<string, string> = {
      running: "Running",
      cycling: "Ciclismo",
      triathlon: "Triatlón",
      hiking: "Senderismo",
      other: "Otro",
    };
    return types[type] || type;
  }, []);

  const formatNutritionType = useCallback((type: string) => {
    const types: Record<string, string> = {
      hydration: "Hidratación",
      isotonic_drink: "Bebida Isotónica",
      energy_gel: "Gel Energético",
      solid_food: "Comida Sólida",
      salt_caps: "Cápsulas de Sal",
      caffeine: "Cafeína",
      custom: "Personalizado",
    };
    return types[type] || type;
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
          <h1 className="text-3xl font-bold">{plan.name}</h1>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Distancia Total</CardTitle>
            <div className="p-2 bg-blue-50 rounded-lg">
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {plan.total_distance_km?.toFixed(2) || "0"} km
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Desnivel Positivo</CardTitle>
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

        <Card className="hover:shadow-md transition-shadow border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Waypoints</CardTitle>
            <div className="p-2 bg-purple-50 rounded-lg">
              <MapPin className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{waypoints.length}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Deporte</CardTitle>
            <div className="p-2 bg-orange-50 rounded-lg">
              <Activity className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{formatSportType(plan.sport_type)}</div>
          </CardContent>
        </Card>
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
          <Card className="relative">
            <CardHeader>
              <CardTitle>Mapa Interactivo</CardTitle>
              <CardDescription>
                Visualización de la ruta con perfil de elevación
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="relative w-full" style={{ height: '600px' }}>
                <InteractiveMap
                  trackPoints={trackPoints}
                  hoverPoint={hoverPoint}
                  onHover={setHoverPoint}
                  onPointClick={handlePointClick}
                  height={600}
                />

                {/* Mini elevation chart overlay */}
                <div className="absolute bottom-0 left-0 right-0 z-[450]">
                  <MiniElevationChart
                    trackPoints={trackPoints}
                    waypoints={waypoints}
                    hoverPoint={hoverPoint}
                    onHover={setHoverPoint}
                    height={120}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Perfil de Elevación</CardTitle>
              <CardDescription>
                Haz click en el gráfico para agregar un waypoint nutricional
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ElevationChart
                trackPoints={trackPoints}
                waypoints={waypoints}
                onPointClick={handlePointClick}
                onHover={setHoverPoint}
                hoverPoint={hoverPoint}
                height={600}
              />
            </CardContent>
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

      {/* Waypoints List */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Waypoints Nutricionales</CardTitle>
              <CardDescription>
                Haz click en el gráfico o usa el botón para agregar waypoints
              </CardDescription>
            </div>
            <Button onClick={handleCreateManualWaypoint} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Waypoint
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {waypoints.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay waypoints nutricionales aún</p>
              <p className="text-sm mt-2">
                Haz click en el gráfico de elevación para agregar uno
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {waypoints.map((wp) => {
                const triggers = [];
                if (wp.trigger_distance_km) {
                  triggers.push(`KM ${wp.trigger_distance_km.toFixed(1)}`);
                }
                if (wp.trigger_time_min) {
                  triggers.push(`${wp.trigger_time_min} min`);
                }

                return (
                  <div
                    key={wp.id}
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="h-4 w-4 text-red-500" />
                          <span className="font-semibold">
                            {triggers.join(" / ")}
                          </span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-sm">
                            {formatNutritionType(wp.nutrition_type)}
                          </span>
                        </div>

                        {wp.product_name && (
                          <p className="text-sm font-medium mb-1">{wp.product_name}</p>
                        )}

                        {/* Macros */}
                        {(wp.calories || wp.carbs || wp.protein) && (
                          <div className="flex gap-4 text-xs text-muted-foreground mb-2">
                            {wp.calories && <span>{wp.calories} kcal</span>}
                            {wp.carbs && <span>{wp.carbs}g carbs</span>}
                            {wp.protein && <span>{wp.protein}g prot</span>}
                            {wp.sodium_mg && <span>{wp.sodium_mg}mg Na</span>}
                            {wp.caffeine_mg && <span>{wp.caffeine_mg}mg cafeína</span>}
                          </div>
                        )}

                        {/* Quantity */}
                        {wp.quantity && wp.quantity_unit && (
                          <p className="text-sm text-muted-foreground">
                            Cantidad: {wp.quantity} {wp.quantity_unit}
                          </p>
                        )}

                        {/* Notes */}
                        {wp.notes && (
                          <p className="text-sm text-muted-foreground mt-2 italic">
                            {wp.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Waypoint Editor Dialog */}
      <WaypointEditorDialog
        open={waypointDialogOpen}
        onOpenChange={setWaypointDialogOpen}
        planId={planId}
        selectedPoint={selectedPoint}
        onWaypointCreated={handleWaypointCreated}
      />
    </div>
  );
}
