-- Refine habit permissions: patients cannot edit/delete habits created by nutritionists
-- Migration: 20260104000003_habit_permissions_refinement.sql

-- 1. Update existing habits to have created_by = user_id if null (migration cleanup)
UPDATE habits SET created_by = user_id WHERE created_by IS NULL;

-- 2. Refine UPDATE policy for habits
-- Drop the old overly-permissive policy
DROP POLICY IF EXISTS "Users can update own habits" ON habits;
DROP POLICY IF EXISTS "Nutritionists can update habits they created" ON habits;

-- New combined update policy: you can update if you created it
CREATE POLICY "Users can update habits they created"
  ON habits FOR UPDATE
  USING (auth.uid() = created_by);

-- 3. Refine DELETE policy for habits
DROP POLICY IF EXISTS "Users can delete own habits" ON habits;

-- New combined delete policy: you can delete if you created it
CREATE POLICY "Users can delete habits they created"
  ON habits FOR DELETE
  USING (auth.uid() = created_by);

-- 4. Ensure INSERT always sets created_by correctly via policy (already handled by API, but good for safety)
-- The existing insert policies are:
-- "Users can insert own habits" (auth.uid() = user_id)
-- "Nutritionists can create habits for patients" (complex check)

-- We should ensure is_private cannot be set to true by nutritionist in policy level if we wanted, 
-- but we already handle that in API.
