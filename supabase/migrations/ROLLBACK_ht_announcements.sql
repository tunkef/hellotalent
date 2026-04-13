-- K030 FAZ C ROLLBACK — ht_announcements
-- NOT auto-applied. Emergency use only.
-- Run manually via: supabase db query "$(cat ROLLBACK_ht_announcements.sql)" --linked

DROP TRIGGER IF EXISTS trg_ht_ann_like_count ON ht_announcement_likes;

DROP FUNCTION IF EXISTS get_announcements_feed(int, int);
DROP FUNCTION IF EXISTS toggle_announcement_like(uuid);
DROP FUNCTION IF EXISTS get_unread_announcement_count(timestamptz);
DROP FUNCTION IF EXISTS sync_ht_ann_like_count();

DROP POLICY IF EXISTS ht_ann_select_active ON ht_announcements;
DROP POLICY IF EXISTS ht_ann_insert_admin ON ht_announcements;
DROP POLICY IF EXISTS ht_ann_update_own ON ht_announcements;
DROP POLICY IF EXISTS ht_ann_delete_own ON ht_announcements;
DROP POLICY IF EXISTS ht_ann_media_select ON ht_announcement_media;
DROP POLICY IF EXISTS ht_ann_media_write_admin ON ht_announcement_media;
DROP POLICY IF EXISTS ht_ann_likes_select_own ON ht_announcement_likes;
DROP POLICY IF EXISTS ht_ann_likes_write_own ON ht_announcement_likes;

DROP TABLE IF EXISTS ht_announcement_likes CASCADE;
DROP TABLE IF EXISTS ht_announcement_media CASCADE;
DROP TABLE IF EXISTS ht_announcements CASCADE;
