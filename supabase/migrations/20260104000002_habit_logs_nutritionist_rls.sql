-- Add RLS policies for habit_logs to allow nutritionist access
-- Migration: 20260104000002_habit_logs_nutritionist_rls.sql

-- 1. Nutritionists can view logs of connected patients (for non-private habits)
DROP POLICY IF EXISTS "Nutritionists can view patient logs" ON habit_logs;
CREATE POLICY "Nutritionists can view patient logs"
  ON habit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM habits h
      JOIN profiles p ON p.id = auth.uid()
      JOIN patient_nutritionist_connections pnc ON pnc.nutritionist_id = p.id
      WHERE h.id = habit_logs.habit_id
      AND p.role = 'nutritionist'
      AND pnc.patient_id = h.user_id
      AND h.is_private = false
    )
  );

-- 2. Nutritionists can insert/update logs to add comments
-- (Constraint: they shouldn't be able to "toggle" completion in a pure SQL way easily, 
-- but we rely on the API logic and we allow them to upsert for comments)
DROP POLICY IF EXISTS "Nutritionists can manage patient log comments" ON habit_logs;
CREATE POLICY "Nutritionists can manage patient log comments"
  ON habit_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM habits h
      JOIN profiles p ON p.id = auth.uid()
      JOIN patient_nutritionist_connections pnc ON pnc.nutritionist_id = p.id
      WHERE h.id = habit_logs.habit_id
      AND p.role = 'nutritionist'
      AND pnc.patient_id = h.user_id
      AND h.is_private = false
    )
  );

DROP POLICY IF EXISTS "Nutritionists can update patient log comments" ON habit_logs;
CREATE POLICY "Nutritionists can update patient log comments"
  ON habit_logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM habits h
      JOIN profiles p ON p.id = auth.uid()
      JOIN patient_nutritionist_connections pnc ON pnc.nutritionist_id = p.id
      WHERE h.id = habit_logs.habit_id
      AND p.role = 'nutritionist'
      AND pnc.patient_id = h.user_id
      AND h.is_private = false
    )
  );
