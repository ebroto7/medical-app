"use client";

import { useState } from "react";
import { Database } from "@/types/database";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { SavedMealsList } from "./SavedMealsList";
import { BookOpen } from "lucide-react";

type SavedMeal = Database["public"]["Tables"]["saved_meals"]["Row"];

interface SavedMealsDialogProps {
    onSelect: (meal: SavedMeal) => void;
    trigger?: React.ReactNode;
}

export function SavedMealsDialog({ onSelect, trigger }: SavedMealsDialogProps) {
    const [open, setOpen] = useState(false);

    const handleSelect = (meal: SavedMeal) => {
        onSelect(meal);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className="gap-2">
                        <BookOpen className="h-4 w-4" />
                        Mis Comidas
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Mis Comidas Guardadas</DialogTitle>
                    <DialogDescription>
                        Selecciona una comida para usarla en tu plan.
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[300px] overflow-y-auto">
                    <SavedMealsList onSelect={handleSelect} />
                </div>
            </DialogContent>
        </Dialog>
    );
}
