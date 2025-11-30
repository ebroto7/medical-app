"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import { NutritionEntriesList } from "@/components/nutrition/NutritionEntriesList";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";

export default function PatientDiaryPage() {
  const params = useParams();
  const patientId = params.patientId as string;
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const dateString = selectedDate.toISOString().split("T")[0];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Diario del Paciente</h1>
          <p className="text-gray-600 mt-2">Visualiza el diario nutricional del paciente</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Calendar */}
          <div className="space-y-6">
            <Card className="p-4">
              <h2 className="text-lg font-semibold mb-4">Selecciona una fecha</h2>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
              />
            </Card>
          </div>

          {/* Right Column - Entries List */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Entradas para {selectedDate.toLocaleDateString("es-ES", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </h2>
            </div>

            <NutritionEntriesList
              userId={patientId}
              date={dateString}
              readOnly={true}
              endpointUrl="/api/nutrition/patient-entries"
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
