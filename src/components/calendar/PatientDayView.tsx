"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database } from "@/types/database";
import {
  Utensils,
  Clock,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { IconBadge } from "@/components/ui/icon-badge";
import { trainingTypeRecord, TrainingType } from "@/lib/training-config";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { EntryDetailDialog } from "@/components/nutrition/EntryDetailDialog";
import { TrainingDetailDialog } from "@/components/training/TrainingDetailDialog";

// Extended type that includes image_url from API response (signed URL)
type NutritionImageWithUrl = Database["public"]["Tables"]["nutrition_images"]["Row"] & {
  image_url: string;
};

type NutritionEntry = Database["public"]["Tables"]["nutrition_entries"]["Row"] & {
  nutrition_images?: NutritionImageWithUrl[];
};
type TrainingSession = Database["public"]["Tables"]["training_sessions"]["Row"];

interface TimelineItem {
  id: string;
  type: "meal" | "training";
  time: string | null;
  data: NutritionEntry | TrainingSession;
}

const mealTypeLabels: Record<string, string> = {
  breakfast: "Desayuno",
  "mid-morning": "Media Mañana",
  lunch: "Comida",
  "afternoon-snack": "Merienda",
  dinner: "Cena",
  extra: "Extra",
};

// Map training types to IconBadge colors
const trainingBadgeColors: Record<TrainingType, "red" | "blue" | "purple" | "orange" | "green" | "muted"> = {
  cardio: "red",
  strength: "blue",
  flexibility: "purple",
  hiit: "orange",
  yoga: "green",
  other: "muted",
};

interface PatientDayViewProps {
  patientId: string;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export function PatientDayView({ patientId, selectedDate, onDateChange }: PatientDayViewProps) {
  const [entries, setEntries] = useState<NutritionEntry[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingEntry, setViewingEntry] = useState<NutritionEntry | null>(null);
  const [viewingSession, setViewingSession] = useState<TrainingSession | null>(null);

  const dateString = format(selectedDate, "yyyy-MM-dd");

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [entriesRes, sessionsRes] = await Promise.all([
          fetch(`/api/nutrition/patient-entries?patientId=${patientId}&date=${dateString}`),
          fetch(`/api/training/patient-sessions?patientId=${patientId}&date=${dateString}`),
        ]);

        const entriesData = await entriesRes.json();
        const sessionsData = await sessionsRes.json();

        setEntries(entriesData.data || []);
        setSessions(sessionsData.data || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [patientId, dateString]);

  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    onDateChange(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    onDateChange(newDate);
  };

  // Combine and sort items by time
  const timelineItems: TimelineItem[] = [
    ...entries.map((e) => ({ id: e.id, type: "meal" as const, time: e.time, data: e })),
    ...sessions.map((s) => ({ id: s.id, type: "training" as const, time: s.time, data: s })),
  ].sort((a, b) => {
    if (!a.time && !b.time) return 0;
    if (!a.time) return -1;
    if (!b.time) return 1;
    return a.time.localeCompare(b.time);
  });

  const itemsWithTime = timelineItems.filter((i) => i.time);
  const itemsWithoutTime = timelineItems.filter((i) => !i.time);

  const formatTime = (time: string | null) => {
    if (!time) return null;
    return time.slice(0, 5);
  };

  const isExtraMeal = (mealType: string) => mealType === "extra";

  const renderMealCard = (entry: NutritionEntry) => {
    const isExtra = isExtraMeal(entry.meal_type);
    return (
      <Card
        className="cursor-pointer"
        onClick={() => setViewingEntry(entry)}
      >
        <div className="p-4">
          <div className="flex items-start gap-3">
            <IconBadge
              icon={Utensils}
              color={isExtra ? "purple" : "green"}
              size="md"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-foreground">
                  {mealTypeLabels[entry.meal_type]}
                </span>
                {entry.time && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTime(entry.time)}
                  </span>
                )}
              </div>
              {entry.description && (
                <p className="text-muted-foreground mt-1 text-sm line-clamp-2">{entry.description}</p>
              )}
              {entry.nutrition_images && entry.nutrition_images.length > 0 && (
                <div className="flex gap-2 mt-3">
                  {entry.nutrition_images.slice(0, 3).map((img) => (
                    <div key={img.id} className="relative w-16 h-16 rounded-xl overflow-hidden shadow-sm">
                      <Image src={img.image_url} alt="" fill className="object-cover" unoptimized />
                    </div>
                  ))}
                  {entry.nutrition_images.length > 3 && (
                    <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center text-sm font-medium text-muted-foreground">
                      +{entry.nutrition_images.length - 3}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  };

  const renderTrainingCard = (session: TrainingSession) => {
    const config = trainingTypeRecord[session.type as TrainingType];
    const Icon = config.icon;
    const badgeColor = trainingBadgeColors[session.type as TrainingType];

    return (
      <Card
        className="cursor-pointer"
        onClick={() => setViewingSession(session)}
      >
        <div className="p-4">
          <div className="flex items-start gap-3">
            <IconBadge icon={Icon} color={badgeColor} size="md" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-foreground">{config.label}</span>
                {session.time && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTime(session.time)}
                  </span>
                )}
                {session.duration_minutes && (
                  <span className="text-sm text-muted-foreground">
                    • {session.duration_minutes} min
                  </span>
                )}
              </div>
              {session.description && (
                <p className="text-muted-foreground mt-1 text-sm line-clamp-2">{session.description}</p>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground mt-2">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Date Navigation */}
      <div className="flex items-center justify-between bg-card rounded-2xl p-3 shadow-sm">
        <Button variant="ghost" size="icon" onClick={goToPreviousDay} className="h-9 w-9">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-bold text-foreground capitalize">
          {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
        </h2>
        <Button variant="ghost" size="icon" onClick={goToNextDay} className="h-9 w-9">
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Timeline */}
      {timelineItems.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No hay entradas para este día
        </div>
      ) : (
        <div className="space-y-3">
          {itemsWithoutTime.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Sin hora asignada</h3>
              {itemsWithoutTime.map((item) => (
                <div key={item.id}>
                  {item.type === "meal"
                    ? renderMealCard(item.data as NutritionEntry)
                    : renderTrainingCard(item.data as TrainingSession)}
                </div>
              ))}
            </div>
          )}

          {itemsWithTime.length > 0 && (
            <div className="space-y-3">
              {itemsWithoutTime.length > 0 && (
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mt-6">Timeline</h3>
              )}
              {itemsWithTime.map((item) => (
                <div key={item.id}>
                  {item.type === "meal"
                    ? renderMealCard(item.data as NutritionEntry)
                    : renderTrainingCard(item.data as TrainingSession)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Detail Dialogs - with nutritionist comment capability */}
      <EntryDetailDialog
        entry={viewingEntry}
        open={!!viewingEntry}
        onOpenChange={(open) => !open && setViewingEntry(null)}
        isNutritionist={true}
        patientId={patientId}
      />

      <TrainingDetailDialog
        session={viewingSession}
        open={!!viewingSession}
        onOpenChange={(open) => !open && setViewingSession(null)}
        isNutritionist={true}
        patientId={patientId}
      />
    </div>
  );
}
