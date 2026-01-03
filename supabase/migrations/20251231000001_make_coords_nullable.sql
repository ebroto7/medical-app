-- Migration: Make coordinate columns nullable for temporal waypoints
-- Date: 2025-12-31
-- Description: Removes NOT NULL constraints from latitude/longitude to allow temporal waypoints (which have no coordinates)

-- Make latitude and longitude nullable
ALTER TABLE gpx_nutrition_waypoints
  ALTER COLUMN latitude DROP NOT NULL,
  ALTER COLUMN longitude DROP NOT NULL;

-- The existing CHECK constraints from 20251229000000_waypoints_temporal_support.sql
-- will ensure spatial waypoints still MUST have coordinates
-- and temporal waypoints CANNOT have coordinates

-- Add comments
COMMENT ON COLUMN gpx_nutrition_waypoints.latitude IS 'Latitude (required for spatial waypoints, NULL for temporal)';
COMMENT ON COLUMN gpx_nutrition_waypoints.longitude IS 'Longitude (required for spatial waypoints, NULL for temporal)';
