/**
 * Validation Schemas for GPX Plans and Waypoints
 */

import { z } from "zod";

/**
 * Schema para crear un nuevo GPX plan
 */
export const createGPXPlanSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name too long"),
  description: z.string().max(1000, "Description too long").optional(),
  event_name: z.string().max(200, "Event name too long").optional(),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)").optional(),
  sport_type: z.enum(['running', 'cycling', 'triathlon', 'hiking', 'other']).default('running'),
});

/**
 * Schema para actualizar un GPX plan
 */
export const updateGPXPlanSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name too long").optional(),
  description: z.string().max(1000, "Description too long").optional(),
  event_name: z.string().max(200, "Event name too long").optional(),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)").optional(),
  sport_type: z.enum(['running', 'cycling', 'triathlon', 'hiking', 'other']).optional(),
  nutritionist_id: z.string().uuid("Invalid nutritionist ID").optional(),
});

/**
 * Schema para crear un nutrition waypoint
 */
export const createWaypointSchema = z.object({
  latitude: z.number().min(-90, "Latitude out of range").max(90, "Latitude out of range"),
  longitude: z.number().min(-180, "Longitude out of range").max(180, "Longitude out of range"),
  elevation_m: z.number().optional(),
  distance_from_start_km: z.number().min(0, "Distance must be positive").optional(),
  trigger_distance_km: z.number().min(0, "Distance must be positive").optional(),
  trigger_time_min: z.number().int("Time must be an integer").min(0, "Time must be positive").optional(),
  nutrition_type: z.enum([
    'hydration',
    'isotonic_drink',
    'energy_gel',
    'solid_food',
    'salt_caps',
    'caffeine',
    'custom'
  ]),
  product_name: z.string().max(200, "Product name too long").optional(),
  calories: z.number().int("Calories must be an integer").min(0, "Calories must be positive").optional(),
  carbs: z.number().min(0, "Carbs must be positive").optional(),
  protein: z.number().min(0, "Protein must be positive").optional(),
  fat: z.number().min(0, "Fat must be positive").optional(),
  sodium_mg: z.number().int("Sodium must be an integer").min(0, "Sodium must be positive").optional(),
  caffeine_mg: z.number().int("Caffeine must be an integer").min(0, "Caffeine must be positive").optional(),
  quantity: z.number().min(0, "Quantity must be positive").optional(),
  quantity_unit: z.string().max(20, "Unit too long").optional(),
  notes: z.string().max(1000, "Notes too long").optional(),
  icon_symbol: z.string().max(50, "Symbol too long").optional(),
  sort_order: z.number().int("Sort order must be an integer").optional(),
}).refine(
  data => data.trigger_distance_km !== undefined || data.trigger_time_min !== undefined,
  { message: "At least one trigger (distance or time) is required" }
);

/**
 * Schema para actualizar un nutrition waypoint
 */
export const updateWaypointSchema = z.object({
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  elevation_m: z.number().optional(),
  distance_from_start_km: z.number().min(0).optional(),
  trigger_distance_km: z.number().min(0).optional(),
  trigger_time_min: z.number().int().min(0).optional(),
  nutrition_type: z.enum([
    'hydration',
    'isotonic_drink',
    'energy_gel',
    'solid_food',
    'salt_caps',
    'caffeine',
    'custom'
  ]).optional(),
  product_name: z.string().max(200).optional(),
  calories: z.number().int().min(0).optional(),
  carbs: z.number().min(0).optional(),
  protein: z.number().min(0).optional(),
  fat: z.number().min(0).optional(),
  sodium_mg: z.number().int().min(0).optional(),
  caffeine_mg: z.number().int().min(0).optional(),
  quantity: z.number().min(0).optional(),
  quantity_unit: z.string().max(20).optional(),
  notes: z.string().max(1000).optional(),
  icon_symbol: z.string().max(50).optional(),
  sort_order: z.number().int().optional(),
});

/**
 * Schema para query params de GET waypoints
 */
export const getWaypointsQuerySchema = z.object({
  gpx_plan_id: z.string().uuid("Invalid plan ID"),
});

/**
 * Schema para query params de DELETE waypoint
 */
export const deleteWaypointQuerySchema = z.object({
  id: z.string().uuid("Invalid waypoint ID"),
});

/**
 * Types exportados desde los schemas
 */
export type CreateGPXPlanInput = z.infer<typeof createGPXPlanSchema>;
export type UpdateGPXPlanInput = z.infer<typeof updateGPXPlanSchema>;
export type CreateWaypointInput = z.infer<typeof createWaypointSchema>;
export type UpdateWaypointInput = z.infer<typeof updateWaypointSchema>;
