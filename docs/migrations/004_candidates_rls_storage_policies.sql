-- Migration 004: candidates table RLS + storage bucket policies
-- Run this in Supabase SQL Editor
-- Idempotent: uses IF NOT EXISTS / DROP-IF-EXISTS where possible
--
-- Covers:
--   1. RLS on candidates table (was missing — child tables had it, root did not)
--   2. Storage policies on storage.objects for bucket 'cvs'
--      - CV path:     cv/{auth.uid()}/cv.{ext}
--      - Avatar path: avatars/{auth.uid()}.{ext}
--      Both scoped to current user only.

-- ═══════════════════════════════════════════════════════════
-- PART 1: candidates TABLE RLS
-- ═══════════════════════════════════════════════════════════

-- Enable RLS (safe to re-run if already enabled)
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running this migration
DROP POLICY IF EXISTS "candidates_select_own" ON candidates;
DROP POLICY IF EXISTS "candidates_insert_own" ON candidates;
DROP POLICY IF EXISTS "candidates_update_own" ON candidates;

-- Users can read only their own candidate row
CREATE POLICY "candidates_select_own"
  ON candidates FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert only their own candidate row
CREATE POLICY "candidates_insert_own"
  ON candidates FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update only their own candidate row
CREATE POLICY "candidates_update_own"
  ON candidates FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- No DELETE policy: candidates cannot delete their own row via client.
-- Deletion is an admin-only operation.


-- ═══════════════════════════════════════════════════════════
-- PART 2: STORAGE POLICIES FOR BUCKET 'cvs'
-- ═══════════════════════════════════════════════════════════
--
-- Bucket 'cvs' holds two path families:
--
--   CV files:     cv/{user_id}/cv.{ext}
--     → foldername(name) = ['cv', '{user_id}']
--     → policy checks: foldername[1] = 'cv' AND foldername[2] = auth.uid()
--
--   Avatar files: avatars/{user_id}.{ext}
--     → foldername(name) = ['avatars']
--     → filename(name)   = '{user_id}.{ext}'
--     → policy checks: foldername[1] = 'avatars'
--                       AND filename LIKE auth.uid() || '.%'
--
-- Both restrict access to the current authenticated user's own files only.
-- ═══════════════════════════════════════════════════════════

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "cvs_bucket_insert" ON storage.objects;
DROP POLICY IF EXISTS "cvs_bucket_select" ON storage.objects;
DROP POLICY IF EXISTS "cvs_bucket_update" ON storage.objects;
DROP POLICY IF EXISTS "cvs_bucket_delete" ON storage.objects;

-- Helper expression (used in all 4 policies):
--   Matches EITHER of:
--     a) cv/{auth.uid()}/...  (CV files)
--     b) avatars/{auth.uid()}.* (avatar files — uid is the filename stem)

-- INSERT: authenticated users can upload their own CV or avatar
CREATE POLICY "cvs_bucket_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'cvs'
    AND (
      -- CV path: cv/{user_id}/...
      (
        (storage.foldername(name))[1] = 'cv'
        AND (storage.foldername(name))[2] = auth.uid()::text
      )
      OR
      -- Avatar path: avatars/{user_id}.{ext}
      (
        (storage.foldername(name))[1] = 'avatars'
        AND storage.filename(name) LIKE auth.uid()::text || '.%'
      )
    )
  );

-- SELECT: users can read/list their own files
CREATE POLICY "cvs_bucket_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'cvs'
    AND (
      (
        (storage.foldername(name))[1] = 'cv'
        AND (storage.foldername(name))[2] = auth.uid()::text
      )
      OR
      (
        (storage.foldername(name))[1] = 'avatars'
        AND storage.filename(name) LIKE auth.uid()::text || '.%'
      )
    )
  );

-- UPDATE: users can overwrite their own files (required for upsert: true)
CREATE POLICY "cvs_bucket_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'cvs'
    AND (
      (
        (storage.foldername(name))[1] = 'cv'
        AND (storage.foldername(name))[2] = auth.uid()::text
      )
      OR
      (
        (storage.foldername(name))[1] = 'avatars'
        AND storage.filename(name) LIKE auth.uid()::text || '.%'
      )
    )
  );

-- DELETE: users can delete their own files (for replace/cleanup flows)
CREATE POLICY "cvs_bucket_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'cvs'
    AND (
      (
        (storage.foldername(name))[1] = 'cv'
        AND (storage.foldername(name))[2] = auth.uid()::text
      )
      OR
      (
        (storage.foldername(name))[1] = 'avatars'
        AND storage.filename(name) LIKE auth.uid()::text || '.%'
      )
    )
  );


-- ═══════════════════════════════════════════════════════════
-- NOTES
-- ═══════════════════════════════════════════════════════════
--
-- Public URL access:
--   If the 'cvs' bucket is set to "public" in Supabase dashboard,
--   getPublicUrl() links are served without auth headers.
--   The SELECT policy above governs the .list() and .download() API calls,
--   NOT direct public URL access. This is expected behavior:
--   avatar URLs are embedded in the page, CV URLs are shared with recruiters.
--
-- list() operation for avatars:
--   profil.html calls: supabase.storage.from('cvs').list('avatars', { search: uid })
--   The SELECT policy allows this because the returned rows are filtered by RLS.
--   The user only sees their own avatar file(s) in the listing.
--
-- Future: recruiter read access
--   When recruiter pages need to read candidate CVs/avatars, add a separate
--   SELECT policy for a 'recruiter' role or use service_role on the backend.
--   Do NOT widen these policies — add new ones scoped to recruiter needs.
