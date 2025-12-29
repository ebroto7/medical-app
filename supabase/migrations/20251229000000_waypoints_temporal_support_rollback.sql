-- Rollback Migration: Remove temporal waypoint support
-- Date: 2025-12-29
-- Description: Reverts changes from 20251229000000_waypoints_temporal_support.sql
-- WARNING: This will DELETE all temporal waypoints (type='temporal')

-- Safety check: Warn if temporal waypoints exist
DO $$
DECLARE
  temporal_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO temporal_count
  FROM gpx_nutrition_waypoints
  WHERE type = 'temporal';

  IF temporal_count > 0 THEN
    RAISE WARNING 'Found % temporal waypoints. These will be LOST after rollback!', temporal_count;
  END IF;
END $$;

-- Drop indexes
DROP INDEX IF EXISTS idx_waypoints_type;
DROP INDEX IF EXISTS idx_waypoints_repeating;

-- Drop constraints
ALTER TABLE gpx_nutrition_waypoints
  DROP CONSTRAINT IF EXISTS waypoint_spatial_coords_required,
  DROP CONSTRAINT IF EXISTS waypoint_temporal_no_coords,
  DROP CONSTRAINT IF EXISTS waypoint_repeat_config_required,
  DROP CONSTRAINT IF EXISTS waypoint_repeat_color_required,
  DROP CONSTRAINT IF EXISTS waypoint_repeating_only_temporal;

-- Drop columns
ALTER TABLE gpx_nutrition_waypoints
  DROP COLUMN IF EXISTS type,
  DROP COLUMN IF EXISTS is_repeating,
  DROP COLUMN IF EXISTS repeat_config,
  DROP COLUMN IF EXISTS color;

-- Note: This rollback does NOT restore temporal waypoints
-- They will be permanently deleted when type column is dropped
