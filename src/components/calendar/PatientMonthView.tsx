"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Database } from "@/types/database";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday as isDateToday
} from "date-fns";
import { es } from "date-fns/locale";

type NutritionEntry = Database["public"]["Tables"]["nutrition_entries"]["Row"];
type TrainingSession = Database["public"]["Tables"]["training_sessions"]["Row"];

interface DayIndicators {
  [date: string]: {
    meals: number;
    trainings: number;
    hasExtra: boolean;
  };
}

interface PatientMonthViewProps {
  patientId: string;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export function PatientMonthView({ patientId, selectedDate, onDateChange }: PatientMonthViewProps) {
  const [indicators, setIndicators] = useState<DayIndicators>({});
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState<Date>(selectedDate);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  useEffect(() => {
    const fetchMonthData = async () => {
      setIsLoading(true);
      const startDate = format(monthStart, "yyyy-MM-dd");
      const endDate = format(monthEnd, "yyyy-MM-dd");

      try {
        const [entriesRes, sessionsRes] = await Promise.all([
          fetch(`/api/nutrition/patient-entries?patientId=${patientId}&startDate=${startDate}&endDate=${endDate}`),
          fetch(`/api/training/patient-sessions?patientId=${patientId}&startDate=${startDate}&endDate=${endDate}`),
        ]);

        const entriesData = await entriesRes.json();
        const sessionsData = await sessionsRes.json();

        const entries: NutritionEntry[] = entriesData.data || [];
        const sessions: TrainingSession[] = sessionsData.data || [];

        const indicatorMap: DayIndicators = {};

        entries.forEach((e) => {
          if (!indicatorMap[e.date]) {
            indicatorMap[e.date] = { meals: 0, trainings: 0, hasExtra: false };
          }
          indicatorMap[e.date].meals++;
          if ((e.meal_type as string) === "extra") {
            indicatorMap[e.date].hasExtra = true;
          }
        });

        sessions.forEach((s) => {
          if (!indicatorMap[s.date]) {
            indicatorMap[s.date] = { meals: 0, trainings: 0, hasExtra: false };
          }
          indicatorMap[s.date].trainings++;
        });

        setIndicators(indicatorMap);
      } catch (error) {
        console.error("Error fetching month data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMonthData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, format(monthStart, "yyyy-MM-dd")]);

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-foreground capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: es })}
          </h2>
          <Button variant="ghost" size="sm" onClick={goToToday} className="text-xs">
            Hoy
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={goToNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-card rounded-lg border border-border overflow-hidden relative">
        {/* Week day headers */}
        <div className="grid grid-cols-7 bg-muted border-b border-border">
          {weekDays.map((day) => (
            <div key={day} className="py-2 text-center text-xs font-medium text-muted-foreground uppercase">
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const dayIndicator = indicators[dateStr];
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isDateToday(day);

            return (
              <button
                key={day.toISOString()}
                onClick={() => onDateChange(day)}
                className={`
                  relative h-14 p-1 border-b border-r border-border/50
                  transition-colors
                  ${!isCurrentMonth ? "bg-muted/50" : "bg-card hover:bg-muted/50"}
                  ${isSelected ? "bg-primary/10 ring-2 ring-primary ring-inset" : ""}
                  ${index % 7 === 6 ? "border-r-0" : ""}
                `}
              >
                <div className={`
                  text-sm font-medium
                  ${!isCurrentMonth ? "text-muted-foreground/50" : "text-foreground"}
                  ${isToday ? "bg-primary text-primary-foreground w-7 h-7 rounded-full flex items-center justify-center mx-auto" : ""}
                  ${isSelected && !isToday ? "text-primary font-bold" : ""}
                `}>
                  {format(day, "d")}
                </div>

                {/* Dot indicators */}
                {dayIndicator && isCurrentMonth && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                    {dayIndicator.meals > 0 && !dayIndicator.hasExtra && (
                      <div className="w-1.5 h-1.5 rounded-full bg-indicator-meal"></div>
                    )}
                    {dayIndicator.hasExtra && (
                      <div className="w-1.5 h-1.5 rounded-full bg-indicator-extra"></div>
                    )}
                    {dayIndicator.trainings > 0 && (
                      <div className="w-1.5 h-1.5 rounded-full bg-indicator-training"></div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {isLoading && (
          <div className="absolute inset-0 bg-card/50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-indicator-meal"></div>
          <span>Comidas</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-indicator-extra"></div>
          <span>Extra</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-indicator-training"></div>
          <span>Entreno</span>
        </div>
      </div>
    </div>
  );
}
