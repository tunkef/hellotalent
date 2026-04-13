-- K030 FAZ C: HelloTalent'ten Bilgiler (Duyurular) feed
-- Tables: ht_announcements, ht_announcement_media, ht_announcement_likes
-- RPCs: get_announcements_feed, toggle_announcement_like, get_unread_announcement_count
-- RLS: admin insert/update/delete own, authenticated select active, candidate own likes
-- Helpers used: is_admin() (existing, docs/migrations/014), get_my_candidate_id() (existing)
-- Storage: cvs bucket, announcements/ prefix — policies applied via Supabase dashboard post-merge.

-- ============================================================
-- Tables
-- ============================================================
CREATE TABLE IF NOT EXISTS ht_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  body_md text NOT NULL CHECK (length(body_md) BETWEEN 1 AND 8000),
  category text CHECK (category IN ('feature','sirket','ipucu','genel')),
  cta_url text,
  cta_label text,
  pinned_until timestamptz,
  published_at timestamptz DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  like_count int NOT NULL DEFAULT 0 CHECK (like_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ht_ann_feed
  ON ht_announcements (pinned_until DESC NULLS LAST, published_at DESC)
  WHERE is_active = true;

CREATE TABLE IF NOT EXISTS ht_announcement_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES ht_announcements(id) ON DELETE CASCADE,
  media_type text NOT NULL CHECK (media_type IN ('image','video','link')),
  storage_path text,
  external_url text,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (media_type IN ('image','video') AND storage_path IS NOT NULL AND external_url IS NULL) OR
    (media_type = 'link' AND external_url IS NOT NULL AND storage_path IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_ht_ann_media_parent
  ON ht_announcement_media(announcement_id, order_index);

CREATE TABLE IF NOT EXISTS ht_announcement_likes (
  announcement_id uuid NOT NULL REFERENCES ht_announcements(id) ON DELETE CASCADE,
  candidate_id bigint NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (announcement_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_ht_ann_likes_candidate
  ON ht_announcement_likes(candidate_id);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE ht_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ht_announcement_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE ht_announcement_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ht_ann_select_active ON ht_announcements;
CREATE POLICY ht_ann_select_active ON ht_announcements
  FOR SELECT TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS ht_ann_insert_admin ON ht_announcements;
CREATE POLICY ht_ann_insert_admin ON ht_announcements
  FOR INSERT TO authenticated
  WITH CHECK (is_admin() AND admin_id = auth.uid());

DROP POLICY IF EXISTS ht_ann_update_own ON ht_announcements;
CREATE POLICY ht_ann_update_own ON ht_announcements
  FOR UPDATE TO authenticated
  USING (is_admin() AND admin_id = auth.uid())
  WITH CHECK (is_admin() AND admin_id = auth.uid());

DROP POLICY IF EXISTS ht_ann_delete_own ON ht_announcements;
CREATE POLICY ht_ann_delete_own ON ht_announcements
  FOR DELETE TO authenticated
  USING (is_admin() AND admin_id = auth.uid());

DROP POLICY IF EXISTS ht_ann_media_select ON ht_announcement_media;
CREATE POLICY ht_ann_media_select ON ht_announcement_media
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM ht_announcements a
    WHERE a.id = announcement_id AND a.is_active = true
  ));

DROP POLICY IF EXISTS ht_ann_media_write_admin ON ht_announcement_media;
CREATE POLICY ht_ann_media_write_admin ON ht_announcement_media
  FOR ALL TO authenticated
  USING (is_admin() AND EXISTS (
    SELECT 1 FROM ht_announcements a
    WHERE a.id = announcement_id AND a.admin_id = auth.uid()
  ))
  WITH CHECK (is_admin() AND EXISTS (
    SELECT 1 FROM ht_announcements a
    WHERE a.id = announcement_id AND a.admin_id = auth.uid()
  ));

DROP POLICY IF EXISTS ht_ann_likes_select_own ON ht_announcement_likes;
CREATE POLICY ht_ann_likes_select_own ON ht_announcement_likes
  FOR SELECT TO authenticated
  USING (candidate_id = get_my_candidate_id());

DROP POLICY IF EXISTS ht_ann_likes_write_own ON ht_announcement_likes;
CREATE POLICY ht_ann_likes_write_own ON ht_announcement_likes
  FOR ALL TO authenticated
  USING (candidate_id = get_my_candidate_id())
  WITH CHECK (candidate_id = get_my_candidate_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON ht_announcements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ht_announcement_media TO authenticated;
GRANT SELECT, INSERT, DELETE ON ht_announcement_likes TO authenticated;

-- ============================================================
-- Trigger: sync like_count
-- ============================================================
CREATE OR REPLACE FUNCTION sync_ht_ann_like_count()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE ht_announcements
      SET like_count = like_count + 1
      WHERE id = NEW.announcement_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE ht_announcements
      SET like_count = greatest(like_count - 1, 0)
      WHERE id = OLD.announcement_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_ht_ann_like_count ON ht_announcement_likes;
CREATE TRIGGER trg_ht_ann_like_count
  AFTER INSERT OR DELETE ON ht_announcement_likes
  FOR EACH ROW EXECUTE FUNCTION sync_ht_ann_like_count();

-- ============================================================
-- RPCs
-- ============================================================
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
  liked_by_me boolean,
  media jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id, a.title, a.body_md, a.category, a.cta_url, a.cta_label,
    a.published_at, a.pinned_until, a.like_count,
    EXISTS (
      SELECT 1 FROM ht_announcement_likes l
      WHERE l.announcement_id = a.id AND l.candidate_id = get_my_candidate_id()
    ) AS liked_by_me,
    coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', m.id,
          'type', m.media_type,
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
  ORDER BY
    CASE WHEN a.pinned_until IS NOT NULL AND a.pinned_until > now() THEN 0 ELSE 1 END,
    a.pinned_until DESC NULLS LAST,
    a.published_at DESC
  LIMIT greatest(p_limit, 1)
  OFFSET greatest(p_offset, 0);
$$;

CREATE OR REPLACE FUNCTION toggle_announcement_like(p_announcement_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_candidate_id bigint := get_my_candidate_id();
  v_liked boolean;
BEGIN
  IF v_candidate_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM ht_announcement_likes
    WHERE announcement_id = p_announcement_id AND candidate_id = v_candidate_id
  ) INTO v_liked;

  IF v_liked THEN
    DELETE FROM ht_announcement_likes
    WHERE announcement_id = p_announcement_id AND candidate_id = v_candidate_id;
    RETURN false;
  ELSE
    INSERT INTO ht_announcement_likes (announcement_id, candidate_id)
    VALUES (p_announcement_id, v_candidate_id);
    RETURN true;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION get_unread_announcement_count(p_since timestamptz)
RETURNS int
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::int FROM ht_announcements
  WHERE is_active = true
    AND published_at > coalesce(p_since, 'epoch'::timestamptz);
$$;

GRANT EXECUTE ON FUNCTION get_announcements_feed(int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_announcement_like(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_announcement_count(timestamptz) TO authenticated;
