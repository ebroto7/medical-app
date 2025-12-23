"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { CalendarViewSelector, CalendarView } from "@/components/calendar/CalendarViewSelector";
import { DayView } from "@/components/calendar/DayView";
import { WeekView } from "@/components/calendar/WeekView";
import { MonthView } from "@/components/calendar/MonthView";
import { CreateEntryDialog } from "@/components/diary/CreateEntryDialog";
import { Plus } from "lucide-react";

export default function PatientDashboardPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarView, setCalendarView] = useState<CalendarView>("month");
  const [refreshKey, setRefreshKey] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [defaultTab, setDefaultTab] = useState<"meal" | "training">("meal");

  const handleEntrySuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setCalendarView("day");
  };

  // Listen for sidebar button clicks
  useEffect(() => {
    const handler = (e: any) => {
      setDialogOpen(true);
      setDefaultTab(e.detail?.defaultTab || 'meal');
    };
    window.addEventListener('openCreateEntryDialog', handler);
    return () => window.removeEventListener('openCreateEntryDialog', handler);
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Mi Diario</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Registra tu alimentación y entrenamientos
            </p>
          </div>
          <CalendarViewSelector
            currentView={calendarView}
            onViewChange={setCalendarView}
          />
        </div>

        {/* Calendar - Full Width */}
        <div className="max-w-5xl mx-auto">
          <Card className="p-4 sm:p-6 bg-card/80 backdrop-blur-sm">
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

        {/* FAB - Mobile Only */}
        <button
          onClick={() => setDialogOpen(true)}
          className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center md:hidden"
          aria-label="Nueva entrada"
        >
          <Plus className="h-6 w-6" />
        </button>

        {/* Create Entry Dialog */}
        <CreateEntryDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={handleEntrySuccess}
          defaultTab={defaultTab}
        />
      </div>
    </DashboardLayout>
  );
}
