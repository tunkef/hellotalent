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
-- list() operation for avatars:
--   profil.html calls: supabase.storage.from('cvs').list('avatars', { search: uid })
--   The SELECT policy allows this because the returned rows are filtered by RLS.
--   The user only sees their own avatar file(s) in the listing.
--
-- Future: recruiter read access
--   When recruiter pages need to read candidate CVs/avatars, add a separate
--   SELECT policy for a 'recruiter' role or use service_role on the backend.
--   Do NOT widen these policies — add new ones scoped to recruiter needs.


-- ═══════════════════════════════════════════════════════════
-- SECURITY DESIGN NOTE: PUBLIC CV URLs ARE A TEMPORARY COMPROMISE
-- ═══════════════════════════════════════════════════════════
--
-- CURRENT REALITY (as of migration 004):
--
--   The 'cvs' bucket is set to PUBLIC in the Supabase dashboard.
--   Both avatars and CVs use getPublicUrl(), meaning anyone with the URL
--   can download the file without authentication.
--
--   - Avatars: PUBLIC is acceptable. Avatar images are displayed on the
--     candidate's profile page and visible to recruiters. Public access
--     is the intended behavior. URLs are not sensitive.
--
--   - CVs: PUBLIC is NOT the desired long-term model. CV documents contain
--     personal data (work history, contact info, sometimes ID numbers).
--     A public URL means anyone who guesses or intercepts the URL can
--     download the CV — no auth check, no audit trail.
--
--   The RLS policies above protect the Supabase API (upload, list, delete,
--   overwrite) — a user cannot modify another user's files. But the PUBLIC
--   bucket setting bypasses RLS for direct URL reads. This is the gap.
--
-- WHY THIS IS ACCEPTABLE FOR NOW:
--
--   - CV URLs contain a UUID path segment (cv/{uuid}/cv.pdf), making them
--     unguessable in practice (128-bit random ID)
--   - The current user base is small (early MVP)
--   - Splitting buckets or switching to signed URLs requires code changes
--     in both the candidate upload flow and the recruiter read flow
--   - Prioritizing this over UI/UX polish would delay the product
--
-- RECOMMENDED FUTURE DIRECTION (migration 005 or later):
--
--   Option A — Split buckets (RECOMMENDED):
--     1. Create a new bucket 'avatars' → set to PUBLIC
--     2. Change avatar code: from('avatars') instead of from('cvs')
--     3. Set 'cvs' bucket to PRIVATE in dashboard
--     4. Change CV read code: use createSignedUrl() instead of getPublicUrl()
--        - signedUrl gives a time-limited link (e.g. 1 hour)
--        - recruiter pages would request a fresh signed URL on each view
--     5. Add storage policies to the new 'avatars' bucket
--     Pros: clean separation, avatars stay fast/public, CVs fully private
--     Cons: requires code changes in profil.html + recruiter pages
--
--   Option B — Keep one bucket, switch CV access to signed URLs:
--     1. Keep 'cvs' bucket PUBLIC (for avatars)
--     2. Stop storing getPublicUrl() for CVs in candidates.cv_url
--     3. Instead store only the storage path (cv/{uid}/cv.pdf)
--     4. Generate signed URLs on demand when displaying CV links
--     Pros: no bucket changes needed
--     Cons: bucket stays public so avatar URLs still work, but CV URLs
--            are no longer permanent (signed URLs expire)
--
--   Option A is cleaner. Option B is a smaller code change.
--
-- WHAT TO DO NOW:
--   - Apply this migration as-is (low risk, immediate security improvement)
--   - Do NOT change the bucket visibility yet
--   - Do NOT change getPublicUrl() calls yet
--   - Treat public CV URLs as a known, documented, accepted temporary state
--
-- WHAT TO DO BEFORE RECRUITER LAUNCH:
--   - Implement Option A (split buckets) or Option B (signed URLs)
--   - This MUST happen before recruiter-facing CV access goes live,
--     because recruiters viewing CVs = more URL exposure = higher risk
--
