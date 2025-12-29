#!/bin/bash

# Script to apply waypoint migration to Supabase
# This script copies the migration SQL to clipboard for manual execution

MIGRATION_FILE="../supabase/migrations/20251229000000_waypoints_temporal_support.sql"

echo "================================================"
echo "Waypoint Migration - Apply to Supabase"
echo "================================================"
echo ""
echo "Migration file: $MIGRATION_FILE"
echo ""
echo "INSTRUCTIONS:"
echo "1. Go to your Supabase Dashboard → SQL Editor"
echo "2. Create a new query"
echo "3. Copy the SQL content from the migration file"
echo "4. Run the query"
echo ""
echo "Alternatively, if you have Supabase CLI linked:"
echo "  cd /Users/enricbrotohernandez/Documents/My\ projects/medical-app"
echo "  supabase db push"
echo ""
echo "================================================"
echo ""

# Show migration content
cat "$MIGRATION_FILE"
