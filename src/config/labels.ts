/**
 * Centralized labels for the application.
 *
 * This file eliminates label duplication across components.
 * Previously duplicated in:
 * - src/components/nutrition/NutritionEntriesList.tsx
 * - src/components/nutrition/EntryDetailDialog.tsx
 * - src/components/calendar/DayView.tsx
 * - src/components/calendar/PatientDayView.tsx
 * - src/app/dashboard/patient/saved-meals/page.tsx
 */

// ============================================
// Meal Types
// ============================================

export type MealType =
  | "breakfast"
  | "mid-morning"
  | "lunch"
  | "afternoon-snack"
  | "dinner"
  | "extra";

/**
 * Spanish labels for meal types.
 * Used throughout the nutrition tracking features.
 */
export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "Desayuno",
  "mid-morning": "Media Mañana",
  lunch: "Comida",
  "afternoon-snack": "Merienda",
  dinner: "Cena",
  extra: "Extra",
};

/**
 * Get label for a meal type with fallback.
 */
export function getMealTypeLabel(type: string): string {
  return MEAL_TYPE_LABELS[type as MealType] || type;
}

/**
 * Ordered array of meal types for forms/selects.
 */
export const MEAL_TYPES_ORDERED: MealType[] = [
  "breakfast",
  "mid-morning",
  "lunch",
  "afternoon-snack",
  "dinner",
  "extra",
];

/**
 * Options format for Select components.
 */
export const MEAL_TYPE_OPTIONS = MEAL_TYPES_ORDERED.map((type) => ({
  value: type,
  label: MEAL_TYPE_LABELS[type],
}));

// ============================================
// Day of Week
// ============================================

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Spanish labels for days of the week (0 = Sunday).
 */
export const DAY_OF_WEEK_LABELS: Record<DayOfWeek, string> = {
  0: "Domingo",
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
};

/**
 * Short Spanish labels for days (calendar headers).
 */
export const DAY_OF_WEEK_SHORT: Record<DayOfWeek, string> = {
  0: "Dom",
  1: "Lun",
  2: "Mar",
  3: "Mié",
  4: "Jue",
  5: "Vie",
  6: "Sáb",
};

// ============================================
// Notifications
// ============================================

export type NotificationType =
  | "connection_request"
  | "connection_accepted"
  | "comment_added"
  | "meal_plan_assigned"
  | "gpx_plan_shared";

/**
 * Spanish labels for notification types.
 */
export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  connection_request: "Solicitud de conexión",
  connection_accepted: "Conexión aceptada",
  comment_added: "Nuevo comentario",
  meal_plan_assigned: "Plan de comidas asignado",
  gpx_plan_shared: "Plan GPX compartido",
};

// ============================================
// Connection Status
// ============================================

export type ConnectionStatus = "pending" | "accepted" | "rejected";

export const CONNECTION_STATUS_LABELS: Record<ConnectionStatus, string> = {
  pending: "Pendiente",
  accepted: "Aceptado",
  rejected: "Rechazado",
};

// ============================================
// GPX Sport Types
// ============================================

export type GPXSportType =
  | "running"
  | "trail_running"
  | "cycling"
  | "mtb"
  | "hiking"
  | "swimming"
  | "triathlon"
  | "other";

export const GPX_SPORT_TYPE_LABELS: Record<GPXSportType, string> = {
  running: "Running",
  trail_running: "Trail Running",
  cycling: "Ciclismo",
  mtb: "MTB",
  hiking: "Senderismo",
  swimming: "Natación",
  triathlon: "Triatlón",
  other: "Otro",
};

export function getGPXSportTypeLabel(type: string): string {
  return GPX_SPORT_TYPE_LABELS[type as GPXSportType] || type;
}

export const GPX_SPORT_TYPE_OPTIONS = (
  Object.entries(GPX_SPORT_TYPE_LABELS) as [GPXSportType, string][]
).map(([value, label]) => ({ value, label }));

// ============================================
// User Roles
// ============================================

export type UserRole = "patient" | "nutritionist";

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  patient: "Paciente",
  nutritionist: "Nutricionista",
};
