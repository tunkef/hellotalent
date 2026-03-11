-- Migration 003: Add CV storage columns to candidates table
-- Run this in Supabase SQL Editor

-- Add CV columns to candidates
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS cv_url text;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS cv_filename text;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS cv_uploaded_at timestamptz;

-- Create storage bucket for CV uploads (if not exists)
-- Note: This must be run via Supabase Dashboard > Storage > New Bucket
-- Bucket name: cv-uploads
-- Public: true (or configure RLS policies)
-- File size limit: 5MB
-- Allowed MIME types: application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document

-- Storage RLS policy: users can only upload to their own folder
-- In Dashboard > Storage > cv-uploads > Policies, add:
--
-- INSERT policy (upload):
--   Name: "Users can upload their own CV"
--   Target roles: authenticated
--   WITH CHECK: (bucket_id = 'cv-uploads' AND (storage.foldername(name))[1] = 'cv-uploads' AND (storage.foldername(name))[2] = auth.uid()::text)
--
-- SELECT policy (read):
--   Name: "Users can read their own CV"
--   Target roles: authenticated
--   USING: (bucket_id = 'cv-uploads' AND (storage.foldername(name))[2] = auth.uid()::text)
--
-- DELETE policy (delete):
--   Name: "Users can delete their own CV"
--   Target roles: authenticated
--   USING: (bucket_id = 'cv-uploads' AND (storage.foldername(name))[2] = auth.uid()::text)

-- Update save_candidate_profile RPC to include cv_url in allowed updates
-- (Not strictly needed — cv_url is updated separately via direct update, not through the RPC)
