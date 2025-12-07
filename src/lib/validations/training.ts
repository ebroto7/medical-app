import { z } from "zod";

// Training types enum - must match database enum
export const trainingTypes = [
  "cardio",
  "strength",
  "flexibility",
  "hiit",
  "yoga",
  "other",
] as const;

export const trainingTypeSchema = z.enum(trainingTypes);

// Date format: YYYY-MM-DD
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
// Time format: HH:MM or HH:MM:SS
const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/;

export const createTrainingSessionSchema = z.object({
  date: z.string().regex(dateRegex, "Invalid date format. Use YYYY-MM-DD"),
  time: z.string().regex(timeRegex, "Invalid time format. Use HH:MM"),
  type: trainingTypeSchema.default("other"),
  durationMinutes: z.number().int().min(1).max(600).optional(),
  description: z.string().max(2000, "Description too long (max 2000 chars)").optional(),
});

export const updateTrainingSessionSchema = z.object({
  date: z.string().regex(dateRegex, "Invalid date format. Use YYYY-MM-DD").optional(),
  time: z.string().regex(timeRegex, "Invalid time format. Use HH:MM").optional(),
  type: trainingTypeSchema.optional(),
  durationMinutes: z.number().int().min(1).max(600).nullable().optional(),
  description: z.string().max(2000, "Description too long (max 2000 chars)").nullable().optional(),
});

export type CreateTrainingSession = z.infer<typeof createTrainingSessionSchema>;
export type UpdateTrainingSession = z.infer<typeof updateTrainingSessionSchema>;
