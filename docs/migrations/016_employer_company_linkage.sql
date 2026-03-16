-- ═══════════════════════════════════════════════════════════
-- Migration 016: Employer → Company Linkage
-- Creates SECURITY DEFINER function for auto-creating
-- company records and linking them to hr_profiles.
-- Note: companies.id is already IDENTITY (auto-increment).
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION link_employer_to_company(
  p_company_name text,
  p_website_url text DEFAULT NULL,
  p_sektor text DEFAULT NULL,
  p_segment text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id bigint;
  v_slug text;
  v_user_id uuid;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if this employer already has a company_id
  SELECT company_id INTO v_company_id
  FROM hr_profiles
  WHERE id = v_user_id;

  -- If already linked, return existing company_id
  IF v_company_id IS NOT NULL THEN
    RETURN v_company_id;
  END IF;

  -- Try to find existing company by exact name match (case-insensitive)
  SELECT id INTO v_company_id
  FROM companies
  WHERE LOWER(company_name) = LOWER(TRIM(p_company_name));

  -- If not found, create new company
  IF v_company_id IS NULL THEN
    -- Generate slug from company name
    v_slug := LOWER(TRIM(p_company_name));
    v_slug := REGEXP_REPLACE(v_slug, '[^a-z0-9\s-]', '', 'g');
    v_slug := REGEXP_REPLACE(v_slug, '\s+', '-', 'g');
    v_slug := REGEXP_REPLACE(v_slug, '-+', '-', 'g');
    v_slug := TRIM(BOTH '-' FROM v_slug);

    -- Ensure slug uniqueness
    IF EXISTS (SELECT 1 FROM companies WHERE slug = v_slug) THEN
      v_slug := v_slug || '-' || EXTRACT(EPOCH FROM now())::int;
    END IF;

    INSERT INTO companies (company_name, slug, website_url)
    VALUES (TRIM(p_company_name), v_slug, p_website_url)
    RETURNING id INTO v_company_id;
  END IF;

  -- Link employer to company
  UPDATE hr_profiles
  SET company_id = v_company_id
  WHERE id = v_user_id;

  RETURN v_company_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION link_employer_to_company TO authenticated;

-- ═══════════════════════════════════════════════════════════
-- Verification
-- ═══════════════════════════════════════════════════════════
-- SELECT link_employer_to_company('Test Şirketi', 'https://test.com', 'Retail', 'Premium');
-- SELECT company_id FROM hr_profiles WHERE id = auth.uid();
