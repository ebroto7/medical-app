"use client";

import { useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { compressImage, formatFileSize, CompressionResult } from "@/lib/image-optimization";

const formSchema = z.object({
  date: z.string(),
  mealType: z.enum(["breakfast", "mid-morning", "lunch", "afternoon-snack", "dinner"]),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface NutritionEntryFormProps {
  onSuccess?: () => void;
}

export function NutritionEntryForm({ onSuccess }: NutritionEntryFormProps) {
  const { user, token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [compressionMetadata, setCompressionMetadata] = useState<CompressionResult[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      mealType: "breakfast",
      description: "",
    },
  });

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-600">
            Por favor inicia sesión para crear entradas
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (files.length === 0) return;

    setIsCompressing(true);

    try {
      const compressedResults: CompressionResult[] = [];
      const compressedFiles: File[] = [];

      for (const file of files) {
        const result = await compressImage(file);
        compressedResults.push(result);
        compressedFiles.push(result.file);

        // Create preview from compressed file
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrls((prev) => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(result.file);
      }

      setImages((prev) => [...prev, ...compressedFiles]);
      setCompressionMetadata((prev) => [...prev, ...compressedResults]);
    } catch (error) {
      console.error("Error processing images:", error);
    } finally {
      setIsCompressing(false);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
    setCompressionMetadata((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);

    try {
      if (!token) {
        throw new Error("Not authenticated");
      }

      // Create entry
      const entryResponse = await fetch("/api/nutrition/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          date: data.date,
          mealType: data.mealType,
          description: data.description,
        }),
      });

      if (!entryResponse.ok) {
        throw new Error("Failed to create entry");
      }

      const responseJson = await entryResponse.json();
      console.log("Entry creation response:", responseJson);
      const entryId = responseJson.data?.[0]?.id || responseJson.data?.id;
      console.log("Entry ID:", entryId);

      if (!entryId) {
        throw new Error(
          "Failed to get entry ID from response: " + JSON.stringify(responseJson)
        );
      }

      // Upload images
      for (const image of images) {
        const formData = new FormData();
        formData.append("file", image);
        formData.append("entryId", entryId);
        console.log("Uploading image for entry:", entryId);

        const uploadResponse = await fetch("/api/nutrition/upload", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          console.error(
            `Image upload failed (${uploadResponse.status}):`,
            errorData.error
          );
          throw new Error(
            errorData.error || `Upload failed with status ${uploadResponse.status}`
          );
        }
      }

      form.reset();
      setImages([]);
      setPreviewUrls([]);
      onSuccess?.();
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nueva Entrada</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Fecha</label>
              <Input
                type="date"
                {...form.register("date")}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Tipo de Comida</label>
              <select
                {...form.register("mealType")}
                className="w-full mt-1 px-3 py-2 border rounded-md"
              >
                <option value="breakfast">Desayuno</option>
                <option value="mid-morning">Media Mañana</option>
                <option value="lunch">Comida</option>
                <option value="afternoon-snack">Merienda</option>
                <option value="dinner">Cena</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Descripción</label>
            <Textarea
              placeholder="Describe qué comiste..."
              {...form.register("description")}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Imágenes</label>
            <Input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageSelect}
              disabled={isCompressing}
              className="mt-1"
            />
            {isCompressing && (
              <p className="text-sm text-blue-600 mt-2">
                Optimizando imágenes para móvil...
              </p>
            )}
            {previewUrls.length > 0 && (
              <div className="mt-4">
                <div className="grid grid-cols-3 gap-2">
                  {previewUrls.map((url, index) => (
                    <div key={index} className="relative w-full h-24">
                      <Image
                        src={url}
                        alt={`Preview ${index}`}
                        fill
                        className="object-cover rounded"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm"
                      >
                        ×
                      </button>
                      {compressionMetadata[index] && (
                        <div className="text-xs text-gray-600 mt-1">
                          {formatFileSize(compressionMetadata[index].originalSize)} →{" "}
                          {formatFileSize(compressionMetadata[index].compressedSize)}
                          <br />
                          ({compressionMetadata[index].compressionRatio}% menor)
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Guardando..." : "Guardar Entrada"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
