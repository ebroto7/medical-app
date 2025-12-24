"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database } from "@/types/database";
import { useAuth } from "@/contexts/AuthContext";
import {
  Utensils,
  Dumbbell,
  Heart,
  Zap,
  Activity,
  Sparkles,
  MoreHorizontal,
  Clock,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Pencil,
  MessageSquare,
  Plus
} from "lucide-react";
import { IconBadge } from "@/components/ui/icon-badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { EditMealDialog } from "@/components/nutrition/EditMealDialog";
import { EditTrainingDialog } from "@/components/training/EditTrainingDialog";
import { EntryDetailDialog } from "@/components/nutrition/EntryDetailDialog";
import { TrainingDetailDialog } from "@/components/training/TrainingDetailDialog";
import { CreateEntryDialog } from "@/components/diary/CreateEntryDialog";

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

const trainingTypeConfig = {
  cardio: { label: "Cardio", icon: Heart, badgeColor: "red" as const },
  strength: { label: "Fuerza", icon: Dumbbell, badgeColor: "blue" as const },
  flexibility: { label: "Flexibilidad", icon: Activity, badgeColor: "purple" as const },
  hiit: { label: "HIIT", icon: Zap, badgeColor: "orange" as const },
  yoga: { label: "Yoga", icon: Sparkles, badgeColor: "green" as const },
  other: { label: "Otro", icon: MoreHorizontal, badgeColor: "muted" as const },
} as const;

interface DayViewProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onRefresh?: () => void;
  readOnly?: boolean;
}

export function DayView({ selectedDate, onDateChange, onRefresh, readOnly = false }: DayViewProps) {
  const { token } = useAuth();
  const [entries, setEntries] = useState<NutritionEntry[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingEntry, setEditingEntry] = useState<NutritionEntry | null>(null);
  const [editingSession, setEditingSession] = useState<TrainingSession | null>(null);
  const [viewingEntry, setViewingEntry] = useState<NutritionEntry | null>(null);
  const [viewingSession, setViewingSession] = useState<TrainingSession | null>(null);
  const [commentCounts, setCommentCounts] = useState<{ entries: Record<string, number>; sessions: Record<string, number> }>({ entries: {}, sessions: {} });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [defaultTab, setDefaultTab] = useState<"meal" | "training">("meal");

  // Use date-fns format to get local date string (avoids UTC timezone issues)
  const dateString = format(selectedDate, "yyyy-MM-dd");

  useEffect(() => {
    const fetchData = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const [entriesRes, sessionsRes] = await Promise.all([
          fetch(`/api/nutrition/entries?date=${dateString}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/training/sessions?date=${dateString}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const entriesData = await entriesRes.json();
        const sessionsData = await sessionsRes.json();

        const loadedEntries = entriesData.data || [];
        const loadedSessions = sessionsData.data || [];

        setEntries(loadedEntries);
        setSessions(loadedSessions);

        // Fetch comment counts for loaded entries and sessions
        const entryIds = loadedEntries.map((e: NutritionEntry) => e.id);
        const sessionIds = loadedSessions.map((s: TrainingSession) => s.id);

        if (entryIds.length > 0 || sessionIds.length > 0) {
          const countsRes = await fetch(
            `/api/comments/counts?entry_ids=${entryIds.join(",")}&session_ids=${sessionIds.join(",")}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (countsRes.ok) {
            const countsData = await countsRes.json();
            setCommentCounts(countsData);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [token, dateString]);

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm("¿Eliminar esta entrada?")) return;
    try {
      await fetch(`/api/nutrition/entries/${entryId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
      onRefresh?.();
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm("¿Eliminar este entrenamiento?")) return;
    try {
      await fetch(`/api/training/sessions/${sessionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      onRefresh?.();
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const refreshData = async () => {
    try {
      const [entriesRes, sessionsRes] = await Promise.all([
        fetch(`/api/nutrition/entries?date=${dateString}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/training/sessions?date=${dateString}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const entriesData = await entriesRes.json();
      const sessionsData = await sessionsRes.json();

      setEntries(entriesData.data || []);
      setSessions(sessionsData.data || []);
      onRefresh?.();
    } catch (error) {
      console.error("Error refreshing data:", error);
    }
  };

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
    // Items without time go first
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
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
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
                  {commentCounts.entries[entry.id] > 0 && (
                    <span className="text-sm text-accent-blue flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {commentCounts.entries[entry.id]}
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
            {!readOnly && (
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingEntry(entry)}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteEntry(entry.id)}
                  className="h-8 w-8 text-accent-red hover:text-accent-red hover:bg-accent-red/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  };

  const renderTrainingCard = (session: TrainingSession) => {
    const config = trainingTypeConfig[session.type];
    const Icon = config.icon;
    return (
      <Card
        className="cursor-pointer"
        onClick={() => setViewingSession(session)}
      >
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <IconBadge icon={Icon} color={config.badgeColor} size="md" />
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
                  {commentCounts.sessions[session.id] > 0 && (
                    <span className="text-sm text-accent-blue flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {commentCounts.sessions[session.id]}
                    </span>
                  )}
                </div>
                {session.description && (
                  <p className="text-muted-foreground mt-1 text-sm line-clamp-2">{session.description}</p>
                )}
              </div>
            </div>
            {!readOnly && (
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingSession(session)}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteSession(session.id)}
                  className="h-8 w-8 text-accent-red hover:text-accent-red hover:bg-accent-red/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>
    );
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
      {/* Date Navigation */}
      <div className="flex items-center justify-between bg-card rounded-3xl p-3 shadow-sm border border-border">
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
          {/* Items without time */}
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

          {/* Items with time */}
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

      {/* Botón para Crear Nueva Entrada */}
      {!readOnly && (
        <div className="mt-6 text-center">
          <Button
            onClick={() => setCreateDialogOpen(true)}
            variant="outline"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Agregar Entrada para {format(selectedDate, "d 'de' MMMM", { locale: es })}
          </Button>
        </div>
      )}

      {/* Create Entry Dialog */}
      <CreateEntryDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={refreshData}
        defaultTab={defaultTab}
        defaultDate={selectedDate}
      />

      {/* Edit Dialogs */}
      {editingEntry && (
        <EditMealDialog
          entry={editingEntry}
          open={!!editingEntry}
          onOpenChange={(open) => !open && setEditingEntry(null)}
          onSaved={refreshData}
        />
      )}

      {editingSession && (
        <EditTrainingDialog
          session={editingSession}
          open={!!editingSession}
          onOpenChange={(open) => !open && setEditingSession(null)}
          onSaved={refreshData}
        />
      )}

      {/* Detail Dialogs */}
      <EntryDetailDialog
        entry={viewingEntry}
        open={!!viewingEntry}
        onOpenChange={(open) => !open && setViewingEntry(null)}
      />

      <TrainingDetailDialog
        session={viewingSession}
        open={!!viewingSession}
        onOpenChange={(open) => !open && setViewingSession(null)}
      />
    </div>
  );
}
