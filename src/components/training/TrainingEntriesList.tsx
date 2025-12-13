"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database } from "@/types/database";
import { useAuth } from "@/contexts/AuthContext";
import { trainingTypeRecord, TrainingType } from "@/lib/training-config";
import { Dumbbell, Clock, Trash2 } from "lucide-react";

type TrainingSession = Database["public"]["Tables"]["training_sessions"]["Row"];

interface TrainingEntriesListProps {
  userId: string;
  date?: string;
  onDelete?: () => void;
  readOnly?: boolean;
}

export function TrainingEntriesList({
  userId,
  date,
  onDelete,
  readOnly = false,
}: TrainingEntriesListProps) {
  const { token } = useAuth();
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        if (!token) {
          setIsLoading(false);
          return;
        }

        const url = new URL("/api/training/sessions", window.location.origin);
        if (date) url.searchParams.set("date", date);

        const response = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) throw new Error("Failed to fetch sessions");

        const { data } = await response.json();
        setSessions(data || []);
      } catch (error) {
        console.error("Error fetching training sessions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, [userId, date, token]);

  const handleDelete = async (sessionId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este entrenamiento?")) return;

    try {
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(`/api/training/sessions?id=${sessionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to delete session");

      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      onDelete?.();
    } catch (error) {
      console.error("Error deleting session:", error);
    }
  };

  const formatTime = (time: string) => {
    return time.slice(0, 5); // "HH:MM:SS" -> "HH:MM"
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Cargando entrenamientos...</div>;
  }

  if (sessions.length === 0) {
    return null; // Don't show anything if no sessions
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-indicator-training flex items-center gap-2">
        <Dumbbell className="h-5 w-5" />
        Entrenamientos ({sessions.length})
      </h3>
      {sessions.map((session) => {
        const typeConfig = trainingTypeRecord[session.type as TrainingType];
        const Icon = typeConfig.icon;

        return (
          <Card key={session.id} className={`border ${typeConfig.colorClasses}`}>
            <CardContent className="py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`p-2 rounded-lg ${typeConfig.badgeClasses}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{typeConfig.label}</span>
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(session.time)}
                      </span>
                      {session.duration_minutes && (
                        <span className="text-sm text-muted-foreground">
                          • {formatDuration(session.duration_minutes)}
                        </span>
                      )}
                    </div>
                    {session.description && (
                      <p className="text-muted-foreground mt-1 text-sm">{session.description}</p>
                    )}
                  </div>
                </div>
                {!readOnly && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(session.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
