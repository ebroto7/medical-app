-- =====================================================
-- STORAGE BUCKET POLICIES
-- Migration: 20241224000002
-- Description: Create and secure nutrition-images storage bucket
-- =====================================================

-- Create bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('nutrition-images', 'nutrition-images', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own nutrition images" ON storage.objects;
DROP POLICY IF EXISTS "Nutritionists can view connected patients images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own nutrition images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own nutrition images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own nutrition images" ON storage.objects;

-- Policy: Users can view their own images
CREATE POLICY "Users can view their own nutrition images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'nutrition-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Nutritionists can view connected patients' images
CREATE POLICY "Nutritionists can view connected patients images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'nutrition-images'
  AND EXISTS (
    SELECT 1 FROM patient_nutritionist_connections
    WHERE patient_id::text = (storage.foldername(name))[1]
    AND nutritionist_id = auth.uid()
  )
);

-- Policy: Users can upload their own images
CREATE POLICY "Users can upload their own nutrition images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'nutrition-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own images metadata
CREATE POLICY "Users can update their own nutrition images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'nutrition-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own images
CREATE POLICY "Users can delete their own nutrition images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'nutrition-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
