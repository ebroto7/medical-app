"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Database } from "@/types/database";
import { SavedMealsService } from "@/services/saved-meals";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

type SavedMealInsert = Database["public"]["Tables"]["saved_meals"]["Insert"];

const formSchema = z.object({
    name: z.string().min(1, "El nombre es obligatorio"),
    description: z.string().optional(),
    calories: z.string().optional(),
    protein: z.string().optional(),
    carbs: z.string().optional(),
    fat: z.string().optional(),
});

interface SaveMealDialogProps {
    defaultValues?: Partial<SavedMealInsert>;
    onSave?: () => void;
    trigger?: React.ReactNode;
}

export function SaveMealDialog({ defaultValues, onSave, trigger }: SaveMealDialogProps) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: defaultValues?.name || "",
            description: defaultValues?.description || "",
            calories: defaultValues?.calories?.toString() || "0",
            protein: defaultValues?.protein?.toString() || "0",
            carbs: defaultValues?.carbs?.toString() || "0",
            fat: defaultValues?.fat?.toString() || "0",
        },
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            await SavedMealsService.createSavedMeal({
                name: values.name,
                description: values.description,
                calories: Number(values.calories) || 0,
                protein: Number(values.protein) || 0,
                carbs: Number(values.carbs) || 0,
                fat: Number(values.fat) || 0,
                meal_type: defaultValues?.meal_type || 'breakfast', // Default fallback
            });

            toast({ title: "Comida guardada", description: "Se ha guardado como plantilla correctamente." });
            setOpen(false);
            if (onSave) onSave();
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "No se pudo guardar la comida.", variant: "destructive" });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className="gap-2">
                        <Save className="h-4 w-4" />
                        Guardar como plantilla
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Guardar Comida</DialogTitle>
                    <DialogDescription>
                        Guarda esta comida para reutilizarla fácilmente en el futuro.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ej: Desayuno Avena" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descripción</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Ingredientes, notas..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-4 gap-2">
                            <FormField
                                control={form.control}
                                name="calories"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs">Kcal</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} className="text-xs px-1" />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="protein"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs">Prot</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} className="text-xs px-1" />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="carbs"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs">Carb</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} className="text-xs px-1" />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="fat"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs">Gras</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} className="text-xs px-1" />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <DialogFooter>
                            <Button type="submit">Guardar</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
