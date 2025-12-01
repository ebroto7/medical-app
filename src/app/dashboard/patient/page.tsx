"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { NutritionEntryForm } from "@/components/nutrition/NutritionEntryForm";
import { NutritionEntriesList } from "@/components/nutrition/NutritionEntriesList";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

export default function PatientDashboardPage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [refreshKey, setRefreshKey] = useState(0);

  const dateString = selectedDate.toISOString().split("T")[0];

  const handleEntrySuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Diario Nutricional</h1>
          <p className="text-gray-600 mt-2">Registra y controla tu alimentación diaria</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Left Column - Calendar and Form */}
          <div className="space-y-6 md:col-span-1">
            <Card className="p-4 bg-white/80 backdrop-blur-sm">
              <h2 className="text-lg font-semibold mb-4">Selecciona una fecha</h2>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
              />
            </Card>

            <div className="hidden md:block">
              <NutritionEntryForm
                onSuccess={handleEntrySuccess}
              />
            </div>
          </div>

          {/* Right Column - Entries List */}
          <div className="space-y-6 md:col-span-3">
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

            {user && (
              <NutritionEntriesList
                key={refreshKey}
                userId={user.id}
                date={dateString}
                onDelete={handleEntrySuccess}
              />
            )}
          </div>

          {/* Mobile Form */}
          <div className="md:hidden">
            <NutritionEntryForm
              onSuccess={handleEntrySuccess}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
