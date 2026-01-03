-- =====================================================
-- RENAME nutrition_type TO name
-- Convert from enum check to free-form string
-- =====================================================

-- 1. Drop the enum check constraint (may have auto-generated name)
DO $$
BEGIN
    -- Try to drop by common naming patterns
    EXECUTE 'ALTER TABLE gpx_nutrition_waypoints DROP CONSTRAINT IF EXISTS gpx_nutrition_waypoints_nutrition_type_check';
    EXECUTE 'ALTER TABLE gpx_nutrition_waypoints DROP CONSTRAINT IF EXISTS gpx_nutrition_waypoints_nutrition_type_check1';

    -- Also try to find and drop by pattern
    PERFORM 1 FROM pg_constraint
    WHERE conrelid = 'gpx_nutrition_waypoints'::regclass
    AND conname LIKE '%nutrition_type%';

    IF FOUND THEN
        RAISE NOTICE 'Found nutrition_type constraints, attempting to drop...';
    END IF;
END $$;

-- 2. Drop ALL check constraints on nutrition_type column
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    FOR constraint_name IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE rel.relname = 'gpx_nutrition_waypoints'
        AND con.contype = 'c'
        AND pg_get_constraintdef(con.oid) LIKE '%nutrition_type%'
    LOOP
        EXECUTE format('ALTER TABLE gpx_nutrition_waypoints DROP CONSTRAINT IF EXISTS %I', constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END LOOP;
END $$;

-- 3. Rename the column
ALTER TABLE gpx_nutrition_waypoints
RENAME COLUMN nutrition_type TO name;

-- 4. Add length validation (1-200 characters)
ALTER TABLE gpx_nutrition_waypoints
ADD CONSTRAINT gpx_nutrition_waypoints_name_length
CHECK (LENGTH(name) >= 1 AND LENGTH(name) <= 200);

-- 5. Create index for name column
CREATE INDEX IF NOT EXISTS idx_gpx_waypoints_name ON gpx_nutrition_waypoints(name);

-- 6. Update comment
COMMENT ON COLUMN gpx_nutrition_waypoints.name IS 'Waypoint name (free-form text, 1-200 chars)';
