-- =====================================================
-- GPX PLAN VERSIONING & COMMENTS INTEGRATION
-- =====================================================

-- Tabla de versiones (como meal_plan_versions)
CREATE TABLE gpx_plan_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gpx_plan_id UUID REFERENCES gpx_plans(id) ON DELETE CASCADE NOT NULL,
  version_number INT NOT NULL,
  name TEXT,
  description TEXT,
  snapshot JSONB NOT NULL, -- Contiene waypoints + metadata
  change_notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_gpx_versions_plan_id ON gpx_plan_versions(gpx_plan_id);
CREATE INDEX idx_gpx_versions_number ON gpx_plan_versions(gpx_plan_id, version_number);

-- =====================================================
-- RLS POLICIES FOR VERSIONS
-- =====================================================

ALTER TABLE gpx_plan_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view versions of their GPX plans"
  ON gpx_plan_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM gpx_plans
      WHERE gpx_plans.id = gpx_plan_versions.gpx_plan_id
      AND (gpx_plans.user_id = auth.uid() OR gpx_plans.nutritionist_id = auth.uid())
    )
  );

-- =====================================================
-- EXTEND NUTRITIONIST_COMMENTS TO SUPPORT GPX PLANS
-- =====================================================

-- Agregar gpx_plan_id a nutritionist_comments
ALTER TABLE nutritionist_comments
  ADD COLUMN gpx_plan_id UUID REFERENCES gpx_plans(id) ON DELETE CASCADE;

-- Actualizar constraint para permitir gpx_plan_id
ALTER TABLE nutritionist_comments DROP CONSTRAINT IF EXISTS nutritionist_comments_entry_or_session;

ALTER TABLE nutritionist_comments
  ADD CONSTRAINT nutritionist_comments_single_resource
  CHECK (
    (entry_id IS NOT NULL AND training_session_id IS NULL AND gpx_plan_id IS NULL)
    OR (entry_id IS NULL AND training_session_id IS NOT NULL AND gpx_plan_id IS NULL)
    OR (entry_id IS NULL AND training_session_id IS NULL AND gpx_plan_id IS NOT NULL)
  );

-- Índice
CREATE INDEX idx_nutritionist_comments_gpx_plan ON nutritionist_comments(gpx_plan_id);

-- =====================================================
-- RLS POLICIES FOR COMMENTS ON GPX PLANS
-- =====================================================

-- RLS policy para gpx_plan_id
CREATE POLICY "Users can view comments on their GPX plans"
  ON nutritionist_comments FOR SELECT
  USING (
    gpx_plan_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM gpx_plans
      WHERE gpx_plans.id = nutritionist_comments.gpx_plan_id
      AND (gpx_plans.user_id = auth.uid() OR gpx_plans.nutritionist_id = auth.uid())
    )
  );

CREATE POLICY "Nutritionists can create comments on connected patients GPX plans"
  ON nutritionist_comments FOR INSERT
  WITH CHECK (
    gpx_plan_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM gpx_plans gp
      JOIN patient_nutritionist_connections pnc ON pnc.patient_id = gp.user_id
      WHERE gp.id = nutritionist_comments.gpx_plan_id
      AND pnc.nutritionist_id = auth.uid()
    )
  );
