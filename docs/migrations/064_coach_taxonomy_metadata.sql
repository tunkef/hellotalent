-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 064 — Coach Taxonomy & Metadata Cleanup
-- Date: 2026-03-22
-- Type: SCHEMA (additive columns, constraint update, safe data migration)
-- Purpose:
--   A. Expand category taxonomy (4 → 6 categories)
--   B. Map old category values to new equivalents
--   C. Add author metadata columns to coach_profiles
--   D. Remove related_competency_code exposure (column stays for backward compat)
-- Dependencies: 058 (coach_system)
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- A. CATEGORY TAXONOMY REFRESH
-- Old: mulakat_ipucu, yetkinlik_rehberi, kariyer_hikaye, sektor_analiz
-- New: mulakat_ipucu, yetkinlik_rehberi, kariyer_gelisim_onerileri,
--      performans, kariyer_hikayesi, sektor_analizi
-- Mapping:
--   kariyer_hikaye → kariyer_hikayesi (typo fix, singular→plural-i)
--   sektor_analiz  → sektor_analizi  (typo fix, add -i suffix)
-- ═══════════════════════════════════════════════════════════════════════════

-- Step 1: Map old values to new equivalents (safe for existing rows)
UPDATE coach_posts SET category = 'kariyer_hikayesi' WHERE category = 'kariyer_hikaye';
UPDATE coach_posts SET category = 'sektor_analizi'   WHERE category = 'sektor_analiz';

-- Step 2: Drop old CHECK constraint and add new expanded one
ALTER TABLE coach_posts DROP CONSTRAINT IF EXISTS coach_posts_category_check;
ALTER TABLE coach_posts ADD CONSTRAINT coach_posts_category_check
  CHECK (category IN (
    'mulakat_ipucu',
    'yetkinlik_rehberi',
    'kariyer_gelisim_onerileri',
    'performans',
    'kariyer_hikayesi',
    'sektor_analizi'
  ));


-- ═══════════════════════════════════════════════════════════════════════════
-- B. COACH PROFILES — AUTHOR METADATA
-- Additive columns for author signature block
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE coach_profiles ADD COLUMN IF NOT EXISTS bio_short text;
ALTER TABLE coach_profiles ADD COLUMN IF NOT EXISTS sector_background text;
ALTER TABLE coach_profiles ADD COLUMN IF NOT EXISTS experience_years integer;


-- ═══════════════════════════════════════════════════════════════════════════
-- C. NOTES
-- - related_competency_code column remains in coach_posts for backward compat
--   but UI will no longer expose it to authors
-- - related_role stays as free text in DB (no FK constraint) because role keys
--   are Turkish display strings from ROLE_COMP_MAP, not a DB lookup table
-- - New categories are immediately usable by coaches and admin
-- ═══════════════════════════════════════════════════════════════════════════
