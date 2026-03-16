-- ═══════════════════════════════════════════════════════════════
-- Migration 028: Employer Role + Domain Validation
-- Date: 2026-03-16
-- Type: SCHEMA + FUNCTION — employer role system + email domain check
--
-- Purpose:
--   1. Add employer_role to hr_profiles (admin/recruiter/viewer)
--   2. Add domain_verified flag
--   3. Create domain validation function (block free email providers)
--   4. Create employer registration helper (SECURITY DEFINER)
--
-- Depends on: 008 (hr_profiles), 016 (link_employer_to_company)
-- ═══════════════════════════════════════════════════════════════


-- ── 1. EMPLOYER ROLE COLUMN ────────────────────────────────────
-- First employer to register for a company gets 'admin' role.
-- Subsequent members invited by admin get 'recruiter' or 'viewer'.
-- Default 'admin' because current employers are all solo registrants.

ALTER TABLE hr_profiles ADD COLUMN IF NOT EXISTS employer_role text
  NOT NULL DEFAULT 'admin';

-- Add CHECK constraint safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'hr_profiles'::regclass
      AND conname = 'hr_profiles_employer_role_check'
  ) THEN
    ALTER TABLE hr_profiles
      ADD CONSTRAINT hr_profiles_employer_role_check
      CHECK (employer_role IN ('admin', 'recruiter', 'viewer'));
  END IF;
END
$$;


-- ── 2. DOMAIN VERIFICATION ─────────────────────────────────────
-- Tracks whether the employer's email domain matches their company.
-- false = free email or unverified, true = corporate domain confirmed.

ALTER TABLE hr_profiles ADD COLUMN IF NOT EXISTS domain_verified boolean
  NOT NULL DEFAULT false;

-- Company type: tek_marka (single brand) or coklu_marka (holding/multi-brand)
ALTER TABLE hr_profiles ADD COLUMN IF NOT EXISTS company_type text
  NOT NULL DEFAULT 'tek_marka';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'hr_profiles'::regclass
      AND conname = 'hr_profiles_company_type_check'
  ) THEN
    ALTER TABLE hr_profiles
      ADD CONSTRAINT hr_profiles_company_type_check
      CHECK (company_type IN ('tek_marka', 'coklu_marka'));
  END IF;
END
$$;


-- ── 3. FREE EMAIL DOMAIN BLOCKLIST ─────────────────────────────
-- Returns true if the email is from a free/personal provider.
-- Used to warn (not block) during registration — soft enforcement.

CREATE OR REPLACE FUNCTION is_free_email_domain(p_email text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_domain text;
BEGIN
  v_domain := LOWER(SPLIT_PART(p_email, '@', 2));
  RETURN v_domain IN (
    'gmail.com', 'googlemail.com',
    'hotmail.com', 'hotmail.co.uk', 'hotmail.fr', 'hotmail.de', 'hotmail.it',
    'outlook.com', 'outlook.co.uk',
    'live.com', 'live.co.uk',
    'yahoo.com', 'yahoo.co.uk', 'yahoo.fr', 'yahoo.de', 'yahoo.com.tr',
    'ymail.com',
    'icloud.com', 'me.com', 'mac.com',
    'aol.com',
    'protonmail.com', 'proton.me',
    'mail.com', 'email.com',
    'zoho.com',
    'yandex.com', 'yandex.ru',
    'mail.ru',
    'gmx.com', 'gmx.de',
    'web.de',
    'tutanota.com', 'tuta.io'
  );
END;
$$;


-- ── 4. DOMAIN MATCH CHECK ──────────────────────────────────────
-- Checks if employer's email domain matches the company's website domain.
-- e.g., ali@zara.com.tr matches www.zara.com.tr

CREATE OR REPLACE FUNCTION check_domain_match(p_email text, p_website text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_email_domain text;
  v_web_domain text;
BEGIN
  IF p_email IS NULL OR p_website IS NULL THEN
    RETURN false;
  END IF;

  -- Extract email domain
  v_email_domain := LOWER(SPLIT_PART(p_email, '@', 2));

  -- Extract website domain (strip protocol and www.)
  v_web_domain := LOWER(p_website);
  v_web_domain := REGEXP_REPLACE(v_web_domain, '^https?://', '');
  v_web_domain := REGEXP_REPLACE(v_web_domain, '^www\.', '');
  v_web_domain := SPLIT_PART(v_web_domain, '/', 1); -- remove path

  -- Direct match
  IF v_email_domain = v_web_domain THEN
    RETURN true;
  END IF;

  -- Subdomain match: email domain ends with .website_domain
  -- e.g., ik.zara.com.tr matches zara.com.tr
  IF v_email_domain LIKE '%.' || v_web_domain THEN
    RETURN true;
  END IF;

  -- Website is subdomain of email domain
  -- e.g., zara.com.tr email, www.zara.com.tr website
  IF v_web_domain LIKE '%.' || v_email_domain THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;


-- ── 5. EMPLOYER REGISTRATION HELPER ────────────────────────────
-- Called after Supabase Auth signup. Creates hr_profiles row with
-- initial data and domain validation result.
-- SECURITY DEFINER to allow insert into hr_profiles from new user.

CREATE OR REPLACE FUNCTION register_employer(
  p_email text,
  p_sirket text DEFAULT NULL,
  p_website text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_is_free boolean;
  v_domain_match boolean;
  v_result jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if profile already exists
  IF EXISTS (SELECT 1 FROM hr_profiles WHERE id = v_user_id) THEN
    RETURN jsonb_build_object('status', 'exists', 'message', 'Profile already exists');
  END IF;

  -- Domain checks
  v_is_free := is_free_email_domain(p_email);
  v_domain_match := false;
  IF p_website IS NOT NULL AND NOT v_is_free THEN
    v_domain_match := check_domain_match(p_email, p_website);
  END IF;

  -- Create initial hr_profile
  INSERT INTO hr_profiles (id, email, sirket, web_sitesi, employer_role, domain_verified)
  VALUES (
    v_user_id,
    p_email,
    NULLIF(TRIM(COALESCE(p_sirket, '')), ''),
    NULLIF(TRIM(COALESCE(p_website, '')), ''),
    'admin',  -- first registrant is always admin
    v_domain_match
  );

  v_result := jsonb_build_object(
    'status', 'created',
    'is_free_email', v_is_free,
    'domain_verified', v_domain_match,
    'employer_role', 'admin'
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION register_employer TO authenticated;


-- ═══════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES
-- ═══════════════════════════════════════════════════════════════
-- SELECT is_free_email_domain('ali@gmail.com');        -- true
-- SELECT is_free_email_domain('ali@zara.com.tr');      -- false
-- SELECT check_domain_match('ali@zara.com.tr', 'https://www.zara.com.tr'); -- true
-- SELECT check_domain_match('ali@gmail.com', 'https://www.zara.com.tr');   -- false
