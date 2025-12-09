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
    <div className="inline-flex rounded-full border-2 border-foreground/20 bg-background p-1 gap-1">
      {views.map((view) => {
        const Icon = view.icon;
        const isActive = currentView === view.value;
        return (
          <button
            key={view.value}
            onClick={() => onViewChange(view.value)}
            className={`
              flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold
              transition-all duration-200
              ${isActive
                ? "bg-foreground text-background"
                : "text-foreground/60 hover:text-foreground hover:bg-foreground/10"
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
