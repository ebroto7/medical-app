"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Database } from "@/types/database";
import { useAuth } from "@/contexts/AuthContext";
import { X, Upload, Loader2 } from "lucide-react";

// Extended type that includes image_url from API response (signed URL)
type NutritionImageWithUrl = Database["public"]["Tables"]["nutrition_images"]["Row"] & {
  image_url: string;
};

type NutritionEntry = Database["public"]["Tables"]["nutrition_entries"]["Row"] & {
  nutrition_images?: NutritionImageWithUrl[];
};

type MealType = "breakfast" | "mid-morning" | "lunch" | "afternoon-snack" | "dinner" | "extra";

const mealTypeOptions: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Desayuno" },
  { value: "mid-morning", label: "Media Mañana" },
  { value: "lunch", label: "Comida" },
  { value: "afternoon-snack", label: "Merienda" },
  { value: "dinner", label: "Cena" },
  { value: "extra", label: "Extra" },
];

interface EditMealDialogProps {
  entry: NutritionEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const MAX_IMAGES = 3;

export function EditMealDialog({ entry, open, onOpenChange, onSaved }: EditMealDialogProps) {
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mealType, setMealType] = useState<MealType>(entry.meal_type as MealType);
  const [time, setTime] = useState(entry.time?.slice(0, 5) || "");
  const [description, setDescription] = useState(entry.description || "");
  const [images, setImages] = useState(entry.nutrition_images || []);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/nutrition/entries/${entry.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          date: entry.date,
          mealType,
          description,
          time: time || null,
        }),
      });

      if (res.ok) {
        onSaved();
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Error saving:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    setDeletingImageId(imageId);
    try {
      const res = await fetch(`/api/nutrition/images/${imageId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setImages((prev) => prev.filter((img) => img.id !== imageId));
      }
    } catch (error) {
      console.error("Error deleting image:", error);
    } finally {
      setDeletingImageId(null);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || images.length >= MAX_IMAGES) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("entryId", entry.id);

      const res = await fetch("/api/nutrition/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        const { data } = await res.json();
        setImages((prev) => [...prev, data]);
      }
    } catch (error) {
      console.error("Error uploading:", error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Comida</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Meal Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de comida
            </label>
            <select
              value={mealType}
              onChange={(e) => setMealType(e.target.value as MealType)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {mealTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hora (opcional)
            </label>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe lo que has comido..."
            />
          </div>

          {/* Images */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fotos ({images.length}/{MAX_IMAGES})
            </label>
            <div className="grid grid-cols-3 gap-2">
              {images.map((img) => (
                <div key={img.id} className="relative aspect-square rounded overflow-hidden group">
                  <Image
                    src={img.image_url}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <button
                    onClick={() => handleDeleteImage(img.id)}
                    disabled={deletingImageId === img.id}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                  >
                    {deletingImageId === img.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <X className="h-3 w-3" />
                    )}
                  </button>
                </div>
              ))}

              {/* Upload button */}
              {images.length < MAX_IMAGES && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="aspect-square rounded border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors disabled:opacity-50"
                >
                  {isUploading ? (
                    <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
                  ) : (
                    <Upload className="h-6 w-6 text-gray-400" />
                  )}
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUpload}
              className="hidden"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
