-- Migration: Change nutrition_type from enum to free-form text
-- Date: 2025-12-31
-- Description: Removes the CHECK constraint on nutrition_type to allow free-form waypoint names

-- Drop the old enum constraint
ALTER TABLE gpx_nutrition_waypoints
  DROP CONSTRAINT IF EXISTS gpx_nutrition_waypoints_nutrition_type_check;

-- The column is already TEXT, so no need to change the type
-- Just add a simple length validation (1-200 characters)
ALTER TABLE gpx_nutrition_waypoints
  ADD CONSTRAINT gpx_nutrition_waypoints_nutrition_type_length
  CHECK (LENGTH(nutrition_type) >= 1 AND LENGTH(nutrition_type) <= 200);

-- Add comment explaining the change
COMMENT ON COLUMN gpx_nutrition_waypoints.nutrition_type IS 'Free-form waypoint name (1-200 characters). Previously restricted to enum values.';
