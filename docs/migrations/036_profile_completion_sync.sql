-- Migration 036: Profile completion sync + admin hardening
-- Date: 2026-03-16
-- Purpose:
--   - Keep candidates.profile_completion_pct in sync with profile data.
--   - Apply the same scoring model used in 035 on every relevant change.
--   - Ensure admin analytics can always read hr_profiles / candidates / companies.


-- 1) Scoring function (pure, re-usable)
--    Computes a 0..100 score from basic fields + child tables.
--    Location points come from normalized candidate_location_preferences, not legacy tercih_sehirler.
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
BEGIN
  -- Basic identity fields (mirror 035)
  IF coalesce(nullif(trim(p_full_name), ''), '') <> '' THEN
    score := score + 10;
  END IF;
  IF coalesce(nullif(trim(p_adres_il), ''), '') <> '' THEN
    score := score + 5;
  END IF;

  -- Work preferences
  IF EXISTS (
    SELECT 1 FROM candidate_work_preferences wp
    WHERE wp.candidate_id = p_candidate_id
  ) THEN
    score := score + 15;
  END IF;

  -- Experiences
  IF EXISTS (
    SELECT 1 FROM candidate_experiences e
    WHERE e.candidate_id = p_candidate_id
  ) THEN
    score := score + 25;
  END IF;

  -- Education
  IF EXISTS (
    SELECT 1 FROM candidate_education ed
    WHERE ed.candidate_id = p_candidate_id
  ) THEN
    score := score + 15;
  END IF;

  -- Languages
  IF EXISTS (
    SELECT 1 FROM candidate_languages lg
    WHERE lg.candidate_id = p_candidate_id
  ) THEN
    score := score + 10;
  END IF;

  -- Location preferences: normalized table only (not legacy candidates.tercih_sehirler)
  IF EXISTS (
    SELECT 1 FROM candidate_location_preferences lp
    WHERE lp.candidate_id = p_candidate_id
  ) THEN
    score := score + 10;
  END IF;

  IF score > 100 THEN
    score := 100;
  ELSIF score < 0 THEN
    score := 0;
  END IF;

  RETURN score;
END;
$$;


-- 2) Helper: refresh profile_completion_pct for a given candidate id (single write point)
CREATE OR REPLACE FUNCTION refresh_candidate_profile_completion(p_candidate_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name text;
  v_adres_il text;
  v_score int;
BEGIN
  SELECT full_name, adres_il
    INTO v_full_name, v_adres_il
  FROM candidates
  WHERE id = p_candidate_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_score := compute_candidate_profile_completion(p_candidate_id, v_full_name, v_adres_il);

  UPDATE candidates
  SET profile_completion_pct = v_score
  WHERE id = p_candidate_id;
END;
$$;


-- 3) Trigger: keep score in sync when candidates change (basic fields)
--    Anti-recursion: refresh_candidate_profile_completion() updates candidates and would
--    re-fire this trigger; pg_trigger_depth() > 1 means we are inside that nested call.
DROP TRIGGER IF EXISTS trg_candidates_profile_completion ON candidates;
DROP FUNCTION IF EXISTS trg_candidates_profile_completion_fn() CASCADE;

CREATE FUNCTION trg_candidates_profile_completion_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id bigint;
BEGIN
  v_id := COALESCE(NEW.id, OLD.id);
  IF v_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Skip when this trigger was fired by our own UPDATE (avoids infinite loop)
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  PERFORM refresh_candidate_profile_completion(v_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_candidates_profile_completion
AFTER INSERT OR UPDATE ON candidates
FOR EACH ROW
EXECUTE FUNCTION trg_candidates_profile_completion_fn();


-- 4) Triggers on child tables (work prefs, experiences, education, languages, location prefs)
DROP TRIGGER IF EXISTS trg_work_prefs_profile_completion ON candidate_work_preferences;
DROP TRIGGER IF EXISTS trg_experiences_profile_completion ON candidate_experiences;
DROP TRIGGER IF EXISTS trg_education_profile_completion ON candidate_education;
DROP TRIGGER IF EXISTS trg_languages_profile_completion ON candidate_languages;
DROP TRIGGER IF EXISTS trg_loc_prefs_profile_completion ON candidate_location_preferences;

DROP FUNCTION IF EXISTS trg_child_profile_completion_fn() CASCADE;

CREATE FUNCTION trg_child_profile_completion_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id bigint;
BEGIN
  v_id := COALESCE(
    CASE WHEN TG_ARGV[0] = 'candidate_id' THEN COALESCE(NEW.candidate_id, OLD.candidate_id) END,
    COALESCE(NEW.candidate_id, OLD.candidate_id)
  );

  IF v_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  PERFORM refresh_candidate_profile_completion(v_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_work_prefs_profile_completion
AFTER INSERT OR UPDATE OR DELETE ON candidate_work_preferences
FOR EACH ROW
EXECUTE FUNCTION trg_child_profile_completion_fn('candidate_id');

CREATE TRIGGER trg_experiences_profile_completion
AFTER INSERT OR UPDATE OR DELETE ON candidate_experiences
FOR EACH ROW
EXECUTE FUNCTION trg_child_profile_completion_fn('candidate_id');

CREATE TRIGGER trg_education_profile_completion
AFTER INSERT OR UPDATE OR DELETE ON candidate_education
FOR EACH ROW
EXECUTE FUNCTION trg_child_profile_completion_fn('candidate_id');

CREATE TRIGGER trg_languages_profile_completion
AFTER INSERT OR UPDATE OR DELETE ON candidate_languages
FOR EACH ROW
EXECUTE FUNCTION trg_child_profile_completion_fn('candidate_id');

CREATE TRIGGER trg_loc_prefs_profile_completion
AFTER INSERT OR UPDATE OR DELETE ON candidate_location_preferences
FOR EACH ROW
EXECUTE FUNCTION trg_child_profile_completion_fn('candidate_id');


-- 5) Admin read hardening (idempotent)
--    Ensure admin dashboards see full data, regardless of employer visibility policies.
DROP POLICY IF EXISTS hr_admin_read ON hr_profiles;
CREATE POLICY hr_admin_read ON hr_profiles
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS candidates_admin_read ON candidates;
CREATE POLICY candidates_admin_read ON candidates
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS companies_admin_read ON companies;
CREATE POLICY companies_admin_read ON companies
  FOR SELECT USING (is_admin());


-- 6) One-shot full re-sync: recompute profile_completion_pct for all existing candidates
--    so values from 035 (tercih_sehirler-based) are aligned with the normalized scoring model.
--    Idempotent and safe to run multiple times.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM candidates LOOP
    PERFORM refresh_candidate_profile_completion(r.id);
  END LOOP;
END;
$$;

