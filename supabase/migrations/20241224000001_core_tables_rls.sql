-- =====================================================
-- RLS POLICIES FOR CORE TABLES
-- Migration: 20241224000001
-- Description: Enable Row Level Security on core tables
-- =====================================================

-- PROFILES TABLE
-- =====================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- NUTRITION ENTRIES TABLE
-- =====================================================
ALTER TABLE nutrition_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own entries" ON nutrition_entries;
CREATE POLICY "Users can view their own entries"
ON nutrition_entries FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Nutritionists can view connected patients entries" ON nutrition_entries;
CREATE POLICY "Nutritionists can view connected patients entries"
ON nutrition_entries FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM patient_nutritionist_connections
    WHERE patient_id = nutrition_entries.user_id
    AND nutritionist_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can insert their own entries" ON nutrition_entries;
CREATE POLICY "Users can insert their own entries"
ON nutrition_entries FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own entries" ON nutrition_entries;
CREATE POLICY "Users can update their own entries"
ON nutrition_entries FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own entries" ON nutrition_entries;
CREATE POLICY "Users can delete their own entries"
ON nutrition_entries FOR DELETE
USING (auth.uid() = user_id);

-- NUTRITION IMAGES TABLE
-- =====================================================
ALTER TABLE nutrition_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own images" ON nutrition_images;
CREATE POLICY "Users can view their own images"
ON nutrition_images FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM nutrition_entries
    WHERE nutrition_entries.id = nutrition_images.entry_id
    AND nutrition_entries.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Nutritionists can view connected patients images" ON nutrition_images;
CREATE POLICY "Nutritionists can view connected patients images"
ON nutrition_images FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM nutrition_entries ne
    JOIN patient_nutritionist_connections pnc
    ON pnc.patient_id = ne.user_id
    WHERE ne.id = nutrition_images.entry_id
    AND pnc.nutritionist_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can insert images for their entries" ON nutrition_images;
CREATE POLICY "Users can insert images for their entries"
ON nutrition_images FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM nutrition_entries
    WHERE nutrition_entries.id = nutrition_images.entry_id
    AND nutrition_entries.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete their own images" ON nutrition_images;
CREATE POLICY "Users can delete their own images"
ON nutrition_images FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM nutrition_entries
    WHERE nutrition_entries.id = nutrition_images.entry_id
    AND nutrition_entries.user_id = auth.uid()
  )
);

-- TRAINING SESSIONS TABLE
-- =====================================================
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own sessions" ON training_sessions;
CREATE POLICY "Users can view their own sessions"
ON training_sessions FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Nutritionists can view connected patients sessions" ON training_sessions;
CREATE POLICY "Nutritionists can view connected patients sessions"
ON training_sessions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM patient_nutritionist_connections
    WHERE patient_id = training_sessions.user_id
    AND nutritionist_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can insert their own sessions" ON training_sessions;
CREATE POLICY "Users can insert their own sessions"
ON training_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own sessions" ON training_sessions;
CREATE POLICY "Users can update their own sessions"
ON training_sessions FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own sessions" ON training_sessions;
CREATE POLICY "Users can delete their own sessions"
ON training_sessions FOR DELETE
USING (auth.uid() = user_id);

-- PATIENT NUTRITIONIST CONNECTIONS TABLE
-- =====================================================
ALTER TABLE patient_nutritionist_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their connections" ON patient_nutritionist_connections;
CREATE POLICY "Users can view their connections"
ON patient_nutritionist_connections FOR SELECT
USING (auth.uid() = patient_id OR auth.uid() = nutritionist_id);

DROP POLICY IF EXISTS "Users can delete their connections" ON patient_nutritionist_connections;
CREATE POLICY "Users can delete their connections"
ON patient_nutritionist_connections FOR DELETE
USING (auth.uid() = patient_id OR auth.uid() = nutritionist_id);

-- NUTRITIONIST REQUESTS TABLE
-- =====================================================
ALTER TABLE nutritionist_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view requests involving them" ON nutritionist_requests;
CREATE POLICY "Users can view requests involving them"
ON nutritionist_requests FOR SELECT
USING (auth.uid() = patient_id OR auth.uid() = nutritionist_id);

DROP POLICY IF EXISTS "Nutritionists can create requests" ON nutritionist_requests;
CREATE POLICY "Nutritionists can create requests"
ON nutritionist_requests FOR INSERT
WITH CHECK (auth.uid() = nutritionist_id);

DROP POLICY IF EXISTS "Patients can update requests sent to them" ON nutritionist_requests;
CREATE POLICY "Patients can update requests sent to them"
ON nutritionist_requests FOR UPDATE
USING (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Users can delete their requests" ON nutritionist_requests;
CREATE POLICY "Users can delete their requests"
ON nutritionist_requests FOR DELETE
USING (auth.uid() = patient_id OR auth.uid() = nutritionist_id);

-- NUTRITIONIST COMMENTS TABLE
-- =====================================================
ALTER TABLE nutritionist_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view comments on their content" ON nutritionist_comments;
CREATE POLICY "Users can view comments on their content"
ON nutritionist_comments FOR SELECT
USING (
  (entry_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM nutrition_entries WHERE id = nutritionist_comments.entry_id AND user_id = auth.uid()
  ))
  OR
  (session_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM training_sessions WHERE id = nutritionist_comments.session_id AND user_id = auth.uid()
  ))
  OR auth.uid() = nutritionist_id
);

DROP POLICY IF EXISTS "Nutritionists can create comments on connected patients" ON nutritionist_comments;
CREATE POLICY "Nutritionists can create comments on connected patients"
ON nutritionist_comments FOR INSERT
WITH CHECK (
  (entry_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM nutrition_entries ne
    JOIN patient_nutritionist_connections pnc ON pnc.patient_id = ne.user_id
    WHERE ne.id = nutritionist_comments.entry_id
    AND pnc.nutritionist_id = auth.uid()
  ))
  OR
  (session_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM training_sessions ts
    JOIN patient_nutritionist_connections pnc ON pnc.patient_id = ts.user_id
    WHERE ts.id = nutritionist_comments.session_id
    AND pnc.nutritionist_id = auth.uid()
  ))
);

-- MEAL PLANS TABLE
-- =====================================================
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Nutritionists can view their own plans" ON meal_plans;
CREATE POLICY "Nutritionists can view their own plans"
ON meal_plans FOR SELECT
USING (auth.uid() = nutritionist_id);

DROP POLICY IF EXISTS "Patients can view plans assigned to them" ON meal_plans;
CREATE POLICY "Patients can view plans assigned to them"
ON meal_plans FOR SELECT
USING (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Nutritionists can create plans for connected patients" ON meal_plans;
CREATE POLICY "Nutritionists can create plans for connected patients"
ON meal_plans FOR INSERT
WITH CHECK (
  auth.uid() = nutritionist_id
  AND EXISTS (
    SELECT 1 FROM patient_nutritionist_connections
    WHERE patient_id = meal_plans.patient_id
    AND nutritionist_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Nutritionists can update their own plans" ON meal_plans;
CREATE POLICY "Nutritionists can update their own plans"
ON meal_plans FOR UPDATE
USING (auth.uid() = nutritionist_id);

DROP POLICY IF EXISTS "Nutritionists can delete their own plans" ON meal_plans;
CREATE POLICY "Nutritionists can delete their own plans"
ON meal_plans FOR DELETE
USING (auth.uid() = nutritionist_id);

-- NOTIFICATIONS TABLE
-- =====================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can create notifications" ON notifications;
CREATE POLICY "System can create notifications"
ON notifications FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
CREATE POLICY "Users can delete their own notifications"
ON notifications FOR DELETE
USING (auth.uid() = user_id);

-- SAVED MEALS TABLE
-- =====================================================
ALTER TABLE saved_meals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own saved meals" ON saved_meals;
CREATE POLICY "Users can view their own saved meals"
ON saved_meals FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own saved meals" ON saved_meals;
CREATE POLICY "Users can insert their own saved meals"
ON saved_meals FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own saved meals" ON saved_meals;
CREATE POLICY "Users can update their own saved meals"
ON saved_meals FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own saved meals" ON saved_meals;
CREATE POLICY "Users can delete their own saved meals"
ON saved_meals FOR DELETE
USING (auth.uid() = user_id);
