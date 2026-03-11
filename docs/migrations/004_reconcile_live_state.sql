-- ═══════════════════════════════════════════════════════════════
-- HELLOTALENT — Migration 004: Reconcile Live State
-- Date: 2026-03-11
-- Type: RECONCILIATION — idempotent, non-destructive
--
-- Purpose:
--   Formalizes manual/incremental live changes into repo-tracked SQL.
--   Safe to run on fresh, partial, or fully-configured environments.
--
-- Guarantees:
--   - Every statement is idempotent (IF NOT EXISTS / IF EXISTS guards)
--   - No columns dropped
--   - No type conversions
--   - No CHECK constraints added
--   - No data modified
--
-- Live behavior notes (as of 2026-03-11):
--   - Storage bucket in use: 'cvs' (migration 003 comments reference
--     'cv-uploads' — that name was never used in production)
--   - avatar_url and cv_url store full Supabase public URLs
--   - This is current live behavior, not a permanent design decision.
--     A future migration may switch to storage-path-only if warranted.
-- ═══════════════════════════════════════════════════════════════


-- ── 1. CANDIDATES TABLE — ensure cv/avatar columns exist ─────
-- These columns were added manually or via migration 003.
-- Re-declaring with IF NOT EXISTS catches partially applied envs.

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS cv_url text;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS cv_filename text;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS cv_uploaded_at timestamptz;

-- updated_at was introduced in migration 001. Re-declare for safety.
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();


-- ── 2. UNIQUE CONSTRAINT on candidates.user_id ──────────────
-- The application relies on ON CONFLICT 'user_id' for upserts
-- (avatar upload, is_active toggle, profile save).
-- This constraint must exist for those upserts to work.
-- Guard: only add if not already present.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'candidates'::regclass
      AND contype = 'u'
      AND conname = 'candidates_user_id_key'
  ) THEN
    -- Check there are no duplicates before adding the constraint.
    -- If duplicates exist, this block will raise and the migration
    -- must be resolved manually before proceeding.
    IF (SELECT count(*) - count(DISTINCT user_id) FROM candidates) > 0 THEN
      RAISE EXCEPTION
        'Cannot add UNIQUE on candidates.user_id: duplicate values exist. '
        'Resolve duplicates manually before re-running this migration.';
    END IF;

    ALTER TABLE candidates ADD CONSTRAINT candidates_user_id_key UNIQUE (user_id);
  END IF;
END
$$;


-- ── 3. COLUMN ANNOTATIONS ───────────────────────────────────
-- These are metadata-only. No schema or data changes.

-- kidem_seviyesi: currently unused by the UI (profil.html wizard never
-- populates it). Retained because recruiter-side filtering may need it.
-- Do not drop until recruiter feature scope is finalized.
COMMENT ON COLUMN candidate_experiences.kidem_seviyesi
  IS 'DEPRECATED/RESERVED — unpopulated by current UI. Retained for potential recruiter filtering.';

-- sektor: unconstrained text column. No CHECK added yet because:
--   (a) no live data audit has been performed
--   (b) normalization dictionary has not been agreed on
--   (c) UI does not currently expose this field
COMMENT ON COLUMN candidate_experiences.sektor
  IS 'UNCONSTRAINED — pending data audit and normalization dictionary before adding CHECK.';


-- ── 4. STORAGE BUCKET DRIFT NOTE ────────────────────────────
-- Migration 003 comments reference bucket 'cv-uploads'.
-- Production has always used bucket 'cvs' (see STORAGE.BUCKET in profil.html).
-- Avatars are stored under 'cvs/avatars/' prefix in the same bucket.
-- No action taken here — this comment records the drift for future reference.


-- ═══════════════════════════════════════════════════════════════
-- END OF MIGRATION 004
-- Next: 005 will add an updated_at auto-trigger on candidates.
-- ═══════════════════════════════════════════════════════════════
