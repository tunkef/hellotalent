-- =====================================================================
-- FAZ D — Admin fırsat via duyuru composer
-- =====================================================================
-- Purpose:
--   Admin can publish fırsat (campaign-like) content through the
--   existing duyuru composer instead of a separate wizard. This adds
--   an optional campaign_type column to ht_announcements; when set,
--   panel-firsatlar renders the row alongside employer campaigns.
--   When null, the row stays a plain announcement.
--
--   Tuna karari 2026-04-17: "duyurular bolumune baglariz".
--
-- What this does:
--   1. ADD COLUMN campaign_type text NULLABLE on ht_announcements
--      with CHECK (4 allowed enum-style values or null).
--   2. UPDATE get_announcements_feed RPC to return campaign_type
--      (DROP + CREATE OR REPLACE — signature changes).
--
-- Idempotent: ADD COLUMN IF NOT EXISTS, CREATE OR REPLACE FUNCTION.
--
-- Rollback:
--   ALTER TABLE ht_announcements DROP COLUMN campaign_type;
--   Recreate get_announcements_feed from 20260413202813 signature.
-- =====================================================================

BEGIN;

-- 1. Schema
ALTER TABLE public.ht_announcements
  ADD COLUMN IF NOT EXISTS campaign_type text
    CHECK (campaign_type IS NULL OR campaign_type IN (
      'offer', 'employer_branding', 'store_opening', 'brand_story'
    ));

COMMENT ON COLUMN public.ht_announcements.campaign_type IS
  'FAZ D: when not null, the announcement is also surfaced in panel-firsatlar with the matching type badge. null = duyuru only.';

-- 2. Index for fırsat-side query (panel-firsatlar dual-source)
CREATE INDEX IF NOT EXISTS idx_ht_ann_campaign_type
  ON public.ht_announcements(campaign_type, published_at DESC)
  WHERE campaign_type IS NOT NULL AND is_active = true;

-- 3. Update get_announcements_feed RPC (return campaign_type in row)
DROP FUNCTION IF EXISTS get_announcements_feed(int, int);

CREATE OR REPLACE FUNCTION get_announcements_feed(
  p_limit int DEFAULT 10,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  title text,
  body_md text,
  category text,
  campaign_type text,
  cta_url text,
  cta_label text,
  published_at timestamptz,
  pinned_until timestamptz,
  like_count int,
  view_count int,
  liked_by_me boolean,
  media jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id, a.title, a.body_md, a.category, a.campaign_type,
    a.cta_url, a.cta_label, a.published_at, a.pinned_until,
    a.like_count, a.view_count,
    EXISTS (
      SELECT 1 FROM ht_announcement_likes l
      WHERE l.announcement_id = a.id AND l.candidate_id = get_my_candidate_id()
    ) AS liked_by_me,
    coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', m.id,
          'type', m.media_type,
          'media_type', m.media_type,
          'storage_path', m.storage_path,
          'external_url', m.external_url,
          'order_index', m.order_index,
          'focal_x', m.focal_x,
          'focal_y', m.focal_y
        ) ORDER BY m.order_index
      )
      FROM ht_announcement_media m
      WHERE m.announcement_id = a.id
    ), '[]'::jsonb) AS media
  FROM ht_announcements a
  WHERE a.is_active = true
  ORDER BY
    CASE WHEN a.pinned_until IS NOT NULL AND a.pinned_until > now() THEN 0 ELSE 1 END,
    a.pinned_until DESC NULLS LAST,
    a.published_at DESC
  LIMIT greatest(p_limit, 1)
  OFFSET greatest(p_offset, 0);
$$;

GRANT EXECUTE ON FUNCTION get_announcements_feed(int, int) TO authenticated;

-- 4. Convenience RPC for panel-firsatlar dual-source — surface only
--    announcements that are marked as fırsat (campaign_type not null).
--    Candidate filters by is_active=true via RLS on ht_announcements.
CREATE OR REPLACE FUNCTION get_firsat_announcements()
RETURNS TABLE (
  id uuid,
  title text,
  body_md text,
  campaign_type text,
  cta_url text,
  cta_label text,
  published_at timestamptz,
  media jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id, a.title, a.body_md, a.campaign_type,
    a.cta_url, a.cta_label, a.published_at,
    coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', m.id,
          'media_type', m.media_type,
          'storage_path', m.storage_path,
          'external_url', m.external_url,
          'order_index', m.order_index
        ) ORDER BY m.order_index
      )
      FROM ht_announcement_media m
      WHERE m.announcement_id = a.id
    ), '[]'::jsonb) AS media
  FROM ht_announcements a
  WHERE a.is_active = true
    AND a.campaign_type IS NOT NULL
  ORDER BY a.published_at DESC;
$$;

GRANT EXECUTE ON FUNCTION get_firsat_announcements() TO authenticated;

COMMIT;
