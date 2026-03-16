-- Migration 024: Employer read access to candidate tables
-- Employers need to view candidate profiles from ik.html dashboard.
-- Only active, profile-completed candidates are visible (enforced in app logic too).
-- Uses existing is_employer() helper from migration 014/019.

-- ── candidates: employer read (active + completed profiles only) ──
DROP POLICY IF EXISTS candidates_employer_read ON candidates;
CREATE POLICY candidates_employer_read ON candidates
  FOR SELECT USING (
    is_employer()
    AND is_active = true
    AND profile_completed = true
  );

-- ── candidate_experiences: employer read ──
DROP POLICY IF EXISTS experiences_employer_read ON candidate_experiences;
CREATE POLICY experiences_employer_read ON candidate_experiences
  FOR SELECT USING (
    is_employer()
    AND candidate_id IN (
      SELECT id FROM candidates WHERE is_active = true AND profile_completed = true
    )
  );

-- ── candidate_work_preferences: employer read ──
DROP POLICY IF EXISTS work_prefs_employer_read ON candidate_work_preferences;
CREATE POLICY work_prefs_employer_read ON candidate_work_preferences
  FOR SELECT USING (
    is_employer()
    AND candidate_id IN (
      SELECT id FROM candidates WHERE is_active = true AND profile_completed = true
    )
  );

-- ── candidate_education: employer read ──
DROP POLICY IF EXISTS education_employer_read ON candidate_education;
CREATE POLICY education_employer_read ON candidate_education
  FOR SELECT USING (
    is_employer()
    AND candidate_id IN (
      SELECT id FROM candidates WHERE is_active = true AND profile_completed = true
    )
  );

-- ── candidate_languages: employer read ──
DROP POLICY IF EXISTS languages_employer_read ON candidate_languages;
CREATE POLICY languages_employer_read ON candidate_languages
  FOR SELECT USING (
    is_employer()
    AND candidate_id IN (
      SELECT id FROM candidates WHERE is_active = true AND profile_completed = true
    )
  );

-- ── candidate_blocked_companies: employer read (for filtering) ──
DROP POLICY IF EXISTS blocked_employer_read ON candidate_blocked_companies;
CREATE POLICY blocked_employer_read ON candidate_blocked_companies
  FOR SELECT USING (is_employer());
