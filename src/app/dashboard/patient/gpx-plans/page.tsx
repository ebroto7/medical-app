"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Route, Upload, TrendingUp, Mountain, Calendar } from "lucide-react";
import { GPXUploadDialog } from "@/components/gpx/GPXUploadDialog";

interface GPXPlan {
  id: string;
  name: string;
  description?: string;
  total_distance_km?: number;
  total_elevation_gain_m?: number;
  event_date?: string;
  event_name?: string;
  sport_type: string;
  created_at: string;
}

export default function PatientGPXPlansPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [plans, setPlans] = useState<GPXPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await fetch("/api/gpx-plans", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const { data } = await res.json();
          setPlans(data || []);
        }
      } catch (error) {
        console.error("Error fetching GPX plans:", error);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchPlans();
  }, [token]);

  const handlePlanUploaded = useCallback((planId: string) => {
    // Navigate to plan viewer
    router.push(`/dashboard/patient/gpx-plans/${planId}`);
  }, [router]);

  const handlePlanClick = useCallback((planId: string) => {
    router.push(`/dashboard/patient/gpx-plans/${planId}`);
  }, [router]);

  const handleOpenUploadDialog = useCallback(() => {
    setUploadDialogOpen(true);
  }, []);

  const formatSportType = (type: string) => {
    const types: Record<string, string> = {
      running: "Running",
      trail_running: "Trail Running",
      cycling: "Ciclismo",
      hiking: "Senderismo",
      other: "Otro",
    };
    return types[type] || type;
  };

  const getSportIcon = (type: string) => {
    // For MVP, use same icon for all
    return <Route className="h-6 w-6" />;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Planes GPS Nutricionales</h1>
            <p className="text-muted-foreground mt-1">
              Gestiona tus pautas nutricionales basadas en rutas GPS
            </p>
          </div>
          <Button onClick={handleOpenUploadDialog}>
            <Upload className="h-4 w-4 mr-2" />
            Nuevo Plan GPS
          </Button>
        </div>

        {/* Plans List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : plans.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="text-muted-foreground">
              <Route className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No tienes planes GPS</p>
              <p className="text-sm mb-4">
                Sube un archivo GPX de tu próxima ruta y crea un plan nutricional personalizado
              </p>
              <Button onClick={handleOpenUploadDialog}>
                <Upload className="h-4 w-4 mr-2" />
                Subir Primer Plan
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className="p-6 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handlePlanClick(plan.id)}
              >
                <div className="space-y-4">
                  {/* Header with Icon */}
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-blue-100 text-blue-700 shrink-0">
                      {getSportIcon(plan.sport_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate" title={plan.name}>
                        {plan.name}
                      </h3>
                      <span className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 inline-block mt-1">
                        {formatSportType(plan.sport_type)}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  {plan.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {plan.description}
                    </p>
                  )}

                  {/* Event Info */}
                  {plan.event_name && (
                    <div className="text-sm min-w-0">
                      <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                        <Calendar className="h-4 w-4 shrink-0" />
                        <span className="font-medium truncate" title={plan.event_name}>
                          {plan.event_name}
                        </span>
                      </div>
                      {plan.event_date && (
                        <p className="text-xs text-muted-foreground ml-6">
                          {new Date(plan.event_date).toLocaleDateString("es-ES", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-xs">Distancia</span>
                      </div>
                      <p className="text-lg font-bold mt-1">
                        {plan.total_distance_km?.toFixed(1) || "0"} km
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground">
                        <Mountain className="h-4 w-4" />
                        <span className="text-xs">D+</span>
                      </div>
                      <p className="text-lg font-bold mt-1">
                        {plan.total_elevation_gain_m || 0} m
                      </p>
                    </div>
                  </div>

                  {/* Created At */}
                  <p className="text-xs text-muted-foreground">
                    Creado el {new Date(plan.created_at).toLocaleDateString("es-ES")}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <GPXUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUploaded={handlePlanUploaded}
      />
    </DashboardLayout>
  );
}
