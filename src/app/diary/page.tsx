"use client";

import { useState } from "react";
import { NutritionEntryForm } from "@/components/nutrition/NutritionEntryForm";
import { NutritionEntriesList } from "@/components/nutrition/NutritionEntriesList";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function DiaryPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [refreshKey, setRefreshKey] = useState(0);

  const dateString = selectedDate.toISOString().split("T")[0];

  const handleEntrySuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Diario Nutricional</h1>
          <div className="flex gap-4">
            {user && (
              <>
                <span className="text-gray-600 self-center">{user.email}</span>
                <Button variant="outline" onClick={handleSignOut}>
                  Cerrar Sesión
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Calendar and Form */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-4">
              <h2 className="text-lg font-semibold mb-4">Selecciona una fecha</h2>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
              />
            </Card>

            <NutritionEntryForm
              onSuccess={handleEntrySuccess}
            />
          </div>

          {/* Right Column - Entries List */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <h2 className="text-2xl font-bold">
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
        </div>
      </div>
    </div>
  );
}
