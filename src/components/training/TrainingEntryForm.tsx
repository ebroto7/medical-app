"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Dumbbell, Heart, Zap, Activity, Sparkles, MoreHorizontal } from "lucide-react";

const trainingTypes = [
  { value: "cardio", label: "Cardio", icon: Heart, color: "bg-red-100 text-red-700 border-red-300" },
  { value: "strength", label: "Fuerza", icon: Dumbbell, color: "bg-blue-100 text-blue-700 border-blue-300" },
  { value: "flexibility", label: "Flexibilidad", icon: Activity, color: "bg-purple-100 text-purple-700 border-purple-300" },
  { value: "hiit", label: "HIIT", icon: Zap, color: "bg-orange-100 text-orange-700 border-orange-300" },
  { value: "yoga", label: "Yoga", icon: Sparkles, color: "bg-green-100 text-green-700 border-green-300" },
  { value: "other", label: "Otro", icon: MoreHorizontal, color: "bg-gray-100 text-gray-700 border-gray-300" },
] as const;

const formSchema = z.object({
  date: z.string(),
  time: z.string(),
  type: z.enum(["cardio", "strength", "flexibility", "hiit", "yoga", "other"]),
  durationMinutes: z.string().optional(),
  description: z.string().min(1, "La descripción es obligatoria"),
});

type FormValues = z.infer<typeof formSchema>;

// Round time to nearest 15 minutes
function getRoundedTime(): string {
  const now = new Date();
  const minutes = Math.round(now.getMinutes() / 15) * 15;
  now.setMinutes(minutes);
  now.setSeconds(0);
  return now.toTimeString().slice(0, 5);
}

interface TrainingEntryFormProps {
  onSuccess?: () => void;
}

export function TrainingEntryForm({ onSuccess }: TrainingEntryFormProps) {
  const { user, token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      time: getRoundedTime(),
      type: "cardio",
      durationMinutes: "",
      description: "",
    },
  });

  const selectedType = form.watch("type");

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-600">
            Por favor inicia sesión para registrar entrenamientos
          </p>
        </CardContent>
      </Card>
    );
  }

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);

    try {
      if (!token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch("/api/training/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          date: data.date,
          time: data.time,
          type: data.type,
          durationMinutes: data.durationMinutes ? parseInt(data.durationMinutes) : null,
          description: data.description,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create training session");
      }

      form.reset({
        date: new Date().toISOString().split("T")[0],
        time: getRoundedTime(),
        type: "cardio",
        durationMinutes: "",
        description: "",
      });
      onSuccess?.();
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-amber-200 bg-amber-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Dumbbell className="h-5 w-5 text-amber-600" />
          Nuevo Entrenamiento
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Fecha</label>
              <Input
                type="date"
                {...form.register("date")}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Hora</label>
              <Input
                type="time"
                {...form.register("time")}
                className="mt-1"
              />
            </div>
          </div>

          {/* Training Type Tags */}
          <div>
            <label className="text-sm font-medium">Tipo de Entrenamiento</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {trainingTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = selectedType === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => form.setValue("type", type.value)}
                    className={`
                      flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                      border transition-all duration-200
                      ${isSelected 
                        ? `${type.color} ring-2 ring-offset-1 ring-current` 
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                      }
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    {type.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="text-sm font-medium">
              Duración (minutos) <span className="text-gray-400 font-normal">- opcional</span>
            </label>
            <Input
              type="number"
              placeholder="ej: 45"
              {...form.register("durationMinutes")}
              className="mt-1"
              min={1}
              max={480}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium">Comentario / Descripción</label>
            <Textarea
              placeholder="Describe tu entrenamiento..."
              {...form.register("description")}
              className="mt-1"
              rows={3}
            />
            {form.formState.errors.description && (
              <p className="text-sm text-red-500 mt-1">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          <Button 
            type="submit" 
            disabled={isLoading} 
            className="w-full bg-amber-600 hover:bg-amber-700"
          >
            {isLoading ? "Guardando..." : "Guardar Entrenamiento"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
