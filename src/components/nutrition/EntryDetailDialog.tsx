"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import { SaveMealDialog } from "@/components/saved-meals/SaveMealDialog";
import { Database } from "@/types/database";
import { Utensils, Clock, MessageSquare, Send, Loader2, BookmarkPlus } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Extended type that includes image_url from API response (signed URL)
type NutritionImageWithUrl = Database["public"]["Tables"]["nutrition_images"]["Row"] & {
  image_url: string;
};

type NutritionEntry = Database["public"]["Tables"]["nutrition_entries"]["Row"] & {
  nutrition_images?: NutritionImageWithUrl[];
};

type NutritionistComment = Database["public"]["Tables"]["nutritionist_comments"]["Row"] & {
  nutritionist?: { full_name: string | null };
};

const mealTypeLabels: Record<string, string> = {
  breakfast: "Desayuno",
  "mid-morning": "Media Mañana",
  lunch: "Comida",
  "afternoon-snack": "Merienda",
  dinner: "Cena",
  "pre-workout": "Pre-Entreno",
  "post-workout": "Post-Entreno",
  extra: "Extra",
};

interface EntryDetailDialogProps {
  entry: NutritionEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isNutritionist?: boolean;
  patientId?: string;
}

export function EntryDetailDialog({
  entry,
  open,
  onOpenChange,
  isNutritionist = false,
  patientId,
}: EntryDetailDialogProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [comments, setComments] = useState<NutritionistComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMealDialogOpen, setSaveMealDialogOpen] = useState(false);

  useEffect(() => {
    if (open && entry) {
      fetchComments();
    } else {
      setComments([]);
      setNewComment("");
      setLightboxIndex(null); // Reset lightbox when dialog closes
    }
  }, [open, entry?.id]);

  const fetchComments = async () => {
    if (!entry) return;
    setIsLoadingComments(true);
    try {
      const res = await fetch(`/api/comments?entry_id=${entry.id}`);
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
    if (!entry || !newComment.trim() || !patientId) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entry_id: entry.id,
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

  if (!entry) return null;

  const images = entry.nutrition_images || [];
  const isExtra = entry.meal_type === "extra";
  const colorScheme = isExtra
    ? { bg: "bg-indicator-extra/20", text: "text-indicator-extra", textTitle: "text-indicator-extra" }
    : { bg: "bg-indicator-meal/20", text: "text-indicator-meal", textTitle: "text-indicator-meal" };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3">
              <DialogTitle className="flex items-center gap-3 flex-1">
                <div className={`p-2 rounded-lg ${colorScheme.bg} ${colorScheme.text}`}>
                  <Utensils className="h-5 w-5" />
                </div>
                <div>
                  <span className={colorScheme.textTitle}>
                    {mealTypeLabels[entry.meal_type]}
                  </span>
                  <div className="text-sm font-normal text-muted-foreground flex items-center gap-2 mt-1">
                    {format(new Date(entry.date), "EEEE, d 'de' MMMM", { locale: es })}
                    {entry.time && (
                      <>
                        <span>•</span>
                        <Clock className="h-3 w-3" />
                        {entry.time.slice(0, 5)}
                      </>
                    )}
                  </div>
                </div>
              </DialogTitle>

              {/* Save to Library button (patient only) */}
              {!isNutritionist && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setSaveMealDialogOpen(true)}
                        className="shrink-0"
                      >
                        <BookmarkPlus className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Agregar a biblioteca</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Description */}
            {entry.description && (
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">Descripción</h4>
                <p className="text-muted-foreground whitespace-pre-wrap">{entry.description}</p>
              </div>
            )}

            {/* Images */}
            {images.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">
                  Fotos ({images.length})
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {images.map((img, index) => (
                    <button
                      key={img.id}
                      onClick={() => setLightboxIndex(index)}
                      className="relative aspect-square rounded-lg overflow-hidden hover:ring-2 hover:ring-primary transition-all"
                    >
                      <Image
                        src={img.image_url}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, 33vw"
                        unoptimized
                      />
                    </button>
                  ))}
                </div>
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

      {/* Lightbox */}
      {lightboxIndex !== null && images.length > 0 && (
        <ImageLightbox
          images={images}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}

      {/* Save Meal Dialog */}
      <SaveMealDialog
        open={saveMealDialogOpen}
        onOpenChange={setSaveMealDialogOpen}
        defaultValues={{
          name: `${mealTypeLabels[entry.meal_type] || "Comida"} favorito`,
          description: entry.description || "",
          meal_type: entry.meal_type as any, // Type compatibility - saved_meals has extended meal types
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        }}
        onSave={() => {
          setSaveMealDialogOpen(false);
        }}
      />
    </>
  );
}
