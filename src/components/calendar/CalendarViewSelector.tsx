"use client";

import { CalendarDays, CalendarRange, Calendar } from "lucide-react";

export type CalendarView = "day" | "week" | "month";

interface CalendarViewSelectorProps {
  currentView: CalendarView;
  onViewChange: (view: CalendarView) => void;
}

const views = [
  { value: "day" as const, label: "Día", icon: CalendarDays },
  { value: "week" as const, label: "Semana", icon: CalendarRange },
  { value: "month" as const, label: "Mes", icon: Calendar },
];

export function CalendarViewSelector({ currentView, onViewChange }: CalendarViewSelectorProps) {
  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-gray-100 p-1">
      {views.map((view) => {
        const Icon = view.icon;
        const isActive = currentView === view.value;
        return (
          <button
            key={view.value}
            onClick={() => onViewChange(view.value)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium
              transition-all duration-200
              ${isActive 
                ? "bg-white text-gray-900 shadow-sm" 
                : "text-gray-600 hover:text-gray-900"
              }
            `}
          >
            <Icon className="h-4 w-4" />
            {view.label}
          </button>
        );
      })}
    </div>
  );
}
