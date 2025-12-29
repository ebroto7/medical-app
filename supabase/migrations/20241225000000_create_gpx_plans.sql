-- =====================================================
-- GPX PLANS TABLE
-- Planes nutricionales basados en archivos GPX
-- =====================================================

-- Planes nutricionales basados en GPX
CREATE TABLE gpx_plans (
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
CREATE TRIGGER set_gpx_plans_updated_at
  BEFORE UPDATE ON gpx_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Índices
CREATE INDEX idx_gpx_plans_user_id ON gpx_plans(user_id);
CREATE INDEX idx_gpx_plans_nutritionist_id ON gpx_plans(nutritionist_id);
CREATE INDEX idx_gpx_plans_event_date ON gpx_plans(event_date);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE gpx_plans ENABLE ROW LEVEL SECURITY;

-- Usuarios pueden ver sus propios planes
CREATE POLICY "Users can view their own GPX plans"
  ON gpx_plans FOR SELECT
  USING (auth.uid() = user_id);

-- Nutricionistas pueden ver planes de pacientes conectados
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
CREATE POLICY "Users can create their own GPX plans"
  ON gpx_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuarios pueden actualizar sus propios planes
CREATE POLICY "Users can update their own GPX plans"
  ON gpx_plans FOR UPDATE
  USING (auth.uid() = user_id);

-- Nutricionistas pueden actualizar planes de pacientes conectados
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
CREATE POLICY "Users can delete their own GPX plans"
  ON gpx_plans FOR DELETE
  USING (auth.uid() = user_id);
