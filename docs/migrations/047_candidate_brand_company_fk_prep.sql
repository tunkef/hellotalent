-- ═══════════════════════════════════════════════════════════════
-- HELLOTALENT — Migration 047: Candidate brand/company FK prep
-- Date: 2026-03-20
-- Type: SCHEMA — additive columns + indexes, no data changes
--
-- Purpose:
--   Add nullable company_id and brand_id FK columns to
--   candidate_experiences and candidate_brand_interests.
--   Text columns (sirket, marka) are preserved for backward
--   compatibility. New writes populate both text + id fields.
--   Old rows keep null ids until backfill (049).
--
-- Columns added:
--   candidate_experiences.company_id  → bigint FK companies(id)
--   candidate_experiences.brand_id    → bigint FK brands(id)
--   candidate_brand_interests.brand_id → bigint FK brands(id)
--
-- Safety:
--   - All columns nullable (no NOT NULL — old rows have no ids)
--   - IF NOT EXISTS for columns and indexes
--   - No data modification
--
-- Depends on: 046 (ensures brands.brand_name and companies.company_name exist)
-- ═══════════════════════════════════════════════════════════════

-- ── candidate_experiences: add company_id ────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'candidate_experiences'
      AND column_name = 'company_id'
  ) THEN
    ALTER TABLE candidate_experiences
      ADD COLUMN company_id bigint REFERENCES companies(id);
  END IF;
END;
$$;

-- ── candidate_experiences: add brand_id ──────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'candidate_experiences'
      AND column_name = 'brand_id'
  ) THEN
    ALTER TABLE candidate_experiences
      ADD COLUMN brand_id bigint REFERENCES brands(id);
  END IF;
END;
$$;

-- ── candidate_brand_interests: add brand_id ──────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'candidate_brand_interests'
      AND column_name = 'brand_id'
  ) THEN
    ALTER TABLE candidate_brand_interests
      ADD COLUMN brand_id bigint REFERENCES brands(id);
  END IF;
END;
$$;

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ce_company_id
  ON candidate_experiences(company_id)
  WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ce_brand_id
  ON candidate_experiences(brand_id)
  WHERE brand_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cbi_brand_id
  ON candidate_brand_interests(brand_id)
  WHERE brand_id IS NOT NULL;
