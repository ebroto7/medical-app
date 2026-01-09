-- Add privacy and created_by columns to habits, and comments to habit_logs
-- Migration: 20260104000001_habit_enhancements.sql

-- 1. Update habits table with privacy and authorship
ALTER TABLE habits
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;

-- 2. Add comment to habit_logs
ALTER TABLE habit_logs
ADD COLUMN IF NOT EXISTS comment TEXT;

-- 3. Update RLS for Nutritionists
-- Nutritionists can view/create habits for patients they are connected to,
-- provided the habit is NOT private.

DROP POLICY IF EXISTS "Nutritionists can view non-private habits" ON habits;
CREATE POLICY "Nutritionists can view connected patient habits"
  ON habits FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN patient_nutritionist_connections pnc ON pnc.nutritionist_id = p.id
      WHERE p.id = auth.uid() 
      AND p.role = 'nutritionist'
      AND pnc.patient_id = habits.user_id
    )
    AND is_private = false
  );

DROP POLICY IF EXISTS "Nutritionists can create habits for patients" ON habits;
CREATE POLICY "Nutritionists can create habits for patients"
  ON habits FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN patient_nutritionist_connections pnc ON pnc.nutritionist_id = p.id
      WHERE p.id = auth.uid() 
      AND p.role = 'nutritionist'
      AND pnc.patient_id = habits.user_id
    )
    AND is_private = false
  );

-- Also allow nutritionists to update habits they created
CREATE POLICY "Nutritionists can update habits they created"
  ON habits FOR UPDATE
  USING (
    created_by = auth.uid()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'nutritionist')
  );
