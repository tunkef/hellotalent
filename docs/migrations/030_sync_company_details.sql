-- ═══════════════════════════════════════════════════════════════
-- Migration 030: Sync Company Details from HR Profiles
-- Date: 2026-03-16
-- Type: FUNCTION + SCHEMA — employer profile data flows to companies
--
-- Live companies schema (verified):
--   id, company_name, slug, legal_name, logo_url, website_url,
--   career_url, linkedin_url, industry, segment, short_description,
--   is_active, created_at, updated_at
--
-- Purpose:
--   When employers save their company profile (saveSirket), the
--   detail fields should also update the companies table so
--   candidates see enriched company info.
--
-- Depends on: 008 (hr_profiles), 012 (companies), 016 (link_employer_to_company)
-- ═══════════════════════════════════════════════════════════════


-- ── 1. ADD CAREER URL TO HR_PROFILES ───────────────────────────
ALTER TABLE hr_profiles ADD COLUMN IF NOT EXISTS career_page_url text;


-- ── 2. SYNC FUNCTION ───────────────────────────────────────────
-- Maps hr_profiles fields → companies columns (actual live schema).
-- Uses COALESCE to only overwrite if employer provided a value.
-- SECURITY DEFINER: employers can't UPDATE companies directly via RLS.

CREATE OR REPLACE FUNCTION sync_company_details()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_company_id bigint;
  v_hr hr_profiles%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_hr FROM hr_profiles WHERE id = v_user_id;
  IF v_hr IS NULL OR v_hr.company_id IS NULL THEN
    RETURN;
  END IF;

  v_company_id := v_hr.company_id;

  -- Sync hr_profiles → companies (live column names)
  UPDATE companies SET
    short_description = COALESCE(NULLIF(TRIM(v_hr.aciklama), ''), short_description),
    industry = COALESCE(NULLIF(TRIM(v_hr.sektor), ''), industry),
    segment = COALESCE(NULLIF(TRIM(v_hr.segment), ''), segment),
    website_url = COALESCE(NULLIF(TRIM(v_hr.web_sitesi), ''), website_url),
    career_url = COALESCE(NULLIF(TRIM(v_hr.career_page_url), ''), career_url),
    linkedin_url = COALESCE(NULLIF(TRIM(v_hr.linkedin), ''), linkedin_url)
  WHERE id = v_company_id;
END;
$$;

GRANT EXECUTE ON FUNCTION sync_company_details TO authenticated;


-- ═══════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════
-- After running saveSirket() in ik.html:
-- SELECT company_name, short_description, industry, segment, website_url
-- FROM companies WHERE id = (SELECT company_id FROM hr_profiles WHERE id = auth.uid());
