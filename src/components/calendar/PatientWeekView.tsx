"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database } from "@/types/database";
import { ChevronLeft, ChevronRight, Utensils, Dumbbell } from "lucide-react";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { es } from "date-fns/locale";

type NutritionEntry = Database["public"]["Tables"]["nutrition_entries"]["Row"];
type TrainingSession = Database["public"]["Tables"]["training_sessions"]["Row"];

interface PatientWeekViewProps {
  patientId: string;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export function PatientWeekView({ patientId, selectedDate, onDateChange }: PatientWeekViewProps) {
  const [entries, setEntries] = useState<NutritionEntry[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    const fetchWeekData = async () => {
      setIsLoading(true);
      const startDate = format(weekStart, "yyyy-MM-dd");
      const endDate = format(addDays(weekStart, 6), "yyyy-MM-dd");

      try {
        const [entriesRes, sessionsRes] = await Promise.all([
          fetch(`/api/nutrition/patient-entries?patientId=${patientId}&startDate=${startDate}&endDate=${endDate}`),
          fetch(`/api/training/patient-sessions?patientId=${patientId}&startDate=${startDate}&endDate=${endDate}`),
        ]);

        const entriesData = await entriesRes.json();
        const sessionsData = await sessionsRes.json();

        setEntries(entriesData.data || []);
        setSessions(sessionsData.data || []);
      } catch (error) {
        console.error("Error fetching week data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWeekData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, format(weekStart, "yyyy-MM-dd")]);

  const goToPreviousWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    onDateChange(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    onDateChange(newDate);
  };

  const getEntriesForDay = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    return entries.filter((e) => e.date === dateStr);
  };

  const getSessionsForDay = (day: Date) => {
    const dateStr = format(day, "yyyy-MM-dd");
    return sessions.filter((s) => s.date === dateStr);
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-gray-500 mt-2">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-bold text-gray-900">
          {format(weekStart, "d MMM", { locale: es })} - {format(addDays(weekStart, 6), "d MMM yyyy", { locale: es })}
        </h2>
        <Button variant="outline" size="sm" onClick={goToNextWeek}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const dayEntries = getEntriesForDay(day);
          const daySessions = getSessionsForDay(day);
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());

          return (
            <Card
              key={day.toISOString()}
              className={`p-3 cursor-pointer transition-all hover:shadow-md ${
                isSelected ? "ring-2 ring-primary" : ""
              } ${isToday ? "bg-blue-50" : ""}`}
              onClick={() => onDateChange(day)}
            >
              <div className="text-center mb-2">
                <div className="text-xs text-gray-500 uppercase">
                  {format(day, "EEE", { locale: es })}
                </div>
                <div className={`text-lg font-bold ${isToday ? "text-blue-600" : ""}`}>
                  {format(day, "d")}
                </div>
              </div>

              <div className="space-y-1 min-h-[60px]">
                {dayEntries.slice(0, 2).map((entry) => (
                  <div
                    key={entry.id}
                    className={`text-xs p-1 rounded truncate flex items-center gap-1 ${
                      (entry.meal_type as string) === "extra"
                        ? "bg-violet-100 text-violet-700"
                        : "bg-teal-100 text-teal-700"
                    }`}
                  >
                    <Utensils className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">
                      {entry.time?.slice(0, 5) || "—"}
                    </span>
                  </div>
                ))}
                {daySessions.slice(0, 2).map((session) => (
                  <div
                    key={session.id}
                    className="text-xs p-1 rounded bg-amber-100 text-amber-700 truncate flex items-center gap-1"
                  >
                    <Dumbbell className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">
                      {session.time?.slice(0, 5)}
                    </span>
                  </div>
                ))}
                {(dayEntries.length > 2 || daySessions.length > 2) && (
                  <div className="text-xs text-gray-500 text-center">
                    +{Math.max(0, dayEntries.length - 2) + Math.max(0, daySessions.length - 2)} más
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
