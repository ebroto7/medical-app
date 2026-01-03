"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database } from "@/types/database";
import { useAuth } from "@/contexts/AuthContext";

// Extended type that includes image_url from API response (signed URL)
type NutritionImageWithUrl = Database["public"]["Tables"]["nutrition_images"]["Row"] & {
  image_url: string;
};

type NutritionEntry = Database["public"]["Tables"]["nutrition_entries"]["Row"] & {
  nutrition_images?: NutritionImageWithUrl[];
};

const mealTypeLabels: Record<string, string> = {
  breakfast: "Desayuno",
  "mid-morning": "Media Mañana",
  lunch: "Comida",
  "afternoon-snack": "Merienda",
  dinner: "Cena",
  extra: "Extra",
};

interface NutritionEntriesListProps {
  userId: string;
  date?: string;
  onDelete?: () => void;
  readOnly?: boolean;
  endpointUrl?: string;
  useTokenAuth?: boolean;
}

export const NutritionEntriesList = React.memo(function NutritionEntriesList({
  userId,
  date,
  onDelete,
  readOnly = false,
  endpointUrl = "/api/nutrition/entries",
  useTokenAuth = true
}: NutritionEntriesListProps) {
  const { token } = useAuth();
  const [entries, setEntries] = useState<NutritionEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEntries = async () => {
      try {
        if (useTokenAuth && !token) {
          setIsLoading(false);
          return;
        }

        const url = new URL(endpointUrl, window.location.origin);
        if (date) url.searchParams.set("date", date);

        // For patient entries endpoint, add patientId
        if (endpointUrl.includes("patient-entries")) {
          url.searchParams.set("patientId", userId);
        }

        const headers: Record<string, string> = {};
        if (useTokenAuth && token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(url.toString(), { headers });
        if (!response.ok) throw new Error("Failed to fetch entries");

        const { data } = await response.json();
        setEntries(data || []);
      } catch (error) {
        console.error("Error fetching entries:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEntries();
  }, [userId, date, token, endpointUrl, useTokenAuth]);

  const handleDelete = async (entryId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta entrada?")) return;

    try {
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(`/api/nutrition/entries/${entryId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to delete entry");

      setEntries((prev) => prev.filter((e) => e.id !== entryId));
      onDelete?.();
    } catch (error) {
      console.error("Error deleting entry:", error);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Cargando entradas...</div>;
  }

  if (entries.length === 0) {
    return <div className="text-center py-8 text-gray-500">No hay entradas para esta fecha</div>;
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <Card key={entry.id}>
          <CardHeader>
            <CardTitle className="text-lg">
              {mealTypeLabels[entry.meal_type as keyof typeof mealTypeLabels]} - {entry.date}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {entry.description && (
              <p className="text-gray-700">{entry.description}</p>
            )}

            {entry.nutrition_images && entry.nutrition_images.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {entry.nutrition_images.map((image) => (
                  <div key={image.id} className="relative w-full h-32">
                    <Image
                      src={image.image_url}
                      alt="Comida"
                      fill
                      className="object-cover rounded"
                      unoptimized
                    />
                  </div>
                ))}
              </div>
            )}

            {!readOnly && (
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => window.location.href = `/diary/${entry.id}`}
                >
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(entry.id)}
                >
                  Eliminar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
});
