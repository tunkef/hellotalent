-- FAZ 2A — Streak system DB foundation
-- Date: 2026-03-27
-- Type: DDL + RPC
-- Purpose: candidate_streaks table + update/read RPCs
-- Next: FAZ 2B will add freeze/earn-back RPCs and frontend display

-- ═══════════════════════════════════════════════
-- 1. TABLE — candidate_streaks
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS candidate_streaks (
  candidate_id bigint PRIMARY KEY REFERENCES candidates(id) ON DELETE CASCADE,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_activity_date date,
  streak_freezes_available integer NOT NULL DEFAULT 1,
  streak_frozen_today boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE candidate_streaks ADD CONSTRAINT cs_current_streak_gte0
  CHECK (current_streak >= 0);
ALTER TABLE candidate_streaks ADD CONSTRAINT cs_longest_streak_gte0
  CHECK (longest_streak >= 0);
ALTER TABLE candidate_streaks ADD CONSTRAINT cs_freezes_gte0
  CHECK (streak_freezes_available >= 0);

-- RLS
ALTER TABLE candidate_streaks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cs_select_own ON candidate_streaks;
CREATE POLICY cs_select_own ON candidate_streaks
  FOR SELECT TO authenticated
  USING (candidate_id = get_my_candidate_id());

DROP POLICY IF EXISTS cs_update_own ON candidate_streaks;
CREATE POLICY cs_update_own ON candidate_streaks
  FOR UPDATE TO authenticated
  USING (candidate_id = get_my_candidate_id())
  WITH CHECK (candidate_id = get_my_candidate_id());

-- No direct INSERT — rows created through RPC only
-- No employer access — no employer policy needed


-- ═══════════════════════════════════════════════
-- 2. RPC — update_candidate_streak()
-- ═══════════════════════════════════════════════
-- Called after any learning activity (practice question answered, module completed).
-- Logic:
--   • If already active today → no-op (return current state)
--   • If last activity was yesterday → current_streak + 1
--   • If last activity was older → reset to 1
--   • If no row exists → create with streak = 1
--   • longest_streak updated when current exceeds it
--   • streak_frozen_today reset to false on new day

CREATE OR REPLACE FUNCTION update_candidate_streak()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cid bigint;
  v_today date := CURRENT_DATE;
  v_row candidate_streaks%ROWTYPE;
  v_new_streak integer;
BEGIN
  -- Resolve candidate
  SELECT id INTO v_cid FROM candidates WHERE user_id = auth.uid();
  IF v_cid IS NULL THEN
    RETURN jsonb_build_object('error', 'no_candidate');
  END IF;

  -- Attempt to fetch existing row
  SELECT * INTO v_row FROM candidate_streaks WHERE candidate_id = v_cid FOR UPDATE;

  IF NOT FOUND THEN
    -- First ever activity — create row
    INSERT INTO candidate_streaks (candidate_id, current_streak, longest_streak, last_activity_date, updated_at)
    VALUES (v_cid, 1, 1, v_today, now());

    RETURN jsonb_build_object(
      'current_streak', 1,
      'longest_streak', 1,
      'last_activity_date', v_today,
      'streak_freezes_available', 1,
      'streak_frozen_today', false
    );
  END IF;

  -- Already active today — no-op
  IF v_row.last_activity_date = v_today THEN
    RETURN jsonb_build_object(
      'current_streak', v_row.current_streak,
      'longest_streak', v_row.longest_streak,
      'last_activity_date', v_row.last_activity_date,
      'streak_freezes_available', v_row.streak_freezes_available,
      'streak_frozen_today', v_row.streak_frozen_today
    );
  END IF;

  -- Calculate new streak
  IF v_row.last_activity_date = v_today - 1 THEN
    -- Consecutive day
    v_new_streak := v_row.current_streak + 1;
  ELSE
    -- Gap — reset
    v_new_streak := 1;
  END IF;

  UPDATE candidate_streaks SET
    current_streak = v_new_streak,
    longest_streak = GREATEST(v_row.longest_streak, v_new_streak),
    last_activity_date = v_today,
    streak_frozen_today = false,
    updated_at = now()
  WHERE candidate_id = v_cid;

  RETURN jsonb_build_object(
    'current_streak', v_new_streak,
    'longest_streak', GREATEST(v_row.longest_streak, v_new_streak),
    'last_activity_date', v_today,
    'streak_freezes_available', v_row.streak_freezes_available,
    'streak_frozen_today', false
  );
END;
$$;


-- ═══════════════════════════════════════════════
-- 3. RPC — get_my_streak_status()
-- ═══════════════════════════════════════════════
-- Returns current streak state for authenticated candidate.
-- If no row exists, returns zeroed defaults (no row creation).

CREATE OR REPLACE FUNCTION get_my_streak_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cid bigint;
  v_row candidate_streaks%ROWTYPE;
  v_today date := CURRENT_DATE;
  v_display_streak integer;
BEGIN
  SELECT id INTO v_cid FROM candidates WHERE user_id = auth.uid();
  IF v_cid IS NULL THEN
    RETURN jsonb_build_object('error', 'no_candidate');
  END IF;

  SELECT * INTO v_row FROM candidate_streaks WHERE candidate_id = v_cid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'current_streak', 0,
      'longest_streak', 0,
      'last_activity_date', NULL,
      'streak_freezes_available', 1,
      'streak_frozen_today', false,
      'streak_alive', false
    );
  END IF;

  -- Determine if streak is still alive
  -- Alive if: last activity was today or yesterday
  v_display_streak := v_row.current_streak;
  IF v_row.last_activity_date < v_today - 1 THEN
    -- Streak has lapsed (will reset on next activity)
    v_display_streak := 0;
  END IF;

  RETURN jsonb_build_object(
    'current_streak', v_display_streak,
    'longest_streak', v_row.longest_streak,
    'last_activity_date', v_row.last_activity_date,
    'streak_freezes_available', v_row.streak_freezes_available,
    'streak_frozen_today', v_row.streak_frozen_today,
    'streak_alive', (v_row.last_activity_date >= v_today - 1)
  );
END;
$$;


-- ═══════════════════════════════════════════════
-- 4. GRANTS
-- ═══════════════════════════════════════════════

GRANT SELECT, UPDATE ON candidate_streaks TO authenticated;
GRANT EXECUTE ON FUNCTION update_candidate_streak() TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_streak_status() TO authenticated;
