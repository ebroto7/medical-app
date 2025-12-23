"use client";

import { useState, useMemo, useEffect } from "react";
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
import { Plus, X, Info, GripVertical, MoreHorizontal, Save, BookOpen } from "lucide-react";
import {
    DAYS_OF_WEEK,
    PlanMealType,
    PLAN_MEAL_TYPES,
    PLAN_MEAL_TYPE_CONFIG,
} from "@/config/meal-plan-types";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { SaveMealDialog } from "@/components/saved-meals/SaveMealDialog";
import { SavedMealsDialog } from "@/components/saved-meals/SavedMealsDialog";

import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
    sort_order?: number;
}

interface WeeklyPlanGridProps {
    slots: WeeklySlot[];
    onSlotsChange?: (slots: WeeklySlot[]) => void;
    readOnly?: boolean;
}

function SortableRow({
    id,
    mealType,
    children,
    readOnly,
    onRemove
}: {
    id: string;
    mealType: PlanMealType;
    children: React.ReactNode;
    readOnly?: boolean;
    onRemove: () => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : "auto",
        position: isDragging ? "relative" as const : undefined,
    };

    return (
        <TableRow
            ref={setNodeRef}
            style={style}
            className={isDragging ? "bg-muted/50 shadow-sm opacity-80" : ""}
        >
            <TableCell className="font-medium bg-muted/30 align-top w-[150px]">
                <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-2">
                        {!readOnly && (
                            <div
                                {...attributes}
                                {...listeners}
                                className="cursor-grab hover:text-foreground text-muted-foreground mr-1 touch-none"
                            >
                                <GripVertical className="h-4 w-4" />
                            </div>
                        )}
                        <span className="text-xl">
                            {PLAN_MEAL_TYPE_CONFIG[mealType].emoji}
                        </span>
                        <span className="text-sm font-semibold">
                            {PLAN_MEAL_TYPE_CONFIG[mealType].label}
                        </span>
                    </div>
                    {!readOnly && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                            onClick={onRemove}
                            title="Eliminar fila"
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    )}
                </div>
            </TableCell>
            {children}
        </TableRow>
    );
}

export function WeeklyPlanGrid({
    slots,
    onSlotsChange,
    readOnly = false,
}: WeeklyPlanGridProps) {
    const [activeMealTypes, setActiveMealTypes] = useState<PlanMealType[]>(() => {
        const uniqueTypes = Array.from(new Set(slots.map((s) => s.meal_type)));

        const hasOrder = slots.some(s => s.sort_order !== undefined);

        if (hasOrder) {
            return uniqueTypes.sort((a, b) => {
                const orderA = slots.find(s => s.meal_type === a)?.sort_order ?? PLAN_MEAL_TYPE_CONFIG[a].sortOrder;
                const orderB = slots.find(s => s.meal_type === b)?.sort_order ?? PLAN_MEAL_TYPE_CONFIG[b].sortOrder;
                return orderA - orderB;
            });
        }

        return uniqueTypes.sort(
            (a, b) =>
                PLAN_MEAL_TYPE_CONFIG[a].sortOrder - PLAN_MEAL_TYPE_CONFIG[b].sortOrder
        );
    });

    useEffect(() => {
        const uniqueTypes = Array.from(new Set(slots.map((s) => s.meal_type)));
        if (uniqueTypes.length > activeMealTypes.length) {
            const newTypes = uniqueTypes.filter(t => !activeMealTypes.includes(t));
            if (newTypes.length > 0) {
                setActiveMealTypes(prev => [...prev, ...newTypes]);
            }
        }
    }, [slots]); // Intentionally omitting activeMealTypes to avoid loops

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const availableMealTypes = useMemo(() => {
        return PLAN_MEAL_TYPES.filter((type) => !activeMealTypes.includes(type));
    }, [activeMealTypes]);

    const addRow = (type: PlanMealType) => {
        setActiveMealTypes((prev) => [...prev, type]);
    };

    const removeRow = (type: PlanMealType) => {
        setActiveMealTypes((prev) => prev.filter((t) => t !== type));
        if (onSlotsChange) {
            onSlotsChange(slots.filter((s) => s.meal_type !== type));
        }
    };

    const getSlot = (day: number, type: PlanMealType) => {
        return slots.find((s) => s.day_of_week === day && s.meal_type === type);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            if (!onSlotsChange) return;

            setActiveMealTypes((items) => {
                const oldIndex = items.indexOf(active.id as PlanMealType);
                const newIndex = items.indexOf(over.id as PlanMealType);
                const newOrder = arrayMove(items, oldIndex, newIndex);

                const updatedSlots = slots.map(slot => ({
                    ...slot,
                    sort_order: newOrder.indexOf(slot.meal_type)
                }));

                // Use setTimeout to avoid React rendering loop warnings if immediate
                setTimeout(() => onSlotsChange(updatedSlots), 0);

                return newOrder;
            });
        }
    };

    const updateSlot = (
        day: number,
        type: PlanMealType,
        field: keyof WeeklySlot,
        value: string | number | undefined
    ) => {
        if (!onSlotsChange) return;

        const existingSlot = getSlot(day, type);
        const typeIndex = activeMealTypes.indexOf(type);
        const currentSortOrder = typeIndex >= 0 ? typeIndex : 999;

        if (existingSlot) {
            if (field === "meal_name" && (value === undefined || value === null)) {
                onSlotsChange(
                    slots.map((s) =>
                        s.id === existingSlot.id ? { ...s, meal_name: "", sort_order: currentSortOrder } : s
                    )
                );
                return;
            }

            onSlotsChange(
                slots.map((s) =>
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    s.id === existingSlot.id ? { ...s, [field]: value as any, sort_order: currentSortOrder } : s
                )
            );
        } else {
            if (value === "" || value === undefined) return;
            const newSlot: WeeklySlot = {
                id: crypto.randomUUID(),
                day_of_week: day,
                meal_type: type,
                meal_name: "",
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                [field]: value as any,
                sort_order: currentSortOrder,
            };
            onSlotsChange([...slots, newSlot]);
        }
    };

    const updateSlotBatch = (
        day: number,
        type: PlanMealType,
        updates: Partial<WeeklySlot>
    ) => {
        if (!onSlotsChange) return;

        const existingSlot = getSlot(day, type);
        const typeIndex = activeMealTypes.indexOf(type);
        const currentSortOrder = typeIndex >= 0 ? typeIndex : 999;

        if (existingSlot) {
            onSlotsChange(
                slots.map((s) =>
                    s.id === existingSlot.id ? { ...s, ...updates, sort_order: currentSortOrder } : s
                )
            );
        } else {
            const newSlot: WeeklySlot = {
                id: crypto.randomUUID(),
                day_of_week: day,
                meal_type: type,
                meal_name: "",
                ...updates,
                sort_order: currentSortOrder,
            };
            onSlotsChange([...slots, newSlot]);
        }
    };

    return (
        <div className="space-y-4">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
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
                            <SortableContext
                                items={activeMealTypes}
                                strategy={verticalListSortingStrategy}
                            >
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
                                            <SortableRow
                                                key={type}
                                                id={type}
                                                mealType={type}
                                                readOnly={readOnly}
                                                onRemove={() => removeRow(type)}
                                            >
                                                {DAYS_OF_WEEK.map((day) => {
                                                    const slot = getSlot(day.value, type);
                                                    return (
                                                        <TableCell
                                                            key={`${day.value}-${type}`}
                                                            className="p-2 align-top"
                                                        >
                                                            {readOnly ? (
                                                                <div className="min-h-[3rem] p-2 rounded-md bg-muted/10 text-sm">
                                                                    {slot ? (
                                                                        <div className="space-y-1">
                                                                            <p className="font-medium">
                                                                                {slot.meal_name}
                                                                            </p>
                                                                            {slot.description && (
                                                                                <p className="text-xs text-muted-foreground line-clamp-2">
                                                                                    {slot.description}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-muted-foreground/30">
                                                                            -
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div className="space-y-1.5">
                                                                    {/* Input Name with Info button */}
                                                                    <div className="relative">
                                                                        <Input
                                                                            value={slot?.meal_name || ""}
                                                                            onChange={(e) =>
                                                                                updateSlot(
                                                                                    day.value,
                                                                                    type,
                                                                                    "meal_name",
                                                                                    e.target.value
                                                                                )
                                                                            }
                                                                            className="h-8 text-sm bg-background"
                                                                            placeholder="Nombre del plato"
                                                                        />
                                                                        {(slot?.meal_name || "").length > 0 && (
                                                                            <Popover>
                                                                                <PopoverTrigger asChild>
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="icon"
                                                                                        className="h-5 w-5 absolute right-1 top-1.5 text-muted-foreground hover:bg-muted"
                                                                                        title="Detalles y macros"
                                                                                    >
                                                                                        <Info className="h-3 w-3" />
                                                                                    </Button>
                                                                                </PopoverTrigger>
                                                                                <PopoverContent className="w-80 p-3">
                                                                                    <div className="space-y-3">
                                                                                        <h4 className="font-medium leading-none flex items-center gap-2">
                                                                                            {PLAN_MEAL_TYPE_CONFIG[type].emoji} {day.label}
                                                                                        </h4>

                                                                                        {/* Descripción */}
                                                                                        <div className="space-y-2">
                                                                                            <label className="text-xs font-medium">
                                                                                                Descripción / Ingredientes
                                                                                            </label>
                                                                                            <Textarea
                                                                                                value={slot?.description || ""}
                                                                                                onChange={(e) =>
                                                                                                    updateSlot(
                                                                                                        day.value,
                                                                                                        type,
                                                                                                        "description",
                                                                                                        e.target.value
                                                                                                    )
                                                                                                }
                                                                                                className="h-20 text-sm"
                                                                                                placeholder="Detalles del plato..."
                                                                                            />
                                                                                        </div>

                                                                                        {/* Macros Grid */}
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

                                                                    {/* Botones de Saved Meals - VISIBLES INLINE */}
                                                                    {(slot?.meal_name || "").length > 0 && (
                                                                        <div className="flex gap-1.5 items-center">
                                                                            <SavedMealsDialog
                                                                                onSelect={(meal) => updateSlotBatch(day.value, type, {
                                                                                    meal_name: meal.name,
                                                                                    description: meal.description || undefined,
                                                                                    calories: meal.calories || undefined,
                                                                                    protein: meal.protein || undefined,
                                                                                    carbs: meal.carbs || undefined,
                                                                                    fat: meal.fat || undefined
                                                                                })}
                                                                                trigger={
                                                                                    <Button
                                                                                        variant="outline"
                                                                                        size="sm"
                                                                                        className="h-7 text-xs gap-1.5 flex-1"
                                                                                    >
                                                                                        <BookOpen className="h-3 w-3" />
                                                                                        Reutilizar
                                                                                    </Button>
                                                                                }
                                                                            />
                                                                            <SaveMealDialog
                                                                                defaultValues={{
                                                                                    name: slot?.meal_name || "",
                                                                                    description: slot?.description || "",
                                                                                    calories: slot?.calories,
                                                                                    protein: slot?.protein,
                                                                                    carbs: slot?.carbs,
                                                                                    fat: slot?.fat,
                                                                                    meal_type: type as any
                                                                                }}
                                                                                trigger={
                                                                                    <Button
                                                                                        variant="outline"
                                                                                        size="sm"
                                                                                        className="h-7 text-xs gap-1.5 flex-1"
                                                                                    >
                                                                                        <Save className="h-3 w-3" />
                                                                                        Guardar
                                                                                    </Button>
                                                                                }
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                    );
                                                })}
                                            </SortableRow>
                                        ))
                                    )}
                                </TableBody>
                            </SortableContext>
                        </Table>
                    </div>
                </div>
            </DndContext>

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
