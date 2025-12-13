"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarViewSelector } from "@/components/calendar/CalendarViewSelector";
import { PatientDayView } from "@/components/calendar/PatientDayView";
import { PatientWeekView } from "@/components/calendar/PatientWeekView";
import { PatientMonthView } from "@/components/calendar/PatientMonthView";
import { ClipboardList } from "lucide-react";

type CalendarView = "day" | "week" | "month";

export default function PatientDiaryPage() {
  const params = useParams();
  const patientId = params.patientId as string;
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [view, setView] = useState<CalendarView>("month");

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    // When clicking a date in month/week view, switch to day view
    if (view === "month" || view === "week") {
      setView("day");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Diario del Paciente</h1>
            <p className="text-gray-600 mt-2">Visualiza el diario nutricional y entrenamientos del paciente</p>
          </div>
          <Link href={`/dashboard/nutritionist/patients/${patientId}/meal-plans`}>
            <Button variant="outline" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              Gestionar Pautas
            </Button>
          </Link>
        </div>

        {/* View Selector */}
        <CalendarViewSelector currentView={view} onViewChange={setView} />

        {/* Calendar Views */}
        <Card className="p-6">
          {view === "day" && (
            <PatientDayView
              patientId={patientId}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
            />
          )}
          {view === "week" && (
            <PatientWeekView
              patientId={patientId}
              selectedDate={selectedDate}
              onDateChange={handleDateChange}
            />
          )}
          {view === "month" && (
            <PatientMonthView
              patientId={patientId}
              selectedDate={selectedDate}
              onDateChange={handleDateChange}
            />
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
