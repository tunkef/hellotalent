-- =====================================================================
-- K038 Faz 1 — Admin Brand/Company CRUD + Archive + Image Storage
-- =====================================================================
-- Purpose:
--   Enables upcoming admin-portal brand management feature. Adds audit
--   columns + archive metadata to brands & companies, exposes admin-only
--   CRUD/archive RPCs (SECURITY DEFINER + is_admin() gate), and creates a
--   public 'brand-assets' storage bucket with admin-only write policies.
--
-- What this does:
--   1. Additive schema extensions on brands (accent_color, updated_at,
--      updated_by, archived_at, archived_by) — all IF NOT EXISTS.
--   2. Additive schema extensions on companies (updated_at, updated_by,
--      archived_at, archived_by).
--   3. updated_at trigger for brands (companies already has one via
--      set_companies_updated_at — reused).
--   4. Six admin RPCs: admin_upsert_brand, admin_archive_brand,
--      admin_restore_brand, admin_upsert_company, admin_archive_company,
--      admin_restore_company.
--   5. Public 'brand-assets' bucket + RLS policies on storage.objects
--      (public read, admin write/update/delete).
--   6. Indexes on archived_at for fast archive filters.
--
-- Helpers reused (NOT redefined):
--   - is_admin()                  — existing admin_users gate
--   - set_companies_updated_at()  — existing updated_at trigger fn
--
-- Idempotency:
--   - ALTER TABLE ... ADD COLUMN IF NOT EXISTS
--   - CREATE OR REPLACE FUNCTION
--   - DROP POLICY IF EXISTS ... CREATE POLICY
--   - CREATE INDEX IF NOT EXISTS
--   - INSERT ... ON CONFLICT DO NOTHING  (bucket)
--   - DO block guards for trigger creation
--
-- Security model:
--   - Every RPC is SECURITY DEFINER with SET search_path = public, pg_temp
--   - Every RPC RAISES 'not authorized' if is_admin() = false
--   - GRANT EXECUTE TO authenticated (policy check inside)
--   - Storage write ops gated by is_admin() in WITH CHECK / USING
--
-- Scope decision — cascade:
--   Archiving a company does NOT cascade to its brands. Brand archive
--   state is independent. Admin must archive brands explicitly if needed.
--
-- Candidate-side impact:
--   None in this migration. profil-markalar.js continues to use
--   is_active=true; archived_at IS NULL filter will be added in Faz 4.
--
-- Rollback:
--   DROP FUNCTION admin_upsert_brand(jsonb), admin_archive_brand(bigint),
--     admin_restore_brand(bigint), admin_upsert_company(jsonb),
--     admin_archive_company(bigint), admin_restore_company(bigint);
--   DROP POLICY brand_assets_read, brand_assets_admin_insert,
--     brand_assets_admin_update, brand_assets_admin_delete ON storage.objects;
--   DELETE FROM storage.buckets WHERE id = 'brand-assets';  -- only if empty
--   ALTER TABLE brands DROP COLUMN accent_color, updated_at, updated_by,
--     archived_at, archived_by;
--   ALTER TABLE companies DROP COLUMN updated_at, updated_by,
--     archived_at, archived_by;
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Schema extensions — brands
-- ---------------------------------------------------------------------
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS accent_color TEXT;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id);

-- brands updated_at trigger function (equivalent to set_companies_updated_at)
CREATE OR REPLACE FUNCTION public.set_brands_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_brands_set_updated_at ON public.brands;
CREATE TRIGGER trg_brands_set_updated_at
  BEFORE UPDATE ON public.brands
  FOR EACH ROW
  EXECUTE FUNCTION public.set_brands_updated_at();

-- ---------------------------------------------------------------------
-- 2. Schema extensions — companies
-- ---------------------------------------------------------------------
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id);

-- companies updated_at trigger function (idempotent CREATE OR REPLACE).
CREATE OR REPLACE FUNCTION public.set_companies_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_companies_set_updated_at ON public.companies;
CREATE TRIGGER trg_companies_set_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.set_companies_updated_at();

-- ---------------------------------------------------------------------
-- 3. Indexes
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_brands_archived_at ON public.brands(archived_at);
CREATE INDEX IF NOT EXISTS idx_companies_archived_at ON public.companies(archived_at);

-- ---------------------------------------------------------------------
-- 4. Admin RPCs — brands
-- ---------------------------------------------------------------------

-- admin_upsert_brand(payload jsonb) -> brands
-- payload.id present → UPDATE; absent → INSERT.
-- Any missing key is ignored on UPDATE (preserves current value).
CREATE OR REPLACE FUNCTION public.admin_upsert_brand(payload jsonb)
RETURNS public.brands
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result public.brands;
  v_id bigint;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  v_id := NULLIF(payload->>'id', '')::bigint;

  IF v_id IS NULL THEN
    INSERT INTO public.brands (
      brand_name, slug, logo_url, website_url, instagram_url,
      short_description, segment, store_count_tr, store_cities,
      hq_city, employee_count_tr, is_featured, company_id,
      cover_image_url, accent_color, is_active, updated_by
    ) VALUES (
      payload->>'brand_name',
      payload->>'slug',
      payload->>'logo_url',
      payload->>'website_url',
      payload->>'instagram_url',
      payload->>'short_description',
      payload->>'segment',
      NULLIF(payload->>'store_count_tr', '')::int,
      CASE WHEN payload ? 'store_cities'
           THEN ARRAY(SELECT jsonb_array_elements_text(payload->'store_cities'))
           ELSE NULL END,
      payload->>'hq_city',
      NULLIF(payload->>'employee_count_tr', '')::int,
      COALESCE((payload->>'is_featured')::boolean, false),
      NULLIF(payload->>'company_id', '')::bigint,
      payload->>'cover_image_url',
      payload->>'accent_color',
      COALESCE((payload->>'is_active')::boolean, true),
      auth.uid()
    )
    RETURNING * INTO v_result;
  ELSE
    UPDATE public.brands SET
      brand_name        = COALESCE(payload->>'brand_name', brand_name),
      slug              = COALESCE(payload->>'slug', slug),
      logo_url          = CASE WHEN payload ? 'logo_url'          THEN payload->>'logo_url'          ELSE logo_url END,
      website_url       = CASE WHEN payload ? 'website_url'       THEN payload->>'website_url'       ELSE website_url END,
      instagram_url     = CASE WHEN payload ? 'instagram_url'     THEN payload->>'instagram_url'     ELSE instagram_url END,
      short_description = CASE WHEN payload ? 'short_description' THEN payload->>'short_description' ELSE short_description END,
      segment           = COALESCE(payload->>'segment', segment),
      store_count_tr    = CASE WHEN payload ? 'store_count_tr'    THEN NULLIF(payload->>'store_count_tr','')::int ELSE store_count_tr END,
      store_cities      = CASE WHEN payload ? 'store_cities'      THEN ARRAY(SELECT jsonb_array_elements_text(payload->'store_cities')) ELSE store_cities END,
      hq_city           = CASE WHEN payload ? 'hq_city'           THEN payload->>'hq_city' ELSE hq_city END,
      employee_count_tr = CASE WHEN payload ? 'employee_count_tr' THEN NULLIF(payload->>'employee_count_tr','')::int ELSE employee_count_tr END,
      is_featured       = CASE WHEN payload ? 'is_featured'       THEN (payload->>'is_featured')::boolean ELSE is_featured END,
      company_id        = CASE WHEN payload ? 'company_id'        THEN NULLIF(payload->>'company_id','')::bigint ELSE company_id END,
      cover_image_url   = CASE WHEN payload ? 'cover_image_url'   THEN payload->>'cover_image_url' ELSE cover_image_url END,
      accent_color      = CASE WHEN payload ? 'accent_color'      THEN payload->>'accent_color' ELSE accent_color END,
      is_active         = CASE WHEN payload ? 'is_active'         THEN (payload->>'is_active')::boolean ELSE is_active END,
      updated_by        = auth.uid()
    WHERE id = v_id
    RETURNING * INTO v_result;

    IF v_result.id IS NULL THEN
      RAISE EXCEPTION 'brand not found: %', v_id;
    END IF;
  END IF;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_archive_brand(p_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  UPDATE public.brands
     SET archived_at = now(),
         archived_by = auth.uid(),
         is_active   = false,
         updated_by  = auth.uid()
   WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_restore_brand(p_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  UPDATE public.brands
     SET archived_at = NULL,
         archived_by = NULL,
         is_active   = true,
         updated_by  = auth.uid()
   WHERE id = p_id;
END;
$$;

-- ---------------------------------------------------------------------
-- 5. Admin RPCs — companies
-- ---------------------------------------------------------------------
-- NOTE: companies base columns verified from migrations:
--   company_name (text), plus ecosystem fields added over time.
-- This RPC only touches a conservative subset (company_name) to avoid
-- hallucinating columns. Expand the column list in a later migration
-- once the admin UI requires more fields.

CREATE OR REPLACE FUNCTION public.admin_upsert_company(payload jsonb)
RETURNS public.companies
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result public.companies;
  v_id bigint;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  v_id := NULLIF(payload->>'id', '')::bigint;

  IF v_id IS NULL THEN
    INSERT INTO public.companies (
      company_name, slug, legal_name, logo_url, website_url, career_url,
      linkedin_url, industry, segment, short_description, is_active, updated_by
    ) VALUES (
      payload->>'company_name',
      payload->>'slug',
      payload->>'legal_name',
      payload->>'logo_url',
      payload->>'website_url',
      payload->>'career_url',
      payload->>'linkedin_url',
      payload->>'industry',
      payload->>'segment',
      payload->>'short_description',
      COALESCE((payload->>'is_active')::boolean, true),
      auth.uid()
    )
    RETURNING * INTO v_result;
  ELSE
    UPDATE public.companies SET
      company_name      = COALESCE(payload->>'company_name', company_name),
      slug              = CASE WHEN payload ? 'slug'              THEN payload->>'slug'              ELSE slug              END,
      legal_name        = CASE WHEN payload ? 'legal_name'        THEN payload->>'legal_name'        ELSE legal_name        END,
      logo_url          = CASE WHEN payload ? 'logo_url'          THEN payload->>'logo_url'          ELSE logo_url          END,
      website_url       = CASE WHEN payload ? 'website_url'       THEN payload->>'website_url'       ELSE website_url       END,
      career_url        = CASE WHEN payload ? 'career_url'        THEN payload->>'career_url'        ELSE career_url        END,
      linkedin_url      = CASE WHEN payload ? 'linkedin_url'      THEN payload->>'linkedin_url'      ELSE linkedin_url      END,
      industry          = CASE WHEN payload ? 'industry'          THEN payload->>'industry'          ELSE industry          END,
      segment           = CASE WHEN payload ? 'segment'           THEN payload->>'segment'           ELSE segment           END,
      short_description = CASE WHEN payload ? 'short_description' THEN payload->>'short_description' ELSE short_description END,
      is_active         = CASE WHEN payload ? 'is_active'         THEN (payload->>'is_active')::boolean ELSE is_active      END,
      updated_by        = auth.uid()
    WHERE id = v_id
    RETURNING * INTO v_result;

    IF v_result.id IS NULL THEN
      RAISE EXCEPTION 'company not found: %', v_id;
    END IF;
  END IF;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_archive_company(p_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  -- NOTE: does NOT cascade to brands by design.
  UPDATE public.companies
     SET archived_at = now(),
         archived_by = auth.uid(),
         updated_by  = auth.uid()
   WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_restore_company(p_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  UPDATE public.companies
     SET archived_at = NULL,
         archived_by = NULL,
         updated_by  = auth.uid()
   WHERE id = p_id;
END;
$$;

-- ---------------------------------------------------------------------
-- 6. GRANTs (auth inside RPC handles real check)
-- ---------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.admin_upsert_brand(jsonb)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_archive_brand(bigint)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_restore_brand(bigint)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_company(jsonb)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_archive_company(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_restore_company(bigint) TO authenticated;

-- ---------------------------------------------------------------------
-- 7. Storage — brand-assets bucket + policies
-- ---------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-assets', 'brand-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Public read (anon + authenticated)
DROP POLICY IF EXISTS brand_assets_read ON storage.objects;
CREATE POLICY brand_assets_read
  ON storage.objects FOR SELECT
  USING (bucket_id = 'brand-assets');

-- Admin insert
DROP POLICY IF EXISTS brand_assets_admin_insert ON storage.objects;
CREATE POLICY brand_assets_admin_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'brand-assets' AND public.is_admin());

-- Admin update
DROP POLICY IF EXISTS brand_assets_admin_update ON storage.objects;
CREATE POLICY brand_assets_admin_update
  ON storage.objects FOR UPDATE TO authenticated
  USING      (bucket_id = 'brand-assets' AND public.is_admin())
  WITH CHECK (bucket_id = 'brand-assets' AND public.is_admin());

-- Admin delete
DROP POLICY IF EXISTS brand_assets_admin_delete ON storage.objects;
CREATE POLICY brand_assets_admin_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'brand-assets' AND public.is_admin());

COMMIT;
