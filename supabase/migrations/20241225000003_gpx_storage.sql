-- =====================================================
-- GPX FILES STORAGE BUCKET & POLICIES
-- =====================================================

-- Crear bucket para archivos GPX
INSERT INTO storage.buckets (id, name, public)
VALUES ('gpx-files', 'gpx-files', false)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STORAGE POLICIES
-- =====================================================

-- Policies para storage
CREATE POLICY "Users can upload their own GPX files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'gpx-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view their own GPX files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'gpx-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

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

CREATE POLICY "Users can delete their own GPX files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'gpx-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
