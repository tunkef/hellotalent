-- ═══════════════════════════════════════════════════════════════
-- Migration 039: Align profile completion scoring (UI ↔ backend)
-- Date: 2026-03-17
-- Type: SCHEMA — scoring model update for consistency
--
-- Purpose:
--   Sync compute_candidate_profile_completion() with UI calculateCompletion().
--   Add telefon + linkedin to backend scoring.
--   Remove cinsiyet + dogum_yili from scoring (bias risk, weak signal).
--
-- New weights (total = 100):
--   full_name:   10   (was 10)
--   telefon:      5   (NEW)
--   adres_il:     5   (was 5)
--   linkedin:     5   (NEW)
--   experiences: 25   (was 25)
--   education:   15   (was 15)
--   languages:   10   (was 10)
--   preferences: 15   (was 15)
--   locations:   10   (was 10)
--
-- Depends on: 036 (profile_completion_sync)
-- ═══════════════════════════════════════════════════════════════


-- ── 1. REPLACE SCORING FUNCTION ─────────────────────────────────
CREATE OR REPLACE FUNCTION compute_candidate_profile_completion(
  p_candidate_id bigint,
  p_full_name text,
  p_adres_il text
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  score int := 0;
  v_telefon text;
  v_linkedin text;
BEGIN
  -- Fetch additional fields from candidates row
  SELECT telefon, linkedin INTO v_telefon, v_linkedin
  FROM candidates
  WHERE id = p_candidate_id;

  -- Identity (20 points)
  IF coalesce(nullif(trim(p_full_name), ''), '') <> '' THEN
    score := score + 10;
  END IF;
  IF coalesce(nullif(trim(v_telefon), ''), '') <> '' THEN
    score := score + 5;
  END IF;
  IF coalesce(nullif(trim(p_adres_il), ''), '') <> '' THEN
    score := score + 5;
  END IF;

  -- Contact (5 points)
  IF coalesce(nullif(trim(v_linkedin), ''), '') <> '' THEN
    score := score + 5;
  END IF;

  -- Experiences (25 points)
  IF EXISTS (
    SELECT 1 FROM candidate_experiences e
    WHERE e.candidate_id = p_candidate_id
  ) THEN
    score := score + 25;
  END IF;

  -- Education (15 points)
  IF EXISTS (
    SELECT 1 FROM candidate_education ed
    WHERE ed.candidate_id = p_candidate_id
  ) THEN
    score := score + 15;
  END IF;

  -- Languages (10 points)
  IF EXISTS (
    SELECT 1 FROM candidate_languages lg
    WHERE lg.candidate_id = p_candidate_id
  ) THEN
    score := score + 10;
  END IF;

  -- Work preferences (15 points)
  IF EXISTS (
    SELECT 1 FROM candidate_work_preferences wp
    WHERE wp.candidate_id = p_candidate_id
  ) THEN
    score := score + 15;
  END IF;

  -- Location preferences (10 points)
  IF EXISTS (
    SELECT 1 FROM candidate_location_preferences lp
    WHERE lp.candidate_id = p_candidate_id
  ) THEN
    score := score + 10;
  END IF;

  -- Clamp
  IF score > 100 THEN score := 100; END IF;
  IF score < 0 THEN score := 0; END IF;

  RETURN score;
END;
$$;


-- ═══════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════
-- After deploy, run:
-- SELECT id, full_name, profile_completion_pct,
--        compute_candidate_profile_completion(id, full_name, adres_il) AS new_score
-- FROM candidates
-- WHERE profile_completion_pct IS NOT NULL
-- LIMIT 10;
