/**
 * Waypoint Type Definitions
 *
 * Supports three distinct waypoint types for GPX nutrition planning:
 * 1. Spatial Waypoint - Distance-based with geographic coordinates
 * 2. Temporal Single Waypoint - Time-based without coordinates
 * 3. Temporal Loop Waypoint - Repeating pattern with custom color
 */

// Repeat configuration for temporal loop waypoints
export interface RepeatConfig {
  start_time_min: number;    // Starting time in minutes (e.g., 60 = start at 1 hour)
  interval_min: number;       // Interval between repetitions in minutes (e.g., 30 = every 30 min)
  repetitions: number;        // Number of repetitions (e.g., 5 = repeat 5 times)
}

// Base interface with common waypoint fields
interface WaypointBase {
  id: string;
  plan_id: string;
  name: string;  // Waypoint name (free-form text, 1-200 chars)
  product_name?: string;  // Product/brand name (optional)
  calories?: number;
  carbs?: number;
  protein?: number;
  fat?: number;
  sodium_mg?: number;
  caffeine_mg?: number;
  quantity?: number;
  quantity_unit?: string;
  notes?: string;
  color?: string;
  created_at: string;
  updated_at?: string;
}

/**
 * Spatial Waypoint (Distance-Based)
 *
 * Waypoints tied to geographic coordinates and distance from route start.
 * Used for location-specific nutrition (e.g., "Energy gel at km 15").
 *
 * Visualization:
 * - Map: Marker at coordinates
 * - Elevation chart: Vertical line at distance
 * - Mini chart: Vertical line at distance
 * - Table: Shows "KM X.X"
 */
export interface SpatialWaypoint extends WaypointBase {
  type: 'spatial';
  latitude: number;                      // Geographic latitude (-90 to 90)
  longitude: number;                     // Geographic longitude (-180 to 180)
  elevation_m?: number;                  // Elevation in meters
  distance_from_start_km: number;        // Distance from route start in km
  trigger_distance_km?: number;          // Legacy field (same as distance_from_start_km)
  trigger_time_min: null;                // Must be null for spatial waypoints
  is_repeating: false;                   // Spatial waypoints cannot repeat
  repeat_config: null;                   // Must be null for spatial waypoints
}

/**
 * Temporal Waypoint Single (Time-Based)
 *
 * Waypoints triggered at specific elapsed time, independent of location.
 * Used for time-based nutrition (e.g., "Energy gel at 60 minutes").
 *
 * Visualization:
 * - Map: NOT shown (no coordinates)
 * - Elevation chart: NOT shown (distance-based)
 * - Timeline: Marker at T+X min
 * - Table: Shows "T+X min"
 */
export interface TemporalWaypointSingle extends WaypointBase {
  type: 'temporal';
  latitude: null;                        // Must be null for temporal waypoints
  longitude: null;                       // Must be null for temporal waypoints
  elevation_m: null;                     // Must be null for temporal waypoints
  distance_from_start_km: null;          // Must be null for temporal waypoints
  trigger_distance_km?: null;            // Must be null for temporal waypoints (optional for backwards compat)
  trigger_time_min: number;              // Time trigger in minutes (0-1440)
  is_repeating: false;                   // Single waypoints do not repeat
  repeat_config: null;                   // Must be null for single waypoints
}

/**
 * Temporal Waypoint Loop (Repeating Pattern)
 *
 * Waypoints that repeat at regular intervals.
 * Used for recurring nutrition (e.g., "Hydration every 20 min starting at min 20").
 *
 * Visualization:
 * - Map: NOT shown (no coordinates)
 * - Elevation chart: NOT shown (distance-based)
 * - Timeline: Multiple markers with same color (expanded from repeat_config)
 * - Table: Expandable row or multiple rows showing pattern
 */
export interface TemporalWaypointLoop extends WaypointBase {
  type: 'temporal';
  latitude: null;                        // Must be null for temporal waypoints
  longitude: null;                       // Must be null for temporal waypoints
  elevation_m: null;                     // Must be null for temporal waypoints
  distance_from_start_km: null;          // Must be null for temporal waypoints
  trigger_distance_km?: null;            // Must be null for temporal waypoints (optional for backwards compat)
  trigger_time_min: null;                // Must be null for loop waypoints (uses repeat_config)
  is_repeating: true;                    // Must be true for loop waypoints
  repeat_config: RepeatConfig;           // REQUIRED: Loop configuration
  color: string;                         // REQUIRED: Hex color for visual distinction (e.g., #3b82f6)
}

/**
 * Union type for all waypoint types
 *
 * Use discriminated union pattern based on 'type' field for type-safe handling.
 */
export type Waypoint = SpatialWaypoint | TemporalWaypointSingle | TemporalWaypointLoop;

/**
 * Type guard: Check if waypoint is spatial (distance-based)
 *
 * @param w - Waypoint to check
 * @returns true if waypoint is spatial
 *
 * @example
 * if (isSpatialWaypoint(waypoint)) {
 *   console.log(`Waypoint at ${waypoint.latitude}, ${waypoint.longitude}`);
 * }
 */
export const isSpatialWaypoint = (w: Waypoint): w is SpatialWaypoint => {
  return w.type === 'spatial';
};

/**
 * Type guard: Check if waypoint is temporal (time-based)
 *
 * @param w - Waypoint to check
 * @returns true if waypoint is temporal (single or loop)
 *
 * @example
 * if (isTemporalWaypoint(waypoint)) {
 *   // Show on timeline, not on map
 * }
 */
export const isTemporalWaypoint = (w: Waypoint): w is TemporalWaypointSingle | TemporalWaypointLoop => {
  return w.type === 'temporal';
};

/**
 * Type guard: Check if waypoint is a repeating loop
 *
 * @param w - Waypoint to check
 * @returns true if waypoint is a temporal loop
 *
 * @example
 * if (isRepeatingWaypoint(waypoint)) {
 *   const expanded = expandTemporalLoop(waypoint);
 * }
 */
export const isRepeatingWaypoint = (w: Waypoint): w is TemporalWaypointLoop => {
  return w.is_repeating === true;
};

/**
 * Expanded waypoint marker for timeline visualization
 *
 * Represents a single occurrence from a temporal loop expansion.
 */
export interface ExpandedWaypointMarker extends TemporalWaypointLoop {
  time: number;  // Calculated time for this occurrence (in minutes)
}

/**
 * Expand a temporal loop waypoint into individual time markers
 *
 * Generates an array of waypoint occurrences based on repeat configuration.
 * Each marker contains the calculated time and all original waypoint data.
 *
 * @param loop - Temporal loop waypoint to expand
 * @returns Array of expanded waypoint markers
 *
 * @example
 * const loop = {
 *   repeat_config: { start_time_min: 60, interval_min: 30, repetitions: 5 },
 *   product_name: "Maurten Gel",
 *   color: "#3b82f6",
 *   // ... other fields
 * };
 *
 * expandTemporalLoop(loop);
 * // Returns 5 markers at times: 60, 90, 120, 150, 180 minutes
 */
export const expandTemporalLoop = (loop: TemporalWaypointLoop): ExpandedWaypointMarker[] => {
  const { start_time_min, interval_min, repetitions } = loop.repeat_config;

  return Array.from({ length: repetitions }, (_, i) => ({
    ...loop,
    time: start_time_min + (i * interval_min),
  }));
};

/**
 * Get display label for waypoint trigger
 *
 * @param waypoint - Waypoint to get label for
 * @returns Human-readable trigger label
 *
 * @example
 * getWaypointTriggerLabel(spatialWaypoint)  // "KM 15.5"
 * getWaypointTriggerLabel(temporalWaypoint) // "T+60 min"
 * getWaypointTriggerLabel(loopWaypoint)     // "Loop: 60min, every 30min, 5x"
 */
export const getWaypointTriggerLabel = (waypoint: Waypoint): string => {
  if (isSpatialWaypoint(waypoint)) {
    return `KM ${waypoint.distance_from_start_km.toFixed(1)}`;
  }

  if (isRepeatingWaypoint(waypoint)) {
    const { start_time_min, interval_min, repetitions } = waypoint.repeat_config;
    return `Loop: ${start_time_min}min, every ${interval_min}min, ${repetitions}x`;
  }

  // Temporal single
  return `T+${waypoint.trigger_time_min} min`;
};

/**
 * Get display name for waypoint
 *
 * @param waypoint - Waypoint to get name for
 * @returns Waypoint name or product name
 *
 * @example
 * getWaypointProductName(waypoint) // "Gel energético" or "Maurten Gel"
 */
export const getWaypointProductName = (waypoint: Waypoint): string => {
  // Return waypoint name as primary, or product_name as fallback
  return waypoint.name || waypoint.product_name || 'Waypoint';
};
