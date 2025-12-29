-- =====================================================
-- SCRIPT DE APLICACIÓN DE TODAS LAS MIGRACIONES GPX
-- Ejecutar en Supabase Dashboard → SQL Editor
-- =====================================================

-- NOTA: Ejecuta este script completo de una sola vez
-- Si ya tienes algunas tablas creadas, comenta las secciones correspondientes

-- =====================================================
-- MIGRATION 1: GPX PLANS TABLE
-- =====================================================

-- Planes nutricionales basados en GPX
CREATE TABLE IF NOT EXISTS gpx_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nutritionist_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Metadata
  name TEXT NOT NULL,
  description TEXT,

  -- Archivo GPX (puede estar vacío hasta que se suba el archivo)
  gpx_file_path TEXT, -- Path en Supabase Storage

  -- Estadísticas de la ruta (calculadas al upload)
  total_distance_km DECIMAL(10, 2),
  total_elevation_gain_m INT,
  total_elevation_loss_m INT,
  estimated_duration_minutes INT,

  -- Metadata del evento
  event_date DATE,
  event_name TEXT, -- "Maratón Barcelona 2024"
  sport_type TEXT CHECK (sport_type IN ('running', 'cycling', 'triathlon', 'hiking', 'other')) DEFAULT 'running',

  -- Versioning (como meal_plans)
  current_version INT DEFAULT 1,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS set_gpx_plans_updated_at ON gpx_plans;
CREATE TRIGGER set_gpx_plans_updated_at
  BEFORE UPDATE ON gpx_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Índices
CREATE INDEX IF NOT EXISTS idx_gpx_plans_user_id ON gpx_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_gpx_plans_nutritionist_id ON gpx_plans(nutritionist_id);
CREATE INDEX IF NOT EXISTS idx_gpx_plans_event_date ON gpx_plans(event_date);

-- RLS
ALTER TABLE gpx_plans ENABLE ROW LEVEL SECURITY;

-- Usuarios pueden ver sus propios planes
DROP POLICY IF EXISTS "Users can view their own GPX plans" ON gpx_plans;
CREATE POLICY "Users can view their own GPX plans"
  ON gpx_plans FOR SELECT
  USING (auth.uid() = user_id);

-- Nutricionistas pueden ver planes de pacientes conectados
DROP POLICY IF EXISTS "Nutritionists can view connected patients GPX plans" ON gpx_plans;
CREATE POLICY "Nutritionists can view connected patients GPX plans"
  ON gpx_plans FOR SELECT
  USING (
    auth.uid() = nutritionist_id
    OR EXISTS (
      SELECT 1 FROM patient_nutritionist_connections
      WHERE patient_id = gpx_plans.user_id
      AND nutritionist_id = auth.uid()
    )
  );

-- Usuarios pueden crear sus propios planes
DROP POLICY IF EXISTS "Users can create their own GPX plans" ON gpx_plans;
CREATE POLICY "Users can create their own GPX plans"
  ON gpx_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuarios pueden actualizar sus propios planes
DROP POLICY IF EXISTS "Users can update their own GPX plans" ON gpx_plans;
CREATE POLICY "Users can update their own GPX plans"
  ON gpx_plans FOR UPDATE
  USING (auth.uid() = user_id);

-- Nutricionistas pueden actualizar planes de pacientes conectados
DROP POLICY IF EXISTS "Nutritionists can update connected patients GPX plans" ON gpx_plans;
CREATE POLICY "Nutritionists can update connected patients GPX plans"
  ON gpx_plans FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM patient_nutritionist_connections
      WHERE patient_id = gpx_plans.user_id
      AND nutritionist_id = auth.uid()
    )
  );

-- Usuarios pueden eliminar sus propios planes
DROP POLICY IF EXISTS "Users can delete their own GPX plans" ON gpx_plans;
CREATE POLICY "Users can delete their own GPX plans"
  ON gpx_plans FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- MIGRATION 2: GPX NUTRITION WAYPOINTS TABLE
-- =====================================================

-- Waypoints nutricionales en rutas GPX
CREATE TABLE IF NOT EXISTS gpx_nutrition_waypoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gpx_plan_id UUID REFERENCES gpx_plans(id) ON DELETE CASCADE NOT NULL,

  -- Ubicación (del track GPX)
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  elevation_m DECIMAL(8, 2),
  distance_from_start_km DECIMAL(10, 2), -- Calculado al crear

  -- Triggers (AMBOS pueden estar definidos)
  trigger_distance_km DECIMAL(10, 2), -- "En el km 25"
  trigger_time_min INT,                -- "A los 120 minutos"

  -- Tipo de nutrición
  nutrition_type TEXT CHECK (nutrition_type IN (
    'hydration',      -- Agua
    'isotonic_drink', -- Bebida isotónica
    'energy_gel',     -- Gel energético
    'solid_food',     -- Barrita, plátano, bocadillo
    'salt_caps',      -- Cápsulas de sal
    'caffeine',       -- Gel/pastilla con cafeína
    'custom'          -- Personalizado
  )) NOT NULL,

  -- Producto específico
  product_name TEXT, -- "Gel SIS Isotónico", "Aquarius", etc.

  -- Macronutrientes
  calories INT,
  carbs DECIMAL(6, 2),
  protein DECIMAL(6, 2),
  fat DECIMAL(6, 2),
  sodium_mg INT,
  caffeine_mg INT,

  -- Cantidad
  quantity DECIMAL(10, 2),     -- 100, 1, 500
  quantity_unit TEXT,          -- "ml", "g", "units"

  -- Notas adicionales
  notes TEXT,

  -- Para visualización en dispositivos GPS
  icon_symbol TEXT DEFAULT 'Food', -- Food, Water, Flag, etc.

  -- Orden de aparición (para sorting)
  sort_order INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger updated_at
DROP TRIGGER IF EXISTS set_gpx_waypoints_updated_at ON gpx_nutrition_waypoints;
CREATE TRIGGER set_gpx_waypoints_updated_at
  BEFORE UPDATE ON gpx_nutrition_waypoints
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Índices
CREATE INDEX IF NOT EXISTS idx_gpx_waypoints_plan_id ON gpx_nutrition_waypoints(gpx_plan_id);
CREATE INDEX IF NOT EXISTS idx_gpx_waypoints_distance ON gpx_nutrition_waypoints(distance_from_start_km);

-- RLS
ALTER TABLE gpx_nutrition_waypoints ENABLE ROW LEVEL SECURITY;

-- Usuarios pueden ver waypoints de sus planes
DROP POLICY IF EXISTS "Users can view waypoints from their GPX plans" ON gpx_nutrition_waypoints;
CREATE POLICY "Users can view waypoints from their GPX plans"
  ON gpx_nutrition_waypoints FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM gpx_plans
      WHERE gpx_plans.id = gpx_nutrition_waypoints.gpx_plan_id
      AND (gpx_plans.user_id = auth.uid() OR gpx_plans.nutritionist_id = auth.uid())
    )
  );

-- Usuarios pueden crear waypoints en sus planes
DROP POLICY IF EXISTS "Users can create waypoints in their GPX plans" ON gpx_nutrition_waypoints;
CREATE POLICY "Users can create waypoints in their GPX plans"
  ON gpx_nutrition_waypoints FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM gpx_plans
      WHERE gpx_plans.id = gpx_nutrition_waypoints.gpx_plan_id
      AND gpx_plans.user_id = auth.uid()
    )
  );

-- Nutricionistas pueden crear waypoints en planes de pacientes conectados
DROP POLICY IF EXISTS "Nutritionists can create waypoints in connected patients plans" ON gpx_nutrition_waypoints;
CREATE POLICY "Nutritionists can create waypoints in connected patients plans"
  ON gpx_nutrition_waypoints FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM gpx_plans gp
      JOIN patient_nutritionist_connections pnc ON pnc.patient_id = gp.user_id
      WHERE gp.id = gpx_nutrition_waypoints.gpx_plan_id
      AND pnc.nutritionist_id = auth.uid()
    )
  );

-- Usuarios pueden actualizar/eliminar waypoints de sus planes
DROP POLICY IF EXISTS "Users can update waypoints from their GPX plans" ON gpx_nutrition_waypoints;
CREATE POLICY "Users can update waypoints from their GPX plans"
  ON gpx_nutrition_waypoints FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM gpx_plans
      WHERE gpx_plans.id = gpx_nutrition_waypoints.gpx_plan_id
      AND gpx_plans.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete waypoints from their GPX plans" ON gpx_nutrition_waypoints;
CREATE POLICY "Users can delete waypoints from their GPX plans"
  ON gpx_nutrition_waypoints FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM gpx_plans
      WHERE gpx_plans.id = gpx_nutrition_waypoints.gpx_plan_id
      AND gpx_plans.user_id = auth.uid()
    )
  );

-- Nutricionistas pueden actualizar/eliminar en planes conectados
DROP POLICY IF EXISTS "Nutritionists can update waypoints in connected patients plans" ON gpx_nutrition_waypoints;
CREATE POLICY "Nutritionists can update waypoints in connected patients plans"
  ON gpx_nutrition_waypoints FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM gpx_plans gp
      JOIN patient_nutritionist_connections pnc ON pnc.patient_id = gp.user_id
      WHERE gp.id = gpx_nutrition_waypoints.gpx_plan_id
      AND pnc.nutritionist_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Nutritionists can delete waypoints in connected patients plans" ON gpx_nutrition_waypoints;
CREATE POLICY "Nutritionists can delete waypoints in connected patients plans"
  ON gpx_nutrition_waypoints FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM gpx_plans gp
      JOIN patient_nutritionist_connections pnc ON pnc.patient_id = gp.user_id
      WHERE gp.id = gpx_nutrition_waypoints.gpx_plan_id
      AND pnc.nutritionist_id = auth.uid()
    )
  );

-- =====================================================
-- MIGRATION 3: GPX PLAN VERSIONING & COMMENTS
-- =====================================================

-- Tabla de versiones (como meal_plan_versions)
CREATE TABLE IF NOT EXISTS gpx_plan_versions (
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
CREATE INDEX IF NOT EXISTS idx_gpx_versions_plan_id ON gpx_plan_versions(gpx_plan_id);
CREATE INDEX IF NOT EXISTS idx_gpx_versions_number ON gpx_plan_versions(gpx_plan_id, version_number);

-- RLS
ALTER TABLE gpx_plan_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view versions of their GPX plans" ON gpx_plan_versions;
CREATE POLICY "Users can view versions of their GPX plans"
  ON gpx_plan_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM gpx_plans
      WHERE gpx_plans.id = gpx_plan_versions.gpx_plan_id
      AND (gpx_plans.user_id = auth.uid() OR gpx_plans.nutritionist_id = auth.uid())
    )
  );

-- Agregar gpx_plan_id a nutritionist_comments (si no existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nutritionist_comments'
    AND column_name = 'gpx_plan_id'
  ) THEN
    ALTER TABLE nutritionist_comments
      ADD COLUMN gpx_plan_id UUID REFERENCES gpx_plans(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Actualizar constraint para permitir gpx_plan_id
ALTER TABLE nutritionist_comments DROP CONSTRAINT IF EXISTS nutritionist_comments_entry_or_session;
ALTER TABLE nutritionist_comments DROP CONSTRAINT IF EXISTS nutritionist_comments_single_resource;

ALTER TABLE nutritionist_comments
  ADD CONSTRAINT nutritionist_comments_single_resource
  CHECK (
    (entry_id IS NOT NULL AND training_session_id IS NULL AND gpx_plan_id IS NULL)
    OR (entry_id IS NULL AND training_session_id IS NOT NULL AND gpx_plan_id IS NULL)
    OR (entry_id IS NULL AND training_session_id IS NULL AND gpx_plan_id IS NOT NULL)
  );

-- Índice
CREATE INDEX IF NOT EXISTS idx_nutritionist_comments_gpx_plan ON nutritionist_comments(gpx_plan_id);

-- RLS policies para comments en GPX
DROP POLICY IF EXISTS "Users can view comments on their GPX plans" ON nutritionist_comments;
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

DROP POLICY IF EXISTS "Nutritionists can create comments on connected patients GPX plans" ON nutritionist_comments;
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

-- =====================================================
-- MIGRATION 4: STORAGE BUCKET & POLICIES
-- =====================================================

-- Crear bucket para archivos GPX
INSERT INTO storage.buckets (id, name, public)
VALUES ('gpx-files', 'gpx-files', false)
ON CONFLICT (id) DO NOTHING;

-- Policies para storage
DROP POLICY IF EXISTS "Users can upload their own GPX files" ON storage.objects;
CREATE POLICY "Users can upload their own GPX files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'gpx-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can view their own GPX files" ON storage.objects;
CREATE POLICY "Users can view their own GPX files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'gpx-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Nutritionists can view connected patients GPX files" ON storage.objects;
CREATE POLICY "Nutritionists can view connected patients GPX files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'gpx-files'
    AND EXISTS (
      SELECT 1 FROM patient_nutritionist_connections
      WHERE patient_id::text = (storage.foldername(name))[1]
      AND nutritionist_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete their own GPX files" ON storage.objects;
CREATE POLICY "Users can delete their own GPX files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'gpx-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

-- Verificar que todas las tablas se crearon correctamente
SELECT
  'gpx_plans' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'gpx_plans'

UNION ALL

SELECT
  'gpx_nutrition_waypoints' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'gpx_nutrition_waypoints'

UNION ALL

SELECT
  'gpx_plan_versions' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'gpx_plan_versions';

-- Verificar RLS está habilitado
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename LIKE 'gpx%'
ORDER BY tablename;

-- Verificar storage bucket
SELECT id, name, public
FROM storage.buckets
WHERE id = 'gpx-files';

-- =====================================================
-- SCRIPT COMPLETADO
-- Si no hay errores, las migraciones se aplicaron correctamente
-- =====================================================
