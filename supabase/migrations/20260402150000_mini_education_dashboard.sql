-- Aşama 58 — Mini Eğitim Dashboard RPC
-- Date: 2026-04-02
-- Type: RPC
-- Purpose:
--   1. get_mini_education_dashboard() — aggregates all learning stats in one call
--      Returns: practice_total, streak_current, streak_longest, journal_count,
--               badge_count, badge_gallery (all defs + earned flag)
--   Caller: profil-genel.js Mini Eğitim Dashboard bento card

-- ═══════════════════════════════════════════════
-- 1. RPC — get_mini_education_dashboard()
-- Returns a single JSON object with all learning progress stats.
-- Used by the Genel panel's Mini Eğitim Dashboard card.
-- STABLE: read-only, no side effects.
-- ═══════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_mini_education_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cid bigint;
  v_practice_total int;
  v_streak_current int;
  v_streak_longest int;
  v_journal_count int;
  v_earned_ids bigint[];
  v_badge_gallery jsonb;
BEGIN
  SELECT id INTO v_cid FROM candidates WHERE user_id = auth.uid();
  IF v_cid IS NULL THEN
    RETURN jsonb_build_object('error', 'no_candidate');
  END IF;

  -- Practice total: sum of all practice counts across competencies
  SELECT COALESCE(SUM(practice_count), 0) INTO v_practice_total
  FROM candidate_yetenek_progress WHERE candidate_id = v_cid;

  -- Streak stats (default to 0 if no row yet)
  SELECT
    COALESCE(current_streak, 0),
    COALESCE(longest_streak, 0)
  INTO v_streak_current, v_streak_longest
  FROM candidate_streaks WHERE candidate_id = v_cid;

  v_streak_current := COALESCE(v_streak_current, 0);
  v_streak_longest := COALESCE(v_streak_longest, 0);

  -- Journal count
  SELECT COUNT(*) INTO v_journal_count
  FROM candidate_studio_journals WHERE candidate_id = v_cid;

  -- Earned badge IDs for this candidate
  SELECT ARRAY_AGG(badge_id) INTO v_earned_ids
  FROM candidate_badges WHERE candidate_id = v_cid;

  -- Badge gallery: all active definitions + earned flag per badge
  SELECT jsonb_agg(
    jsonb_build_object(
      'id',          bd.id,
      'slug',        bd.slug,
      'title',       bd.title,
      'description', bd.description,
      'icon_key',    bd.icon_key,
      'badge_tier',  bd.badge_tier,
      'earned',      (v_earned_ids IS NOT NULL AND bd.id = ANY(v_earned_ids)),
      'sort_order',  bd.sort_order
    ) ORDER BY bd.sort_order
  ) INTO v_badge_gallery
  FROM badge_definitions bd
  WHERE bd.status = 'active';

  RETURN jsonb_build_object(
    'practice_total',  v_practice_total,
    'streak_current',  v_streak_current,
    'streak_longest',  v_streak_longest,
    'journal_count',   v_journal_count,
    'badge_count',     COALESCE(array_length(v_earned_ids, 1), 0),
    'badge_gallery',   COALESCE(v_badge_gallery, '[]'::jsonb)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION get_mini_education_dashboard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_mini_education_dashboard() TO authenticated;
