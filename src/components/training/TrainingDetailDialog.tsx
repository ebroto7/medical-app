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
import { trainingTypeRecord, TrainingType } from "@/lib/training-config";
import {
  Clock,
  MessageSquare,
  Send,
  Loader2,
  Timer,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type TrainingSession = Database["public"]["Tables"]["training_sessions"]["Row"];

type NutritionistComment = Database["public"]["Tables"]["nutritionist_comments"]["Row"] & {
  nutritionist?: { full_name: string | null };
};

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

  const config = trainingTypeRecord[session.type as TrainingType];
  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${config.badgeClasses}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <span className="text-indicator-training">{config.label}</span>
              <div className="text-sm font-normal text-muted-foreground flex items-center gap-2 mt-1">
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
            <div className="flex items-center gap-2 text-foreground">
              <Timer className="h-4 w-4 text-indicator-training" />
              <span className="font-medium">{session.duration_minutes} minutos</span>
            </div>
          )}

          {/* Description */}
          {session.description && (
            <div>
              <h4 className="text-sm font-medium text-foreground mb-2">Descripción</h4>
              <p className="text-muted-foreground whitespace-pre-wrap">{session.description}</p>
            </div>
          )}

          {/* Comments Section */}
          <div className="border-t border-border pt-4">
            <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Comentarios del nutricionista
            </h4>

            {isLoadingComments ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-muted-foreground text-sm italic">
                {isNutritionist
                  ? "No hay comentarios. Añade uno abajo."
                  : "No hay comentarios del nutricionista."}
              </p>
            ) : (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="bg-info/10 border border-info/20 rounded-lg p-3"
                  >
                    <p className="text-foreground text-sm whitespace-pre-wrap">
                      {comment.comment}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
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
