-- ═══════════════════════════════════════════════════════════════
-- HELLOTALENT — Migration 046: Brands column name reconciliation
-- Date: 2026-03-20
-- Type: RECONCILIATION — aligns migration-created schemas with production
--
-- Problem:
--   Migration 012 creates brands with `name text NOT NULL`.
--   Production has `brand_name text NOT NULL` (renamed at some point
--   after 012, but the rename was never repo-tracked).
--   Code (045 RPC, ik.html, profil.html) now references `brand_name`.
--   Running 012 from scratch would create `name`, breaking all code.
--
-- Fix:
--   Idempotent rename: if `name` exists, rename to `brand_name`.
--   If `brand_name` already exists, no-op.
--   If both exist (unlikely), raise a notice and skip.
--
-- Also reconciles companies.name → companies.company_name
--   (same drift pattern from migration 012).
--
-- Safety:
--   - No data loss: ALTER TABLE RENAME COLUMN preserves all data
--   - No index/FK breakage: PostgreSQL auto-updates dependent objects
--   - Idempotent: safe to run multiple times
--   - Non-destructive: never DROP column
--
-- Depends on: 012_company_ecosystem_phase_a.sql
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_has_name       boolean;
  v_has_brand_name boolean;
BEGIN
  -- ── brands: name → brand_name ──────────────────────────────
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'brands' AND column_name = 'name'
  ) INTO v_has_name;

  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'brands' AND column_name = 'brand_name'
  ) INTO v_has_brand_name;

  IF v_has_name AND NOT v_has_brand_name THEN
    -- Fresh install from 012: rename name → brand_name
    ALTER TABLE brands RENAME COLUMN name TO brand_name;
    RAISE NOTICE '046: brands.name renamed to brands.brand_name';
  ELSIF v_has_brand_name AND NOT v_has_name THEN
    -- Production state: already brand_name, nothing to do
    RAISE NOTICE '046: brands.brand_name already exists — no-op';
  ELSIF v_has_name AND v_has_brand_name THEN
    -- Both exist (unexpected): flag for manual review, do not touch
    RAISE WARNING '046: brands has BOTH name AND brand_name columns — manual review needed';
  ELSE
    RAISE WARNING '046: brands has NEITHER name NOR brand_name — table may not exist yet';
  END IF;

  -- ── companies: name → company_name ─────────────────────────
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'name'
  ) INTO v_has_name;

  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'company_name'
  ) INTO v_has_brand_name;

  IF v_has_name AND NOT v_has_brand_name THEN
    ALTER TABLE companies RENAME COLUMN name TO company_name;
    RAISE NOTICE '046: companies.name renamed to companies.company_name';
  ELSIF v_has_brand_name AND NOT v_has_name THEN
    RAISE NOTICE '046: companies.company_name already exists — no-op';
  ELSIF v_has_name AND v_has_brand_name THEN
    RAISE WARNING '046: companies has BOTH name AND company_name columns — manual review needed';
  ELSE
    RAISE WARNING '046: companies has NEITHER name NOR company_name — table may not exist yet';
  END IF;
END;
$$;
