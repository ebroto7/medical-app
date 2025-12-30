-- Migration: Add support for temporal waypoints and repeating patterns
-- Date: 2025-12-29
-- Description: Extends gpx_nutrition_waypoints table to support three waypoint types:
--   1. Spatial waypoints (distance-based, with coordinates)
--   2. Temporal single waypoints (time-based, without coordinates)
--   3. Temporal loop waypoints (repeating patterns with custom colors)

-- Add new columns for temporal waypoint support
ALTER TABLE gpx_nutrition_waypoints
  ADD COLUMN type VARCHAR(20) CHECK (type IN ('spatial', 'temporal')) DEFAULT 'spatial',
  ADD COLUMN is_repeating BOOLEAN DEFAULT false,
  ADD COLUMN repeat_config JSONB,
  ADD COLUMN color VARCHAR(7);

-- Add comment for type column
COMMENT ON COLUMN gpx_nutrition_waypoints.type IS 'Waypoint type: spatial (distance-based with coordinates) or temporal (time-based without coordinates)';

-- Add comment for is_repeating column
COMMENT ON COLUMN gpx_nutrition_waypoints.is_repeating IS 'True if waypoint is a repeating pattern (only for temporal waypoints)';

-- Add comment for repeat_config column
COMMENT ON COLUMN gpx_nutrition_waypoints.repeat_config IS 'JSON config for repeating waypoints: {start_time_min, interval_min, repetitions}';

-- Add comment for color column
COMMENT ON COLUMN gpx_nutrition_waypoints.color IS 'Hex color for waypoint marker (required for repeating waypoints)';

-- Constraint: Spatial waypoints MUST have coordinates
ALTER TABLE gpx_nutrition_waypoints
  ADD CONSTRAINT waypoint_spatial_coords_required
  CHECK (
    (type = 'spatial' AND latitude IS NOT NULL AND longitude IS NOT NULL AND distance_from_start_km IS NOT NULL)
    OR type = 'temporal'
  );

-- Constraint: Temporal waypoints CANNOT have coordinates
ALTER TABLE gpx_nutrition_waypoints
  ADD CONSTRAINT waypoint_temporal_no_coords
  CHECK (
    (type = 'temporal' AND latitude IS NULL AND longitude IS NULL AND distance_from_start_km IS NULL)
    OR type = 'spatial'
  );

-- Constraint: Repeating waypoints MUST have repeat_config
ALTER TABLE gpx_nutrition_waypoints
  ADD CONSTRAINT waypoint_repeat_config_required
  CHECK (
    (is_repeating = true AND repeat_config IS NOT NULL)
    OR is_repeating = false
  );

-- Constraint: Repeating waypoints MUST have color
ALTER TABLE gpx_nutrition_waypoints
  ADD CONSTRAINT waypoint_repeat_color_required
  CHECK (
    (is_repeating = true AND color IS NOT NULL)
    OR is_repeating = false
  );

-- Constraint: Only temporal waypoints can be repeating
ALTER TABLE gpx_nutrition_waypoints
  ADD CONSTRAINT waypoint_repeating_only_temporal
  CHECK (
    (is_repeating = true AND type = 'temporal')
    OR is_repeating = false
  );

-- Index for queries by waypoint type
CREATE INDEX idx_waypoints_type ON gpx_nutrition_waypoints(gpx_plan_id, type);

-- Index for queries filtering repeating waypoints
CREATE INDEX idx_waypoints_repeating ON gpx_nutrition_waypoints(gpx_plan_id, is_repeating)
  WHERE is_repeating = true;

-- Update existing waypoints to type 'spatial' (all current waypoints are distance-based)
UPDATE gpx_nutrition_waypoints
SET type = 'spatial'
WHERE type IS NULL;

-- Add check to ensure existing waypoints have valid data
-- This will fail if any existing waypoint has NULL coordinates
-- (which should not happen as they were required before)
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM gpx_nutrition_waypoints
  WHERE type = 'spatial' AND (latitude IS NULL OR longitude IS NULL OR distance_from_start_km IS NULL);

  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Found % existing waypoints with NULL coordinates. Please fix data before applying migration.', invalid_count;
  END IF;
END $$;

-- Verification query (commented out for production)
-- SELECT
--   type,
--   is_repeating,
--   COUNT(*) as count,
--   COUNT(CASE WHEN latitude IS NOT NULL THEN 1 END) as with_coords,
--   COUNT(CASE WHEN repeat_config IS NOT NULL THEN 1 END) as with_repeat_config,
--   COUNT(CASE WHEN color IS NOT NULL THEN 1 END) as with_color
-- FROM gpx_nutrition_waypoints
-- GROUP BY type, is_repeating;
