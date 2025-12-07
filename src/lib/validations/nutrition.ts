import { z } from "zod";

// Meal types enum - must match database enum
export const mealTypes = [
  "breakfast",
  "mid-morning",
  "lunch",
  "afternoon-snack",
  "dinner",
  "extra",
] as const;

export const mealTypeSchema = z.enum(mealTypes);

// Date format: YYYY-MM-DD
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
// Time format: HH:MM or HH:MM:SS
const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/;

export const createNutritionEntrySchema = z.object({
  date: z.string().regex(dateRegex, "Invalid date format. Use YYYY-MM-DD"),
  mealType: mealTypeSchema,
  description: z.string().max(2000, "Description too long (max 2000 chars)").optional(),
  time: z.string().regex(timeRegex, "Invalid time format. Use HH:MM").optional(),
});

export const updateNutritionEntrySchema = z.object({
  date: z.string().regex(dateRegex, "Invalid date format. Use YYYY-MM-DD").optional(),
  mealType: mealTypeSchema.optional(),
  description: z.string().max(2000, "Description too long (max 2000 chars)").optional(),
  time: z.string().regex(timeRegex, "Invalid time format. Use HH:MM").nullable().optional(),
});

export type CreateNutritionEntry = z.infer<typeof createNutritionEntrySchema>;
export type UpdateNutritionEntry = z.infer<typeof updateNutritionEntrySchema>;
