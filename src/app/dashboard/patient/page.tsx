"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { NutritionEntryForm } from "@/components/nutrition/NutritionEntryForm";
import { TrainingEntryForm } from "@/components/training/TrainingEntryForm";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarViewSelector, CalendarView } from "@/components/calendar/CalendarViewSelector";
import { DayView } from "@/components/calendar/DayView";
import { WeekView } from "@/components/calendar/WeekView";
import { MonthView } from "@/components/calendar/MonthView";
import { Utensils, Dumbbell } from "lucide-react";

export default function PatientDashboardPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarView, setCalendarView] = useState<CalendarView>("month");
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeFormTab, setActiveFormTab] = useState<"meal" | "training">("meal");

  const handleEntrySuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setCalendarView("day");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mi Diario</h1>
            <p className="text-gray-600 mt-1">Registra tu alimentación y entrenamientos</p>
          </div>
          <CalendarViewSelector 
            currentView={calendarView} 
            onViewChange={setCalendarView} 
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Forms */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="p-4 bg-white/80 backdrop-blur-sm">
              <Tabs value={activeFormTab} onValueChange={(v) => setActiveFormTab(v as "meal" | "training")}>
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="meal" className="flex items-center gap-2">
                    <Utensils className="h-4 w-4" />
                    Comida
                  </TabsTrigger>
                  <TabsTrigger value="training" className="flex items-center gap-2">
                    <Dumbbell className="h-4 w-4" />
                    Entreno
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="meal" className="mt-0">
                  <NutritionEntryForm onSuccess={handleEntrySuccess} />
                </TabsContent>
                <TabsContent value="training" className="mt-0">
                  <TrainingEntryForm onSuccess={handleEntrySuccess} />
                </TabsContent>
              </Tabs>
            </Card>
          </div>

          {/* Right Column - Calendar View */}
          <div className="lg:col-span-2">
            <Card className="p-4 sm:p-6 bg-white/80 backdrop-blur-sm">
              {calendarView === "day" && (
                <DayView
                  key={refreshKey}
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                  onRefresh={handleEntrySuccess}
                />
              )}
              {calendarView === "week" && (
                <WeekView
                  key={refreshKey}
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                  onDayClick={handleDayClick}
                />
              )}
              {calendarView === "month" && (
                <MonthView
                  key={refreshKey}
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                  onDayClick={handleDayClick}
                />
              )}
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
