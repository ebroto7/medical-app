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
 * Schema for repeat configuration (temporal loops)
 */
const repeatConfigSchema = z.object({
  start_time_min: z.number().int("Start time must be an integer").min(0, "Start time must be positive").max(1440, "Start time cannot exceed 24 hours (1440 minutes)"),
  interval_min: z.number().int("Interval must be an integer").min(1, "Interval must be at least 1 minute").max(480, "Interval cannot exceed 8 hours (480 minutes)"),
  repetitions: z.number().int("Repetitions must be an integer").min(1, "Must have at least 1 repetition").max(50, "Cannot exceed 50 repetitions"),
});

/**
 * Base schema with common nutrition waypoint fields
 */
const baseWaypointSchema = z.object({
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
  quantity_unit: z.string().max(50, "Unit too long").optional(),
  notes: z.string().max(1000, "Notes too long").optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color (e.g., #3b82f6)").optional(),
  // Legacy fields for backwards compatibility
  icon_symbol: z.string().max(50, "Symbol too long").optional(),
  sort_order: z.number().int("Sort order must be an integer").optional(),
});

/**
 * Schema para crear waypoint ESPACIAL (distance-based with coordinates)
 *
 * Spatial waypoints are tied to geographic coordinates and distance from start.
 * Used for location-specific nutrition (e.g., "Energy gel at km 15").
 */
export const createSpatialWaypointSchema = baseWaypointSchema.extend({
  type: z.literal('spatial'),
  latitude: z.number().min(-90, "Latitude out of range").max(90, "Latitude out of range"),
  longitude: z.number().min(-180, "Longitude out of range").max(180, "Longitude out of range"),
  elevation_m: z.number().optional(),
  distance_from_start_km: z.number().min(0, "Distance must be positive"),
  trigger_distance_km: z.number().min(0, "Distance must be positive").optional(),
  // Spatial waypoints CANNOT have temporal fields
  trigger_time_min: z.literal(null).optional(),
  is_repeating: z.literal(false).optional(),
  repeat_config: z.literal(null).optional(),
});

/**
 * Schema para crear waypoint TEMPORAL ÚNICO (time-based without coordinates)
 *
 * Temporal single waypoints trigger at specific elapsed time.
 * Used for time-based nutrition (e.g., "Energy gel at 60 minutes").
 */
export const createTemporalWaypointSchema = baseWaypointSchema.extend({
  type: z.literal('temporal'),
  trigger_time_min: z.number().int("Time must be an integer").min(0, "Time must be positive").max(1440, "Time cannot exceed 24 hours (1440 minutes)"),
  // Temporal waypoints CANNOT have spatial fields
  latitude: z.literal(null).optional(),
  longitude: z.literal(null).optional(),
  elevation_m: z.literal(null).optional(),
  distance_from_start_km: z.literal(null).optional(),
  trigger_distance_km: z.literal(null).optional(),
  // Single temporal waypoints are NOT repeating
  is_repeating: z.literal(false).optional(),
  repeat_config: z.literal(null).optional(),
});

/**
 * Schema para crear waypoint TEMPORAL REPETITIVO/BUCLE (repeating pattern)
 *
 * Temporal loop waypoints repeat at regular intervals.
 * Used for recurring nutrition (e.g., "Hydration every 20 min starting at min 20").
 */
export const createTemporalLoopSchema = baseWaypointSchema.extend({
  type: z.literal('temporal'),
  is_repeating: z.literal(true),
  repeat_config: repeatConfigSchema,
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color (e.g., #3b82f6)"),  // REQUIRED for loops
  // Loop waypoints CANNOT have spatial fields
  latitude: z.literal(null).optional(),
  longitude: z.literal(null).optional(),
  elevation_m: z.literal(null).optional(),
  distance_from_start_km: z.literal(null).optional(),
  trigger_distance_km: z.literal(null).optional(),
  trigger_time_min: z.literal(null).optional(),
});

/**
 * Discriminated union schema for creating waypoints
 *
 * Accepts any of the three waypoint types, discriminated by 'type' field.
 * Ensures type-safe validation based on waypoint type.
 */
export const createWaypointSchema = z.discriminatedUnion('type', [
  createSpatialWaypointSchema,
  createTemporalWaypointSchema,
  createTemporalLoopSchema,
]);

/**
 * Schema para actualizar un nutrition waypoint
 *
 * Allows partial updates of all fields EXCEPT 'type' (which is immutable).
 * Cannot change a spatial waypoint to temporal or vice versa.
 */
export const updateWaypointSchema = z.object({
  waypoint_id: z.string().uuid("Invalid waypoint ID"),
  // Nutrition data (can update for any waypoint type)
  nutrition_type: z.enum([
    'hydration',
    'isotonic_drink',
    'energy_gel',
    'solid_food',
    'salt_caps',
    'caffeine',
    'custom'
  ]).optional(),
  product_name: z.string().max(200, "Product name too long").optional(),
  calories: z.number().int("Calories must be an integer").min(0, "Calories must be positive").optional(),
  carbs: z.number().min(0, "Carbs must be positive").optional(),
  protein: z.number().min(0, "Protein must be positive").optional(),
  fat: z.number().min(0, "Fat must be positive").optional(),
  sodium_mg: z.number().int("Sodium must be an integer").min(0, "Sodium must be positive").optional(),
  caffeine_mg: z.number().int("Caffeine must be an integer").min(0, "Caffeine must be positive").optional(),
  quantity: z.number().min(0, "Quantity must be positive").optional(),
  quantity_unit: z.string().max(50, "Unit too long").optional(),
  notes: z.string().max(1000, "Notes too long").optional(),
  // Color (can update for loop waypoints)
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color").optional(),
  // Spatial fields (can update for spatial waypoints only - validated in API)
  latitude: z.number().min(-90, "Latitude out of range").max(90, "Latitude out of range").optional(),
  longitude: z.number().min(-180, "Longitude out of range").max(180, "Longitude out of range").optional(),
  elevation_m: z.number().optional(),
  distance_from_start_km: z.number().min(0, "Distance must be positive").optional(),
  // Temporal fields (can update for temporal waypoints only - validated in API)
  trigger_time_min: z.number().int("Time must be an integer").min(0, "Time must be positive").max(1440, "Time cannot exceed 24 hours").optional(),
  // Loop config (can update for loop waypoints only - validated in API)
  repeat_config: repeatConfigSchema.optional(),
  // TYPE CANNOT BE CHANGED (excluded from schema)
  // is_repeating CANNOT BE CHANGED (excluded from schema)
}).strict();

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

// Waypoint creation types (discriminated union)
export type CreateWaypointInput = z.infer<typeof createWaypointSchema>;
export type CreateSpatialWaypointInput = z.infer<typeof createSpatialWaypointSchema>;
export type CreateTemporalWaypointInput = z.infer<typeof createTemporalWaypointSchema>;
export type CreateTemporalLoopInput = z.infer<typeof createTemporalLoopSchema>;

// Waypoint update type
export type UpdateWaypointInput = z.infer<typeof updateWaypointSchema>;

// Repeat config type
export type RepeatConfigInput = z.infer<typeof repeatConfigSchema>;
