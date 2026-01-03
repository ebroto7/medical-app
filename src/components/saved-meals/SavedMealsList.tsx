"use client";

import React, { useEffect, useState } from "react";
import { Database } from "@/types/database";
import { SavedMealsService } from "@/services/saved-meals";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type SavedMeal = Database["public"]["Tables"]["saved_meals"]["Row"];

interface SavedMealsListProps {
    onSelect: (meal: SavedMeal) => void;
}

export const SavedMealsList = React.memo(function SavedMealsList({ onSelect }: SavedMealsListProps) {
    const [meals, setMeals] = useState<SavedMeal[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        loadMeals();
    }, []);

    const loadMeals = async () => {
        try {
            const data = await SavedMealsService.getSavedMeals();
            setMeals(data);
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "No se pudieron cargar las comidas guardadas", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        try {
            await SavedMealsService.deleteSavedMeal(id);
            setMeals(meals.filter((m) => m.id !== id));
            toast({ title: "Comida eliminada" });
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "No se pudo eliminar la comida", variant: "destructive" });
        }
    };

    if (loading) {
        return <div className="text-center p-4">Cargando...</div>;
    }

    if (meals.length === 0) {
        return (
            <div className="text-center p-8 text-muted-foreground">
                No tienes comidas guardadas aún.
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {meals.map((meal) => (
                <Card
                    key={meal.id}
                    className="p-3 cursor-pointer hover:bg-muted/50 transition-colors flex justify-between items-center"
                    onClick={() => onSelect(meal)}
                >
                    <div>
                        <h4 className="font-medium">{meal.name}</h4>
                        <div className="text-xs text-muted-foreground flex gap-2">
                            <span>{meal.meal_type}</span>
                            {meal.calories && <span>• {meal.calories} kcal</span>}
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={(e) => handleDelete(e, meal.id)}
                        aria-label="Eliminar comida"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </Card>
            ))}
        </div>
    );
});
