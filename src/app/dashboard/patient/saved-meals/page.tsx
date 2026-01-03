"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SavedMealsService } from "@/services/saved-meals";
import { Database } from "@/types/database";
import { SaveMealDialog } from "@/components/saved-meals/SaveMealDialog";
import { Plus, Pencil, Trash2, Utensils } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type SavedMeal = Database["public"]["Tables"]["saved_meals"]["Row"];

const mealTypeLabels: Record<string, string> = {
  breakfast: "Desayuno",
  morning_snack: "Media Mañana",
  lunch: "Comida",
  afternoon_snack: "Merienda",
  dinner: "Cena",
  pre_workout: "Pre-Entreno",
  post_workout: "Post-Entreno",
  extra: "Extra",
};

export default function SavedMealsPage() {
  const [meals, setMeals] = useState<SavedMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMeal, setEditingMeal] = useState<SavedMeal | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const { toast } = useToast();

  const loadMeals = useCallback(async () => {
    try {
      const data = await SavedMealsService.getSavedMeals();
      setMeals(data);
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "No se pudieron cargar las comidas", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadMeals();
  }, [loadMeals]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("¿Eliminar esta comida guardada?")) return;
    // Optimistic update
    const previousMeals = meals;
    setMeals(prev => prev.filter((m) => m.id !== id));
    try {
      await SavedMealsService.deleteSavedMeal(id);
      toast({ title: "Comida eliminada" });
    } catch (error) {
      // Rollback on error
      setMeals(previousMeals);
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" });
    }
  }, [meals, toast]);

  const handleMealSaved = useCallback(() => {
    // Reload meals after save since the dialog doesn't return the saved meal
    loadMeals();
    setEditingMeal(null);
  }, [loadMeals]);

  const handleSetFilterType = useCallback((type: string | null) => {
    setFilterType(type);
  }, []);

  const handleEditMeal = useCallback((meal: SavedMeal) => {
    setEditingMeal(meal);
  }, []);

  // Filtrar comidas según el tipo seleccionado
  const filteredMeals = filterType
    ? meals.filter((meal) => meal.meal_type === filterType)
    : meals;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Biblioteca de Comidas</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Gestiona tus comidas guardadas para reutilizarlas en tus planes
            </p>
          </div>
          <SaveMealDialog onSave={loadMeals} trigger={
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Comida
            </Button>
          } />
        </div>

        {/* Filtros */}
        {meals.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filterType === null ? "default" : "outline"}
              size="sm"
              onClick={() => handleSetFilterType(null)}
            >
              Todas ({meals.length})
            </Button>
            {Object.entries(mealTypeLabels).map(([type, label]) => {
              const count = meals.filter((m) => m.meal_type === type).length;
              if (count === 0) return null;
              return (
                <Button
                  key={type}
                  variant={filterType === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSetFilterType(type)}
                >
                  {label} ({count})
                </Button>
              );
            })}
          </div>
        )}

        {/* Content */}
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Cargando...</p>
            </div>
          ) : meals.length === 0 ? (
            <Card className="p-12 text-center">
              <Utensils className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No tienes comidas guardadas</h3>
              <p className="text-muted-foreground mb-6">
                Crea tu primera comida para reutilizarla en tus planes semanales
              </p>
              <SaveMealDialog onSave={loadMeals} trigger={
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Crear Primera Comida
                </Button>
              } />
            </Card>
          ) : filteredMeals.length === 0 ? (
            <Card className="p-12 text-center">
              <Utensils className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay comidas de este tipo</h3>
              <p className="text-muted-foreground mb-6">
                Prueba con otro filtro o crea una nueva comida
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredMeals.map((meal) => (
                <Card key={meal.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground mb-1">{meal.name}</h3>
                      <span className="inline-block px-2 py-0.5 rounded-full bg-muted text-xs font-medium mb-2">
                        {meal.meal_type ? (mealTypeLabels[meal.meal_type] || meal.meal_type) : "Sin tipo"}
                      </span>
                      {meal.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{meal.description}</p>
                      )}
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        {meal.calories && <span>{meal.calories} kcal</span>}
                        {meal.protein && <span>P: {meal.protein}g</span>}
                        {meal.carbs && <span>C: {meal.carbs}g</span>}
                        {meal.fat && <span>G: {meal.fat}g</span>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => handleEditMeal(meal)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-accent-red hover:text-accent-red hover:bg-accent-red/10"
                        onClick={() => handleDelete(meal.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Edit Dialog */}
        <SaveMealDialog
          initialData={editingMeal || undefined}
          open={!!editingMeal}
          onOpenChange={(open) => !open && setEditingMeal(null)}
          onSave={handleMealSaved}
        />
      </div>
    </DashboardLayout>
  );
}
