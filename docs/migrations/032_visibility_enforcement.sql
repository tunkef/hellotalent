-- ═══════════════════════════════════════════════════════════════
-- Migration 032: Candidate→Employer Visibility Enforcement
-- Date: 2026-03-16
-- Type: FUNCTION — hardens send_employer_message + adds helpers
--
-- Purpose:
--   Fixes visibility gaps where employer could bypass frontend
--   filters and directly call RPCs on blocked/hidden candidates.
--
-- Fixes:
--   1. send_employer_message now checks candidate_blocked_companies
--   2. send_employer_message now checks profile_completed
--   3. send_employer_message now checks hide_from_current_employer
--      (matched via company_id from candidate's current experience)
--
-- Depends on: 031 (employer_messages), 013 (hide_from_current_employer),
--             024 (employer_candidate_read)
-- ═══════════════════════════════════════════════════════════════


-- ── 1. ENHANCED SEND MESSAGE FUNCTION ────────────────────────
-- Replaces the version from migration 031.
-- Adds: blocked company check, profile_completed check,
--       hide_from_current_employer check (via company_id match).

CREATE OR REPLACE FUNCTION send_employer_message(
  p_candidate_id bigint,
  p_subject text,
  p_body text,
  p_position_id bigint DEFAULT NULL,
  p_template_id bigint DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_company_id bigint;
  v_msg_id bigint;
  v_candidate record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get employer's company
  SELECT company_id INTO v_company_id
  FROM hr_profiles WHERE id = v_user_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Employer not linked to a company';
  END IF;

  -- Fetch candidate with all visibility-relevant fields
  SELECT id, is_active, profile_completed, hide_from_current_employer
  INTO v_candidate
  FROM candidates WHERE id = p_candidate_id;

  IF v_candidate IS NULL THEN
    RAISE EXCEPTION 'Candidate not found';
  END IF;

  IF NOT v_candidate.is_active THEN
    RAISE EXCEPTION 'Candidate profile is not active';
  END IF;

  IF NOT v_candidate.profile_completed THEN
    RAISE EXCEPTION 'Candidate profile is not complete';
  END IF;

  -- Check: candidate blocked this employer's company
  IF EXISTS (
    SELECT 1 FROM candidate_blocked_companies
    WHERE candidate_id = p_candidate_id
      AND company_id = v_company_id
  ) THEN
    RAISE EXCEPTION 'Bu adaya mesaj gönderemezsiniz';
  END IF;

  -- Check: candidate hides from current employer (company_id match)
  IF v_candidate.hide_from_current_employer THEN
    -- Look at candidate's current experiences for company_id match
    IF EXISTS (
      SELECT 1 FROM candidate_experiences ce
      JOIN brands b ON LOWER(TRIM(ce.marka)) = LOWER(TRIM(b.name))
        OR LOWER(TRIM(ce.sirket)) = LOWER(TRIM(b.name))
      WHERE ce.candidate_id = p_candidate_id
        AND ce.devam_ediyor = true
        AND b.company_id = v_company_id
    ) THEN
      RAISE EXCEPTION 'Bu adaya mesaj gönderemezsiniz';
    END IF;
    -- Also check direct company name match
    IF EXISTS (
      SELECT 1 FROM candidate_experiences ce
      JOIN companies co ON LOWER(TRIM(ce.sirket)) = LOWER(TRIM(co.company_name))
        OR LOWER(TRIM(ce.marka)) = LOWER(TRIM(co.company_name))
      WHERE ce.candidate_id = p_candidate_id
        AND ce.devam_ediyor = true
        AND co.id = v_company_id
    ) THEN
      RAISE EXCEPTION 'Bu adaya mesaj gönderemezsiniz';
    END IF;
  END IF;

  -- Verify position belongs to this company (if provided)
  IF p_position_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM positions
      WHERE id = p_position_id AND company_id = v_company_id
    ) THEN
      RAISE EXCEPTION 'Position does not belong to your company';
    END IF;
  END IF;

  -- Insert message
  INSERT INTO employer_messages (sender_id, company_id, candidate_id, position_id, template_id, subject, body)
  VALUES (v_user_id, v_company_id, p_candidate_id, p_position_id, p_template_id, TRIM(p_subject), TRIM(p_body))
  RETURNING id INTO v_msg_id;

  RETURN v_msg_id;
END;
$$;


-- ── 2. HELPER: check_candidate_visible_to_employer ───────────
-- Reusable function for frontend and future RPCs.
-- Returns true if the candidate should be visible to the current employer.

CREATE OR REPLACE FUNCTION check_candidate_visible_to_employer(p_candidate_id bigint)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_company_id bigint;
  v_candidate record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Get employer's company
  SELECT company_id INTO v_company_id
  FROM hr_profiles WHERE id = v_user_id;
  IF v_company_id IS NULL THEN RETURN false; END IF;

  -- Fetch candidate
  SELECT id, is_active, profile_completed, hide_from_current_employer
  INTO v_candidate
  FROM candidates WHERE id = p_candidate_id;

  IF v_candidate IS NULL THEN RETURN false; END IF;
  IF NOT v_candidate.is_active THEN RETURN false; END IF;
  IF NOT v_candidate.profile_completed THEN RETURN false; END IF;

  -- Blocked check
  IF EXISTS (
    SELECT 1 FROM candidate_blocked_companies
    WHERE candidate_id = p_candidate_id AND company_id = v_company_id
  ) THEN
    RETURN false;
  END IF;

  -- Hide from current employer check
  IF v_candidate.hide_from_current_employer THEN
    IF EXISTS (
      SELECT 1 FROM candidate_experiences ce
      JOIN brands b ON LOWER(TRIM(ce.marka)) = LOWER(TRIM(b.name))
        OR LOWER(TRIM(ce.sirket)) = LOWER(TRIM(b.name))
      WHERE ce.candidate_id = p_candidate_id
        AND ce.devam_ediyor = true
        AND b.company_id = v_company_id
    ) THEN
      RETURN false;
    END IF;
    IF EXISTS (
      SELECT 1 FROM candidate_experiences ce
      JOIN companies co ON LOWER(TRIM(ce.sirket)) = LOWER(TRIM(co.company_name))
        OR LOWER(TRIM(ce.marka)) = LOWER(TRIM(co.company_name))
      WHERE ce.candidate_id = p_candidate_id
        AND ce.devam_ediyor = true
        AND co.id = v_company_id
    ) THEN
      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION check_candidate_visible_to_employer TO authenticated;


-- ═══════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════
-- SELECT check_candidate_visible_to_employer(1);
-- (should return true for visible candidates, false for blocked/hidden)
