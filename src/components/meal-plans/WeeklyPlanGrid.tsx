"use client";

import { useState, useMemo } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, X, Info } from "lucide-react";
import {
    DAYS_OF_WEEK,
    PlanMealType,
    PLAN_MEAL_TYPES,
    PLAN_MEAL_TYPE_CONFIG,
    getMealTypeLabel,
} from "@/config/meal-plan-types";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";

export interface WeeklySlot {
    id: string;
    day_of_week: number;
    meal_type: PlanMealType;
    meal_name: string;
    description?: string;
    notes?: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
}

interface WeeklyPlanGridProps {
    slots: WeeklySlot[];
    onSlotsChange?: (slots: WeeklySlot[]) => void;
    readOnly?: boolean;
}

export function WeeklyPlanGrid({
    slots,
    onSlotsChange,
    readOnly = false,
}: WeeklyPlanGridProps) {
    // Determine which meal types are currently active (have at least one slot or were manually added)
    // For simplicity in this version, we derive rows from existing slots and allow adding new ones.
    // We need to track "active rows" because a row might be empty if just added.
    const [activeMealTypes, setActiveMealTypes] = useState<PlanMealType[]>(() => {
        const existingTypes = new Set(slots.map((s) => s.meal_type));
        // Sort them according to config order
        return Array.from(existingTypes).sort(
            (a, b) =>
                PLAN_MEAL_TYPE_CONFIG[a].sortOrder - PLAN_MEAL_TYPE_CONFIG[b].sortOrder
        );
    });

    const availableMealTypes = useMemo(() => {
        return PLAN_MEAL_TYPES.filter((type) => !activeMealTypes.includes(type));
    }, [activeMealTypes]);

    const addRow = (type: PlanMealType) => {
        setActiveMealTypes((prev) => {
            const newTypes = [...prev, type].sort(
                (a, b) =>
                    PLAN_MEAL_TYPE_CONFIG[a].sortOrder -
                    PLAN_MEAL_TYPE_CONFIG[b].sortOrder
            );
            return newTypes;
        });
    };

    const removeRow = (type: PlanMealType) => {
        setActiveMealTypes((prev) => prev.filter((t) => t !== type));
        // Also remove all slots of this type
        if (onSlotsChange) {
            onSlotsChange(slots.filter((s) => s.meal_type !== type));
        }
    };

    const getSlot = (day: number, type: PlanMealType) => {
        return slots.find((s) => s.day_of_week === day && s.meal_type === type);
    };

    const updateSlot = (
        day: number,
        type: PlanMealType,
        field: keyof WeeklySlot,
        value: string | number | undefined
    ) => {
        if (!onSlotsChange) return;

        const existingSlot = getSlot(day, type);
        if (existingSlot) {
            // Handle specific logic for meal_name to ensure it's never undefined
            if (field === "meal_name" && (value === undefined || value === null)) {
                onSlotsChange(
                    slots.map((s) =>
                        s.id === existingSlot.id ? { ...s, meal_name: "" } : s
                    )
                );
                return;
            }

            onSlotsChange(
                slots.map((s) =>
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    s.id === existingSlot.id ? { ...s, [field]: value as any } : s
                )
            );
        } else {
            // Create new slot
            if (value === "" || value === undefined) return; // Don't create empty slot
            const newSlot: WeeklySlot = {
                id: crypto.randomUUID(),
                day_of_week: day,
                meal_type: type,
                meal_name: "",
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                [field]: value as any,
            };
            // If we are setting something else than meal_name on a new slot, ensuring meal_name is set (it is "" by default above)
            onSlotsChange([...slots, newSlot]);
        }
    };

    return (
        <div className="space-y-4">
            <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[150px] bg-muted/50 font-semibold">
                                    Comida / Día
                                </TableHead>
                                {DAYS_OF_WEEK.map((day) => (
                                    <TableHead
                                        key={day.value}
                                        className="min-w-[180px] text-center bg-muted/50 font-semibold"
                                    >
                                        {day.label}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {activeMealTypes.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={DAYS_OF_WEEK.length + 1}
                                        className="h-24 text-center text-muted-foreground"
                                    >
                                        {readOnly
                                            ? "No hay comidas registradas"
                                            : "Añade una fila de comida para empezar (ej. Desayuno)"}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                activeMealTypes.map((type) => (
                                    <TableRow key={type}>
                                        <TableCell className="font-medium bg-muted/30 align-top">
                                            <div className="flex items-center justify-between group">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xl">
                                                        {PLAN_MEAL_TYPE_CONFIG[type].emoji}
                                                    </span>
                                                    <span className="text-sm font-semibold">
                                                        {PLAN_MEAL_TYPE_CONFIG[type].label}
                                                    </span>
                                                </div>
                                                {!readOnly && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                                        onClick={() => removeRow(type)}
                                                        title="Eliminar fila"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                        {DAYS_OF_WEEK.map((day) => {
                                            const slot = getSlot(day.value, type);
                                            return (
                                                <TableCell key={`${day.value}-${type}`} className="p-2 align-top">
                                                    {readOnly ? (
                                                        <div className="min-h-[3rem] p-2 rounded-md bg-muted/10 text-sm">
                                                            {slot ? (
                                                                <div className="space-y-1">
                                                                    <p className="font-medium">{slot.meal_name}</p>
                                                                    {slot.description && (
                                                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                                                            {slot.description}
                                                                        </p>
                                                                    )}
                                                                    {/* Optional: Show macro badgets if present */}
                                                                </div>
                                                            ) : (
                                                                <span className="text-muted-foreground/30">-</span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-1 group relative">
                                                            <Input
                                                                value={slot?.meal_name || ""}
                                                                onChange={(e) =>
                                                                    updateSlot(day.value, type, "meal_name", e.target.value)
                                                                }
                                                                className="h-8 text-sm bg-background"
                                                                placeholder="..."
                                                            />
                                                            {/* Details PopoverTrigger */}
                                                            {(slot?.meal_name || "").length > 0 && (
                                                                <Popover>
                                                                    <PopoverTrigger asChild>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-5 w-5 absolute right-1 top-1.5 opacity-0 group-hover:opacity-100 text-muted-foreground"
                                                                        >
                                                                            <Info className="h-3 w-3" />
                                                                        </Button>
                                                                    </PopoverTrigger>
                                                                    <PopoverContent className="w-80 p-3">
                                                                        <div className="space-y-3">
                                                                            <h4 className="font-medium leading-none flex items-center gap-2">
                                                                                {PLAN_MEAL_TYPE_CONFIG[type].emoji} {day.label}
                                                                            </h4>
                                                                            <div className="space-y-2">
                                                                                <label className="text-xs font-medium">Descripción / Ingredientes</label>
                                                                                <Textarea
                                                                                    value={slot?.description || ""}
                                                                                    onChange={(e) => updateSlot(day.value, type, "description", e.target.value)}
                                                                                    className="h-20 text-sm"
                                                                                    placeholder="Detalles del plato..."
                                                                                />
                                                                            </div>
                                                                            <div className="grid grid-cols-4 gap-2">
                                                                                <div>
                                                                                    <label className="text-[10px] text-muted-foreground">Kcal</label>
                                                                                    <Input type="number" className="h-7 text-xs px-1" placeholder="0"
                                                                                        value={slot?.calories || ""}
                                                                                        onChange={(e) => updateSlot(day.value, type, "calories", e.target.value ? Number(e.target.value) : undefined)}
                                                                                    />
                                                                                </div>
                                                                                <div>
                                                                                    <label className="text-[10px] text-muted-foreground">Prot</label>
                                                                                    <Input type="number" className="h-7 text-xs px-1" placeholder="0"
                                                                                        value={slot?.protein || ""}
                                                                                        onChange={(e) => updateSlot(day.value, type, "protein", e.target.value ? Number(e.target.value) : undefined)}
                                                                                    />
                                                                                </div>
                                                                                <div>
                                                                                    <label className="text-[10px] text-muted-foreground">Carb</label>
                                                                                    <Input type="number" className="h-7 text-xs px-1" placeholder="0"
                                                                                        value={slot?.carbs || ""}
                                                                                        onChange={(e) => updateSlot(day.value, type, "carbs", e.target.value ? Number(e.target.value) : undefined)}
                                                                                    />
                                                                                </div>
                                                                                <div>
                                                                                    <label className="text-[10px] text-muted-foreground">Gras</label>
                                                                                    <Input type="number" className="h-7 text-xs px-1" placeholder="0"
                                                                                        value={slot?.fat || ""}
                                                                                        onChange={(e) => updateSlot(day.value, type, "fat", e.target.value ? Number(e.target.value) : undefined)}
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </PopoverContent>
                                                                </Popover>
                                                            )}
                                                        </div>
                                                    )}
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {!readOnly && availableMealTypes.length > 0 && (
                <div className="flex justify-start">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="gap-2">
                                <Plus className="h-4 w-4" />
                                Añadir Fila de Comida
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            {availableMealTypes.map((type) => (
                                <DropdownMenuItem key={type} onClick={() => addRow(type)}>
                                    <span className="mr-2">
                                        {PLAN_MEAL_TYPE_CONFIG[type].emoji}
                                    </span>
                                    {PLAN_MEAL_TYPE_CONFIG[type].label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )}
        </div>
    );
}
