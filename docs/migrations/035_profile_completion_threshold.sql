-- Migration 035: Candidate profile completion threshold
-- Date: 2026-03-16
-- Purpose:
--   - Track profile completion as a percentage (0-100).
--   - Allow IK panel to recommend candidates with profile_completion_pct >= 45
--     even if profile_completed = false.
--   - Keep employer visibility limited to active + completed or above-threshold profiles.

-- 1) Column: profile_completion_pct (0..100)
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS profile_completion_pct int NOT NULL DEFAULT 0;

ALTER TABLE candidates
  DROP CONSTRAINT IF EXISTS candidates_profile_completion_pct_check;

ALTER TABLE candidates
  ADD CONSTRAINT candidates_profile_completion_pct_check
  CHECK (profile_completion_pct >= 0 AND profile_completion_pct <= 100);


-- 2) Backfill helper: simple deterministic scoring based on existing wizard fields
--    This is a coarse score just to separate:
--      - very empty profiles (~0)
--      - partially filled (~10-70)
--      - fully completed (~80+)
DO $$
DECLARE
  r candidates%ROWTYPE;
  score int;
BEGIN
  FOR r IN SELECT * FROM candidates LOOP
    score := 0;

    -- Basic identity fields
    IF coalesce(nullif(trim(r.full_name), ''), '') <> '' THEN
      score := score + 10;
    END IF;
    IF coalesce(nullif(trim(r.adres_il), ''), '') <> '' THEN
      score := score + 5;
    END IF;

    -- Work preferences
    IF EXISTS (
      SELECT 1 FROM candidate_work_preferences wp
      WHERE wp.candidate_id = r.id
    ) THEN
      score := score + 15;
    END IF;

    -- Experiences
    IF EXISTS (
      SELECT 1 FROM candidate_experiences e
      WHERE e.candidate_id = r.id
    ) THEN
      score := score + 25;
    END IF;

    -- Education
    IF EXISTS (
      SELECT 1 FROM candidate_education ed
      WHERE ed.candidate_id = r.id
    ) THEN
      score := score + 15;
    END IF;

    -- Languages
    IF EXISTS (
      SELECT 1 FROM candidate_languages lg
      WHERE lg.candidate_id = r.id
    ) THEN
      score := score + 10;
    END IF;

    -- Locations (company_locations is employer-side; keep candidate-local only)
    IF r.tercih_sehirler IS NOT NULL AND array_length(r.tercih_sehirler, 1) > 0 THEN
      score := score + 10;
    END IF;

    -- Cap to [0,100]
    IF score > 100 THEN
      score := 100;
    ELSIF score < 0 THEN
      score := 0;
    END IF;

    UPDATE candidates
      SET profile_completion_pct = score
      WHERE id = r.id;
  END LOOP;
END;
$$;


-- 3) Employer read policies: allow active + (completed OR >=45%)
DROP POLICY IF EXISTS candidates_employer_read ON candidates;
CREATE POLICY candidates_employer_read ON candidates
  FOR SELECT USING (
    is_employer()
    AND is_active = true
    AND (
      profile_completed = true
      OR profile_completion_pct >= 45
    )
  );

DROP POLICY IF EXISTS experiences_employer_read ON candidate_experiences;
CREATE POLICY experiences_employer_read ON candidate_experiences
  FOR SELECT USING (
    is_employer()
    AND candidate_id IN (
      SELECT id FROM candidates
      WHERE is_active = true
        AND (profile_completed = true OR profile_completion_pct >= 45)
    )
  );

DROP POLICY IF EXISTS work_prefs_employer_read ON candidate_work_preferences;
CREATE POLICY work_prefs_employer_read ON candidate_work_preferences
  FOR SELECT USING (
    is_employer()
    AND candidate_id IN (
      SELECT id FROM candidates
      WHERE is_active = true
        AND (profile_completed = true OR profile_completion_pct >= 45)
    )
  );

DROP POLICY IF EXISTS education_employer_read ON candidate_education;
CREATE POLICY education_employer_read ON candidate_education
  FOR SELECT USING (
    is_employer()
    AND candidate_id IN (
      SELECT id FROM candidates
      WHERE is_active = true
        AND (profile_completed = true OR profile_completion_pct >= 45)
    )
  );

DROP POLICY IF EXISTS languages_employer_read ON candidate_languages;
CREATE POLICY languages_employer_read ON candidate_languages
  FOR SELECT USING (
    is_employer()
    AND candidate_id IN (
      SELECT id FROM candidates
      WHERE is_active = true
        AND (profile_completed = true OR profile_completion_pct >= 45)
    )
  );

