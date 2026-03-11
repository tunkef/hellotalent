-- Migration 003: Add CV storage columns to candidates table
-- Run this in Supabase SQL Editor

-- Add CV columns to candidates
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS cv_url text;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS cv_filename text;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS cv_uploaded_at timestamptz;

-- CV files are stored in the existing 'cvs' bucket (same bucket as avatars)
-- Path structure: cv/{user_id}/cv.{ext}
-- Avatar structure: avatars/{user_id}.{ext}
--
-- If the 'cvs' bucket has RLS policies restricting paths to 'avatars/' only,
-- add policies for the 'cv/' prefix:
--
-- INSERT policy (upload):
--   Name: "Users can upload their own CV"
--   Target roles: authenticated
--   WITH CHECK: (bucket_id = 'cvs' AND (storage.foldername(name))[1] = 'cv' AND (storage.foldername(name))[2] = auth.uid()::text)
--
-- SELECT policy (read):
--   Name: "Users can read their own CV"
--   Target roles: authenticated
--   USING: (bucket_id = 'cvs' AND (storage.foldername(name))[1] = 'cv' AND (storage.foldername(name))[2] = auth.uid()::text)
--
-- DELETE policy (delete):
--   Name: "Users can delete their own CV"
--   Target roles: authenticated
--   USING: (bucket_id = 'cvs' AND (storage.foldername(name))[1] = 'cv' AND (storage.foldername(name))[2] = auth.uid()::text)

-- Update save_candidate_profile RPC to include cv_url in allowed updates
-- (Not strictly needed — cv_url is updated separately via direct update, not through the RPC)
