"use client";

import { useState, useEffect } from "react";
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
import { Select } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

type SavedMealInsert = Database["public"]["Tables"]["saved_meals"]["Insert"];
type SavedMeal = Database["public"]["Tables"]["saved_meals"]["Row"];

const formSchema = z.object({
    name: z.string().min(1, "El nombre es obligatorio"),
    meal_type: z.string(),
    description: z.string().optional(),
    calories: z.string().optional(),
    protein: z.string().optional(),
    carbs: z.string().optional(),
    fat: z.string().optional(),
});

interface SaveMealDialogProps {
    defaultValues?: Partial<SavedMealInsert>;
    initialData?: SavedMeal; // NUEVO: para modo edición
    onSave?: () => void;
    trigger?: React.ReactNode;
    open?: boolean; // NUEVO: controlled mode
    onOpenChange?: (open: boolean) => void; // NUEVO: controlled mode
}

export function SaveMealDialog({ defaultValues, initialData, onSave, trigger, open: controlledOpen, onOpenChange }: SaveMealDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const { toast } = useToast();
    const isEditMode = !!initialData;

    // Use controlled state if provided, otherwise use internal state
    const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const setOpen = onOpenChange || setInternalOpen;

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: initialData?.name || defaultValues?.name || "",
            meal_type: initialData?.meal_type || defaultValues?.meal_type || "breakfast",
            description: initialData?.description || defaultValues?.description || "",
            calories: (initialData?.calories || defaultValues?.calories)?.toString() || "0",
            protein: (initialData?.protein || defaultValues?.protein)?.toString() || "0",
            carbs: (initialData?.carbs || defaultValues?.carbs)?.toString() || "0",
            fat: (initialData?.fat || defaultValues?.fat)?.toString() || "0",
        },
    });

    // Reset form when dialog opens with new data
    useEffect(() => {
        if (open) {
            form.reset({
                name: initialData?.name || defaultValues?.name || "",
                meal_type: initialData?.meal_type || defaultValues?.meal_type || "breakfast",
                description: initialData?.description || defaultValues?.description || "",
                calories: (initialData?.calories || defaultValues?.calories)?.toString() || "0",
                protein: (initialData?.protein || defaultValues?.protein)?.toString() || "0",
                carbs: (initialData?.carbs || defaultValues?.carbs)?.toString() || "0",
                fat: (initialData?.fat || defaultValues?.fat)?.toString() || "0",
            });
        }
    }, [open, initialData, defaultValues, form]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            if (isEditMode && initialData) {
                // UPDATE
                await SavedMealsService.updateSavedMeal(initialData.id, {
                    name: values.name,
                    meal_type: values.meal_type as any,
                    description: values.description,
                    calories: Number(values.calories) || 0,
                    protein: Number(values.protein) || 0,
                    carbs: Number(values.carbs) || 0,
                    fat: Number(values.fat) || 0,
                });
                toast({ title: "Comida actualizada", description: "Los cambios se han guardado correctamente." });
            } else {
                // CREATE
                await SavedMealsService.createSavedMeal({
                    name: values.name,
                    meal_type: values.meal_type as any,
                    description: values.description,
                    calories: Number(values.calories) || 0,
                    protein: Number(values.protein) || 0,
                    carbs: Number(values.carbs) || 0,
                    fat: Number(values.fat) || 0,
                });
                toast({ title: "Comida guardada", description: "Se ha guardado como plantilla correctamente." });
            }
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
                    <DialogTitle>{isEditMode ? "Editar Comida" : "Guardar Comida"}</DialogTitle>
                    <DialogDescription>
                        {isEditMode
                            ? "Modifica los datos de esta comida guardada."
                            : "Guarda esta comida para reutilizarla fácilmente en el futuro."}
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
                            name="meal_type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tipo de Comida</FormLabel>
                                    <FormControl>
                                        <Select {...field}>
                                            <option value="breakfast">Desayuno</option>
                                            <option value="morning_snack">Media Mañana</option>
                                            <option value="lunch">Comida</option>
                                            <option value="afternoon_snack">Merienda</option>
                                            <option value="dinner">Cena</option>
                                            <option value="pre_workout">Pre-Entreno</option>
                                            <option value="post_workout">Post-Entreno</option>
                                            <option value="extra">Extra</option>
                                        </Select>
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
