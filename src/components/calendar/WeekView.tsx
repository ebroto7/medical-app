"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Database } from "@/types/database";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { startOfWeek, endOfWeek, eachDayOfInterval, format, isSameDay, addWeeks, subWeeks } from "date-fns";
import { es } from "date-fns/locale";

type NutritionEntry = Database["public"]["Tables"]["nutrition_entries"]["Row"];
type TrainingSession = Database["public"]["Tables"]["training_sessions"]["Row"];

interface DayData {
  date: Date;
  meals: number;
  trainings: number;
}

interface WeekViewProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onDayClick: (date: Date) => void;
}

export function WeekView({ selectedDate, onDateChange, onDayClick }: WeekViewProps) {
  const { token } = useAuth();
  const [weekData, setWeekData] = useState<DayData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  useEffect(() => {
    const fetchWeekData = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const startDate = format(weekStart, "yyyy-MM-dd");
        const endDate = format(weekEnd, "yyyy-MM-dd");

        const [entriesRes, sessionsRes] = await Promise.all([
          fetch(`/api/nutrition/entries?startDate=${startDate}&endDate=${endDate}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/training/sessions?startDate=${startDate}&endDate=${endDate}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const entriesData = await entriesRes.json();
        const sessionsData = await sessionsRes.json();

        const entries: NutritionEntry[] = entriesData.data || [];
        const sessions: TrainingSession[] = sessionsData.data || [];

        // Count per day
        const data = daysOfWeek.map((day) => {
          const dayStr = format(day, "yyyy-MM-dd");
          return {
            date: day,
            meals: entries.filter((e) => e.date === dayStr).length,
            trainings: sessions.filter((s) => s.date === dayStr).length,
          };
        });

        setWeekData(data);
      } catch (error) {
        console.error("Error fetching week data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWeekData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, format(weekStart, "yyyy-MM-dd")]);

  const goToPreviousWeek = () => {
    onDateChange(subWeeks(selectedDate, 1));
  };

  const goToNextWeek = () => {
    onDateChange(addWeeks(selectedDate, 1));
  };

  const isToday = (date: Date) => isSameDay(date, new Date());
  const isSelected = (date: Date) => isSameDay(date, selectedDate);

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
        <h2 className="text-lg font-bold text-gray-900">
          {format(weekStart, "d MMM", { locale: es })} - {format(weekEnd, "d MMM yyyy", { locale: es })}
        </h2>
        <Button variant="outline" size="sm" onClick={goToNextWeek}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Week Grid */}
      <div className="grid grid-cols-7 gap-2">
        {weekData.map((day) => (
          <button
            key={day.date.toISOString()}
            onClick={() => onDayClick(day.date)}
            className={`
              p-3 rounded-lg text-center transition-all
              ${isSelected(day.date) 
                ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2" 
                : isToday(day.date)
                  ? "bg-blue-100 hover:bg-blue-200"
                  : "bg-white hover:bg-gray-50 border border-gray-200"
              }
            `}
          >
            <div className="text-xs font-medium uppercase opacity-70">
              {format(day.date, "EEE", { locale: es })}
            </div>
            <div className={`text-2xl font-bold ${isSelected(day.date) ? "" : "text-gray-900"}`}>
              {format(day.date, "d")}
            </div>
            
            {/* Indicators */}
            <div className="flex justify-center gap-1.5 mt-2">
              {day.meals > 0 && (
                <div className="flex items-center gap-0.5 text-xs">
                  <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                  <span className={isSelected(day.date) ? "text-primary-foreground/80" : "text-gray-500"}>
                    {day.meals}
                  </span>
                </div>
              )}
              {day.trainings > 0 && (
                <div className="flex items-center gap-0.5 text-xs">
                  <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                  <span className={isSelected(day.date) ? "text-primary-foreground/80" : "text-gray-500"}>
                    {day.trainings}
                  </span>
                </div>
              )}
            </div>
            
            {day.meals === 0 && day.trainings === 0 && (
              <div className="h-5"></div>
            )}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 text-sm text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-teal-500"></div>
          <span>Comidas</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-amber-500"></div>
          <span>Entrenamientos</span>
        </div>
      </div>
    </div>
  );
}
