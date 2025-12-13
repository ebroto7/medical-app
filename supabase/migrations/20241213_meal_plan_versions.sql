-- Tabla para almacenar versiones históricas de las pautas
-- Cada vez que se edita una pauta, se guarda una snapshot de la versión anterior

CREATE TABLE IF NOT EXISTS meal_plan_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  snapshot JSONB NOT NULL, -- Contiene weekly_slots o situational_plans completos
  change_notes TEXT, -- Opcional: notas sobre qué se cambió
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Índice para búsquedas por meal_plan_id
CREATE INDEX idx_meal_plan_versions_meal_plan_id ON meal_plan_versions(meal_plan_id);

-- Índice para ordenar por versión
CREATE INDEX idx_meal_plan_versions_version ON meal_plan_versions(meal_plan_id, version_number DESC);

-- RLS
ALTER TABLE meal_plan_versions ENABLE ROW LEVEL SECURITY;

-- Policy: El nutricionista dueño de la pauta puede ver y crear versiones
CREATE POLICY "Nutritionist can manage versions of their plans"
  ON meal_plan_versions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM meal_plans mp
      WHERE mp.id = meal_plan_versions.meal_plan_id
      AND mp.nutritionist_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meal_plans mp
      WHERE mp.id = meal_plan_versions.meal_plan_id
      AND mp.nutritionist_id = auth.uid()
    )
  );

-- Policy: El paciente asignado puede ver las versiones
CREATE POLICY "Patient can view versions of their assigned plans"
  ON meal_plan_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meal_plans mp
      WHERE mp.id = meal_plan_versions.meal_plan_id
      AND mp.patient_id = auth.uid()
    )
  );

-- Agregar campo version_number a meal_plans para tracking
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS current_version INTEGER DEFAULT 1;
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_meal_plan_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER meal_plans_updated_at
  BEFORE UPDATE ON meal_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_meal_plan_updated_at();
