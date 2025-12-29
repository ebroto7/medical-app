-- =====================================================
-- GPX NUTRITION WAYPOINTS TABLE
-- Waypoints nutricionales en rutas GPX
-- =====================================================

-- Waypoints nutricionales en rutas GPX
CREATE TABLE gpx_nutrition_waypoints (
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
CREATE TRIGGER set_gpx_waypoints_updated_at
  BEFORE UPDATE ON gpx_nutrition_waypoints
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Índices
CREATE INDEX idx_gpx_waypoints_plan_id ON gpx_nutrition_waypoints(gpx_plan_id);
CREATE INDEX idx_gpx_waypoints_distance ON gpx_nutrition_waypoints(distance_from_start_km);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE gpx_nutrition_waypoints ENABLE ROW LEVEL SECURITY;

-- Usuarios pueden ver waypoints de sus planes
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
CREATE POLICY "Users can update waypoints from their GPX plans"
  ON gpx_nutrition_waypoints FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM gpx_plans
      WHERE gpx_plans.id = gpx_nutrition_waypoints.gpx_plan_id
      AND gpx_plans.user_id = auth.uid()
    )
  );

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
