"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar, List, ArrowLeft } from "lucide-react";
import Link from "next/link";
import {
  CreateWeeklyPlanDialog,
  CreateSituationalPlanDialog,
  MealPlansList,
} from "@/components/meal-plans";

export default function PatientMealPlansPage() {
  const params = useParams();
  const patientId = params.patientId as string;
  const { token } = useAuth();

  const [patientName, setPatientName] = useState("Paciente");
  const [showWeeklyDialog, setShowWeeklyDialog] = useState(false);
  const [showSituationalDialog, setShowSituationalDialog] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        const res = await fetch(`/api/nutrition/my-patients`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const { data } = await res.json();
          const patient = data?.find((p: { id: string }) => p.id === patientId);
          if (patient) {
            setPatientName(patient.full_name || "Paciente");
          }
        }
      } catch (error) {
        console.error("Error fetching patient:", error);
      }
    };
    if (token) fetchPatient();
  }, [token, patientId]);

  const handleCreated = () => {
    setRefreshKey(k => k + 1);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Link
              href={`/dashboard/nutritionist/patients/${patientId}`}
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Volver al diario
            </Link>
            <h1 className="text-3xl font-bold">Pautas Nutricionales</h1>
            <p className="text-muted-foreground mt-1">
              Gestiona las pautas de {patientName}
            </p>
          </div>
        </div>

        {/* Create Buttons */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Crear Nueva Pauta</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setShowWeeklyDialog(true)}
              className="flex items-start gap-4 p-4 border-2 border-dashed rounded-lg hover:border-blue-500 hover:bg-blue-50/50 transition-colors text-left"
            >
              <div className="p-3 bg-blue-100 text-blue-700 rounded-lg">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">Pauta Semanal</h3>
                <p className="text-sm text-muted-foreground">
                  Planifica las comidas para cada día de la semana (Lunes a Domingo)
                </p>
              </div>
            </button>

            <button
              onClick={() => setShowSituationalDialog(true)}
              className="flex items-start gap-4 p-4 border-2 border-dashed rounded-lg hover:border-purple-500 hover:bg-purple-50/50 transition-colors text-left"
            >
              <div className="p-3 bg-purple-100 text-purple-700 rounded-lg">
                <List className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">Pauta Situacional</h3>
                <p className="text-sm text-muted-foreground">
                  Define pautas según contexto: día de entreno, día de oficina, fin de semana...
                </p>
              </div>
            </button>
          </div>
        </Card>

        {/* Plans List */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Pautas Creadas</h2>
          <MealPlansList patientId={patientId} canEdit={true} onRefresh={refreshKey} />
        </Card>
      </div>

      {/* Dialogs */}
      <CreateWeeklyPlanDialog
        patientId={patientId}
        patientName={patientName}
        open={showWeeklyDialog}
        onOpenChange={setShowWeeklyDialog}
        onCreated={handleCreated}
      />

      <CreateSituationalPlanDialog
        patientId={patientId}
        patientName={patientName}
        open={showSituationalDialog}
        onOpenChange={setShowSituationalDialog}
        onCreated={handleCreated}
      />
    </DashboardLayout>
  );
}
