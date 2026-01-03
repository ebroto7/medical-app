"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Database } from "@/types/database";
import { useAuth } from "@/contexts/AuthContext";
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
  };
}

interface MonthViewProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onDayClick: (date: Date) => void;
}

export const MonthView = React.memo(function MonthView({ selectedDate, onDateChange, onDayClick }: MonthViewProps) {
  const { token } = useAuth();
  const [indicators, setIndicators] = useState<DayIndicators>({});
  const [isLoading, setIsLoading] = useState(true);

  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);

  // Get calendar grid (including days from prev/next month to fill weeks)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Week day headers
  const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  useEffect(() => {
    const fetchMonthData = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const startDate = format(monthStart, "yyyy-MM-dd");
        const endDate = format(monthEnd, "yyyy-MM-dd");

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

        // Build indicators map
        const indicatorMap: DayIndicators = {};

        entries.forEach((e) => {
          if (!indicatorMap[e.date]) {
            indicatorMap[e.date] = { meals: 0, trainings: 0 };
          }
          indicatorMap[e.date].meals++;
        });

        sessions.forEach((s) => {
          if (!indicatorMap[s.date]) {
            indicatorMap[s.date] = { meals: 0, trainings: 0 };
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
  }, [token, monthStart.toISOString()]);

  const goToPreviousMonth = () => {
    onDateChange(subMonths(selectedDate, 1));
  };

  const goToNextMonth = () => {
    onDateChange(addMonths(selectedDate, 1));
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-foreground capitalize">
            {format(selectedDate, "MMMM yyyy", { locale: es })}
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
      <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm">
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
            const isCurrentMonth = isSameMonth(day, selectedDate);
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isDateToday(day);

            return (
              <button
                key={day.toISOString()}
                onClick={() => onDayClick(day)}
                className={`
                  relative h-14 p-1 border-b border-r border-border/50
                  transition-colors
                  ${!isCurrentMonth ? "bg-muted/50" : "bg-card hover:bg-muted/30"}
                  ${isSelected ? "bg-primary/5 ring-2 ring-primary ring-inset" : ""}
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
                    {dayIndicator.meals > 0 && (
                      <div className="w-1.5 h-1.5 rounded-full bg-indicator-meal" title={`${dayIndicator.meals} comidas`}></div>
                    )}
                    {dayIndicator.trainings > 0 && (
                      <div className="w-1.5 h-1.5 rounded-full bg-indicator-training" title={`${dayIndicator.trainings} entrenamientos`}></div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-indicator-meal"></div>
          <span>Comidas</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-indicator-training"></div>
          <span>Entrenamientos</span>
        </div>
      </div>

      {isLoading && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      )}
    </div>
  );
});
