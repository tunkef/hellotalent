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
-- avatar_url was added manually in production (no prior migration).
-- cv_url, cv_filename, cv_uploaded_at were added in migration 003.
-- updated_at was added in migration 001.
-- Re-declaring with IF NOT EXISTS catches partially applied envs.
-- Types and defaults below match the live production schema exactly.

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS avatar_url text;          -- nullable, no default (set on upload)
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS cv_url text;              -- nullable, no default (set on upload)
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS cv_filename text;         -- nullable, no default (set on upload)
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS cv_uploaded_at timestamptz; -- nullable, no default (set on upload)
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(); -- from migration 001


-- ── 2. UNIQUE CONSTRAINT on candidates.user_id ──────────────
-- The application relies on ON CONFLICT 'user_id' for upserts
-- (avatar upload, is_active toggle, profile save via RPC).
-- Postgres requires a unique constraint OR unique index for ON CONFLICT.
-- Guard: skip if any of the following already provides uniqueness:
--   (a) a UNIQUE constraint on user_id (pg_constraint, contype = 'u')
--   (b) a PRIMARY KEY that is user_id   (pg_constraint, contype = 'p')
--   (c) a UNIQUE INDEX on user_id       (pg_index where indisunique)

DO $$
DECLARE
  v_has_uniqueness boolean;
BEGIN
  -- Check pg_constraint for UNIQUE or PK constraint on user_id
  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid
                       AND a.attnum = ANY(c.conkey)
    WHERE c.conrelid = 'candidates'::regclass
      AND c.contype IN ('u', 'p')
      AND a.attname = 'user_id'
      AND array_length(c.conkey, 1) = 1   -- single-column only
  ) INTO v_has_uniqueness;

  -- Also check for a standalone unique index (not backing a constraint)
  IF NOT v_has_uniqueness THEN
    SELECT EXISTS (
      SELECT 1
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid
                         AND a.attnum = i.indkey[0]
      WHERE i.indrelid = 'candidates'::regclass
        AND i.indisunique = true
        AND a.attname = 'user_id'
        AND i.indnkeyatts = 1             -- single-column only
    ) INTO v_has_uniqueness;
  END IF;

  IF NOT v_has_uniqueness THEN
    -- Verify no duplicates before adding the constraint.
    -- If duplicates exist, raise — manual resolution required.
    IF (SELECT count(*) - count(DISTINCT user_id) FROM candidates) > 0 THEN
      RAISE EXCEPTION
        'Cannot add UNIQUE on candidates.user_id: duplicate values exist. '
        'Resolve duplicates manually before re-running this migration.';
    END IF;

    ALTER TABLE candidates ADD CONSTRAINT candidates_user_id_key UNIQUE (user_id);
    RAISE NOTICE 'Added UNIQUE constraint candidates_user_id_key on candidates.user_id';
  ELSE
    RAISE NOTICE 'Uniqueness on candidates.user_id already exists — skipping.';
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
