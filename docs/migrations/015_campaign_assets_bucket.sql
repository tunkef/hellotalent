-- ═══════════════════════════════════════════════════════════
-- Migration 015: Campaign Assets Storage Bucket
-- Creates the 'campaign-assets' Supabase Storage bucket
-- for campaign cover images and related media.
-- ═══════════════════════════════════════════════════════════

-- Create public bucket for campaign assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'campaign-assets',
  'campaign-assets',
  true,
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- Storage RLS Policies
-- ═══════════════════════════════════════════════════════════

-- Allow authenticated employers to upload to their company folder
CREATE POLICY "campaign_assets_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'campaign-assets'
  AND (storage.foldername(name))[1] = (
    SELECT company_id::text FROM hr_profiles WHERE id = auth.uid()
  )
);

-- Allow authenticated employers to update/replace their company's files
CREATE POLICY "campaign_assets_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'campaign-assets'
  AND (storage.foldername(name))[1] = (
    SELECT company_id::text FROM hr_profiles WHERE id = auth.uid()
  )
);

-- Allow authenticated employers to delete their company's files
CREATE POLICY "campaign_assets_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'campaign-assets'
  AND (storage.foldername(name))[1] = (
    SELECT company_id::text FROM hr_profiles WHERE id = auth.uid()
  )
);

-- Allow public read access (bucket is public)
CREATE POLICY "campaign_assets_public_read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'campaign-assets');

-- ═══════════════════════════════════════════════════════════
-- Verification
-- ═══════════════════════════════════════════════════════════
-- SELECT * FROM storage.buckets WHERE id = 'campaign-assets';
-- SELECT policyname FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE 'campaign_assets%';
