-- =====================================================================
-- FAZ C — Firsatlar campaign_type genisletme (store_opening + brand_story)
-- =====================================================================
-- Purpose:
--   Adds two new `campaign_type` enum values so Fırsatlar panel can
--   surface store-opening announcements and brand-story cards that
--   aren't offers or generic employer_branding. Tuna karari:
--     - "ABC markası ABC şehrinde yeni mağaza açıyor" → store_opening
--     - "Markayı takip et, eşlemelerde öne çık" → brand_story
--
-- What this does:
--   1. ALTER TYPE campaign_type ADD VALUE 'store_opening' (IF NOT EXISTS)
--   2. ALTER TYPE campaign_type ADD VALUE 'brand_story'   (IF NOT EXISTS)
--
-- Backward compat:
--   - Existing 'offer', 'employer_branding', 'hiring_boost' values
--     untouched. No data migration required.
--   - Candidate-side profil-firsatlar.js will surface new types via
--     TYPE_META + ALLOWED_TYPES update.
--   - Employer-side ik-kampanya.js wizard will expose new cards, drop
--     'hiring_boost' from selection UI (iş ilanı yasak — Tuna karari).
--     Existing 'hiring_boost' campaigns remain visible to admins for
--     review/archive; no forced migration.
--
-- Idempotency:
--   - IF NOT EXISTS guards on ALTER TYPE ADD VALUE (PG 14+).
--
-- Rollback:
--   - PostgreSQL does not support removing enum values while they are
--     referenced. If rollback needed: recreate enum + migrate rows.
--     Deliberately not scripted — out of MVP scope.
-- =====================================================================

BEGIN;

ALTER TYPE public.campaign_type ADD VALUE IF NOT EXISTS 'store_opening';
ALTER TYPE public.campaign_type ADD VALUE IF NOT EXISTS 'brand_story';

COMMIT;
