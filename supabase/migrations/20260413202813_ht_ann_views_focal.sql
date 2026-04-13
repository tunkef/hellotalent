-- K030 FAZ C extension: view analytics + image focal point control
-- Adds: ht_announcement_views table, view_count col, track_announcement_view RPC,
--       focal_x/focal_y on ht_announcement_media, updated get_announcements_feed RPC.
-- Helpers reused: get_my_candidate_id(), is_admin() — DO NOT REDEFINE.

-- ============================================================
-- Part 1: view analytics
-- ============================================================
ALTER TABLE ht_announcements
  ADD COLUMN IF NOT EXISTS view_count int NOT NULL DEFAULT 0
    CHECK (view_count >= 0);

CREATE TABLE IF NOT EXISTS ht_announcement_views (
  announcement_id uuid NOT NULL REFERENCES ht_announcements(id) ON DELETE CASCADE,
  candidate_id bigint NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (announcement_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_ht_ann_views_candidate
  ON ht_announcement_views(candidate_id);

ALTER TABLE ht_announcement_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ht_ann_views_select_own ON ht_announcement_views;
CREATE POLICY ht_ann_views_select_own ON ht_announcement_views
  FOR SELECT TO authenticated
  USING (candidate_id = get_my_candidate_id() OR is_admin());

DROP POLICY IF EXISTS ht_ann_views_insert_own ON ht_announcement_views;
CREATE POLICY ht_ann_views_insert_own ON ht_announcement_views
  FOR INSERT TO authenticated
  WITH CHECK (candidate_id = get_my_candidate_id());

GRANT SELECT, INSERT ON ht_announcement_views TO authenticated;

-- Trigger: on INSERT, increment view_count
CREATE OR REPLACE FUNCTION sync_ht_ann_view_count()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE ht_announcements
      SET view_count = view_count + 1
      WHERE id = NEW.announcement_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_ht_ann_view_count ON ht_announcement_views;
CREATE TRIGGER trg_ht_ann_view_count
  AFTER INSERT ON ht_announcement_views
  FOR EACH ROW EXECUTE FUNCTION sync_ht_ann_view_count();

-- RPC: idempotent view tracking
CREATE OR REPLACE FUNCTION track_announcement_view(p_announcement_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_candidate_id bigint := get_my_candidate_id();
  v_inserted boolean := false;
BEGIN
  IF v_candidate_id IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO ht_announcement_views (announcement_id, candidate_id)
  VALUES (p_announcement_id, v_candidate_id)
  ON CONFLICT (announcement_id, candidate_id) DO NOTHING
  RETURNING true INTO v_inserted;

  RETURN coalesce(v_inserted, false);
END;
$$;

GRANT EXECUTE ON FUNCTION track_announcement_view(uuid) TO authenticated;

-- ============================================================
-- Part 2: focal point control (for portrait image cropping)
-- ============================================================
ALTER TABLE ht_announcement_media
  ADD COLUMN IF NOT EXISTS focal_x numeric(4,3) NOT NULL DEFAULT 0.5
    CHECK (focal_x BETWEEN 0 AND 1),
  ADD COLUMN IF NOT EXISTS focal_y numeric(4,3) NOT NULL DEFAULT 0.5
    CHECK (focal_y BETWEEN 0 AND 1);

-- ============================================================
-- Update get_announcements_feed: include view_count + focal_x/focal_y
-- Must DROP first because RETURNS TABLE signature changes (new column).
-- ============================================================
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
    a.id, a.title, a.body_md, a.category, a.cta_url, a.cta_label,
    a.published_at, a.pinned_until, a.like_count, a.view_count,
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
