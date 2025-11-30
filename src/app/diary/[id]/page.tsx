"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { Database } from "@/types/database";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

type NutritionEntry = Database["public"]["Tables"]["nutrition_entries"]["Row"] & {
  nutrition_images?: Database["public"]["Tables"]["nutrition_images"]["Row"][];
};

export default function EntryDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { token } = useAuth();
  const [entry, setEntry] = useState<NutritionEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [date, setDate] = useState("");
  const [mealType, setMealType] = useState("breakfast");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    const fetchEntry = async () => {
      try {
        if (!token) {
          setIsLoading(false);
          return;
        }

        const response = await fetch(`/api/nutrition/entries/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) throw new Error("Failed to fetch entry");

        const { data } = await response.json();
        setEntry(data);
        setDate(data.date);
        setMealType(data.meal_type);
        setDescription(data.description || "");
        setImages(data.nutrition_images?.map((img: { image_url: string }) => img.image_url) || []);
      } catch (err) {
        console.error("Error fetching entry:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchEntry();
    }
  }, [id, token]);

  const handleSave = async () => {
    setIsSaving(true);

    try {
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(`/api/nutrition/entries/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          date,
          mealType,
          description,
        }),
      });

      if (!response.ok) throw new Error("Failed to save entry");

      router.push("/diary");
    } catch (err) {
      console.error("Error saving entry:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta entrada?")) return;

    try {
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(`/api/nutrition/entries/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to delete entry");

      router.push("/diary");
    } catch (err) {
      console.error("Error deleting entry:", err);
    }
  };

  if (isLoading) {
    return <div className="text-center py-16">Cargando entrada...</div>;
  }

  if (!entry) {
    return <div className="text-center py-16">Entrada no encontrada</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="mb-6"
        >
          ← Volver
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Editar Entrada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Fecha</label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Tipo de Comida</label>
                <select
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value)}
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
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1"
                rows={5}
              />
            </div>

            {images.length > 0 && (
              <div>
                <label className="text-sm font-medium">Imágenes</label>
                <div className="grid grid-cols-4 gap-2 mt-4">
                  {images.map((imageUrl, index) => (
                    <img
                      key={index}
                      src={imageUrl}
                      alt={`Image ${index}`}
                      className="w-full h-24 object-cover rounded"
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => router.back()}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
              >
                Eliminar
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
