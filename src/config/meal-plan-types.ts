export type PlanMealType = "breakfast" | "mid_morning" | "lunch" | "afternoon_snack" | "dinner" | "extra";

export const PLAN_MEAL_TYPE_CONFIG: Record<PlanMealType, { label: string; emoji: string; sortOrder: number }> = {
  breakfast: { label: "Desayuno", emoji: "🌅", sortOrder: 0 },
  mid_morning: { label: "Media Mañana", emoji: "☕", sortOrder: 1 },
  lunch: { label: "Comida", emoji: "🍽️", sortOrder: 2 },
  afternoon_snack: { label: "Merienda", emoji: "🍎", sortOrder: 3 },
  dinner: { label: "Cena", emoji: "🌙", sortOrder: 4 },
  extra: { label: "Extra", emoji: "➕", sortOrder: 5 },
};

export const PLAN_MEAL_TYPES = Object.keys(PLAN_MEAL_TYPE_CONFIG) as PlanMealType[];

export const DAYS_OF_WEEK = [
  { value: 0, label: "Lunes", short: "Lun" },
  { value: 1, label: "Martes", short: "Mar" },
  { value: 2, label: "Miércoles", short: "Mié" },
  { value: 3, label: "Jueves", short: "Jue" },
  { value: 4, label: "Viernes", short: "Vie" },
  { value: 5, label: "Sábado", short: "Sáb" },
  { value: 6, label: "Domingo", short: "Dom" },
];

export const getMealTypeLabel = (type: PlanMealType): string => {
  return PLAN_MEAL_TYPE_CONFIG[type]?.label || type;
};

export const getMealTypeEmoji = (type: PlanMealType): string => {
  return PLAN_MEAL_TYPE_CONFIG[type]?.emoji || "🍴";
};

export const getDayLabel = (dayOfWeek: number): string => {
  return DAYS_OF_WEEK.find(d => d.value === dayOfWeek)?.label || "";
};

export const getDayShort = (dayOfWeek: number): string => {
  return DAYS_OF_WEEK.find(d => d.value === dayOfWeek)?.short || "";
};
