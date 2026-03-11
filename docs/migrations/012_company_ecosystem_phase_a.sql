-- ═══════════════════════════════════════════════════════════════
-- HELLOTALENT — Migration 012: Company Ecosystem — Phase A
-- Date: 2026-03-11
-- Type: SCHEMA — new tables, RLS, trigger
--
-- Purpose:
--   Creates the foundational company/brand tables and candidate
--   follow relationship. This is the minimum slice needed to
--   power the "Şirketler" sidebar panel in the candidate dashboard.
--
-- Tables created:
--   1. companies        — central company registry
--   2. brands           — brand names belonging to companies
--   3. candidate_company_follows — candidate ↔ company follow
--
-- Not included (deferred to Phase B):
--   - company_updates
--   - company_locations
--   - Seed data (separate file: 012a_company_seed.sql)
--
-- Idempotency:
--   - CREATE TABLE IF NOT EXISTS for tables
--   - CREATE OR REPLACE for functions
--   - DROP ... IF EXISTS before triggers and policies
--   - DO $$ blocks for constraints and indexes
--
-- Depends on: 001 (candidates table + get_my_candidate_id)
-- ═══════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════
-- 1. COMPANIES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS companies (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name                text NOT NULL,
  slug                text NOT NULL,
  logo_url            text,
  website             text,
  description         text,
  sector              text,
  employee_count_range text,
  headquarters_city   text,
  career_page_url     text,
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Unique slug (idempotent via DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'companies'::regclass
      AND conname = 'companies_slug_key'
  ) THEN
    ALTER TABLE companies ADD CONSTRAINT companies_slug_key UNIQUE (slug);
  END IF;
END
$$;

-- updated_at trigger (same pattern as migration 005)
CREATE OR REPLACE FUNCTION set_companies_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_companies_updated_at ON companies;
CREATE TRIGGER trg_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION set_companies_updated_at();


-- ═══════════════════════════════════════════════════════════════
-- 2. BRANDS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS brands (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id  bigint NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        text NOT NULL,
  slug        text NOT NULL,
  logo_url    text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Unique slug (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'brands'::regclass
      AND conname = 'brands_slug_key'
  ) THEN
    ALTER TABLE brands ADD CONSTRAINT brands_slug_key UNIQUE (slug);
  END IF;
END
$$;

-- Index for the most common query: list brands by company
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'brands'
      AND indexname = 'idx_brands_company_id'
  ) THEN
    CREATE INDEX idx_brands_company_id ON brands(company_id);
  END IF;
END
$$;


-- ═══════════════════════════════════════════════════════════════
-- 3. CANDIDATE_COMPANY_FOLLOWS
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS candidate_company_follows (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  candidate_id  bigint NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  company_id    bigint NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Unique: one follow per candidate per company (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'candidate_company_follows'::regclass
      AND conname = 'candidate_company_follows_unique'
  ) THEN
    ALTER TABLE candidate_company_follows
      ADD CONSTRAINT candidate_company_follows_unique
      UNIQUE (candidate_id, company_id);
  END IF;
END
$$;

-- Index for "which companies does this candidate follow?"
-- The unique constraint above creates an index on (candidate_id, company_id),
-- which covers this query. No additional index needed.


-- ═══════════════════════════════════════════════════════════════
-- 4. RLS — COMPANIES
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read active companies.
-- No INSERT/UPDATE/DELETE for any user via RLS (admin uses service role).
DROP POLICY IF EXISTS companies_select ON companies;
CREATE POLICY companies_select ON companies FOR SELECT
  USING (is_active = true);


-- ═══════════════════════════════════════════════════════════════
-- 5. RLS — BRANDS
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read active brands.
DROP POLICY IF EXISTS brands_select ON brands;
CREATE POLICY brands_select ON brands FOR SELECT
  USING (is_active = true);


-- ═══════════════════════════════════════════════════════════════
-- 6. RLS — CANDIDATE_COMPANY_FOLLOWS
-- ═══════════════════════════════════════════════════════════════
-- Uses get_my_candidate_id() from migration 001 — same pattern
-- as all other candidate child tables.

ALTER TABLE candidate_company_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS follows_select ON candidate_company_follows;
CREATE POLICY follows_select ON candidate_company_follows FOR SELECT
  USING (candidate_id = get_my_candidate_id());

DROP POLICY IF EXISTS follows_insert ON candidate_company_follows;
CREATE POLICY follows_insert ON candidate_company_follows FOR INSERT
  WITH CHECK (candidate_id = get_my_candidate_id());

DROP POLICY IF EXISTS follows_delete ON candidate_company_follows;
CREATE POLICY follows_delete ON candidate_company_follows FOR DELETE
  USING (candidate_id = get_my_candidate_id());

-- No UPDATE policy — follows are insert/delete only (toggle).


-- ═══════════════════════════════════════════════════════════════
-- WHAT THIS MIGRATION DOES NOT DO (intentionally deferred):
--
--   - No company_updates table (Phase B — needs content first)
--   - No company_locations table (Phase B — needs data enrichment)
--   - No seed data (separate file: 012a_company_seed.sql)
--   - No employer write access to companies/brands
--   - No employer claim or ownership tables
--   - No anon/public access (all policies require authentication)
--
-- Next: 012a_company_seed.sql populates companies + brands from
--       the BRAND_DB dataset. Then UI wiring in profil.html.
-- ═══════════════════════════════════════════════════════════════
