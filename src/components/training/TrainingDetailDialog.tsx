"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Database } from "@/types/database";
import {
  Clock,
  MessageSquare,
  Send,
  Loader2,
  Timer,
  Dumbbell,
  Heart,
  Zap,
  Activity,
  Sparkles,
  MoreHorizontal,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type TrainingSession = Database["public"]["Tables"]["training_sessions"]["Row"];

type NutritionistComment = Database["public"]["Tables"]["nutritionist_comments"]["Row"] & {
  nutritionist?: { full_name: string | null };
};

const trainingTypeConfig = {
  cardio: { label: "Cardio", icon: Heart, color: "bg-red-100 text-red-700" },
  strength: { label: "Fuerza", icon: Dumbbell, color: "bg-blue-100 text-blue-700" },
  flexibility: { label: "Flexibilidad", icon: Activity, color: "bg-purple-100 text-purple-700" },
  hiit: { label: "HIIT", icon: Zap, color: "bg-orange-100 text-orange-700" },
  yoga: { label: "Yoga", icon: Sparkles, color: "bg-green-100 text-green-700" },
  other: { label: "Otro", icon: MoreHorizontal, color: "bg-gray-100 text-gray-700" },
} as const;

interface TrainingDetailDialogProps {
  session: TrainingSession | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isNutritionist?: boolean;
  patientId?: string;
}

export function TrainingDetailDialog({
  session,
  open,
  onOpenChange,
  isNutritionist = false,
  patientId,
}: TrainingDetailDialogProps) {
  const [comments, setComments] = useState<NutritionistComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open && session) {
      fetchComments();
    } else {
      setComments([]);
      setNewComment("");
    }
  }, [open, session?.id]);

  const fetchComments = async () => {
    if (!session) return;
    setIsLoadingComments(true);
    try {
      const res = await fetch(`/api/comments?training_session_id=${session.id}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!session || !newComment.trim() || !patientId) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          training_session_id: session.id,
          patient_id: patientId,
          comment: newComment.trim(),
        }),
      });
      if (res.ok) {
        setNewComment("");
        fetchComments();
      }
    } catch (error) {
      console.error("Error saving comment:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!session) return null;

  const config = trainingTypeConfig[session.type];
  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${config.color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <span className="text-amber-900">{config.label}</span>
              <div className="text-sm font-normal text-gray-500 flex items-center gap-2 mt-1">
                {format(new Date(session.date), "EEEE, d 'de' MMMM", { locale: es })}
                {session.time && (
                  <>
                    <span>•</span>
                    <Clock className="h-3 w-3" />
                    {session.time.slice(0, 5)}
                  </>
                )}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Duration */}
          {session.duration_minutes && (
            <div className="flex items-center gap-2 text-gray-700">
              <Timer className="h-4 w-4 text-amber-600" />
              <span className="font-medium">{session.duration_minutes} minutos</span>
            </div>
          )}

          {/* Description */}
          {session.description && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Descripción</h4>
              <p className="text-gray-600 whitespace-pre-wrap">{session.description}</p>
            </div>
          )}

          {/* Comments Section */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Comentarios del nutricionista
            </h4>

            {isLoadingComments ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-gray-500 text-sm italic">
                {isNutritionist
                  ? "No hay comentarios. Añade uno abajo."
                  : "No hay comentarios del nutricionista."}
              </p>
            ) : (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="bg-blue-50 border border-blue-100 rounded-lg p-3"
                  >
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">
                      {comment.comment}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {comment.nutritionist?.full_name || "Nutricionista"} •{" "}
                      {comment.created_at &&
                        format(new Date(comment.created_at), "d MMM yyyy, HH:mm", {
                          locale: es,
                        })}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Add comment form (nutritionist only) */}
            {isNutritionist && (
              <div className="mt-4 space-y-2">
                <Textarea
                  placeholder="Escribe un comentario..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || isSaving}
                    size="sm"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Enviar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
