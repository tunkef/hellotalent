-- FAZ 2C — Streak freeze + recovery mechanics
-- Date: 2026-03-28
-- Type: DDL + RPC (CREATE OR REPLACE)
-- Purpose: Add freeze consume + recovery logic to existing streak system
-- Depends on: 20260327020000_streak_foundation.sql

-- ═══════════════════════════════════════════════
-- 1. COLUMN — last_broken_streak
-- ═══════════════════════════════════════════════
-- Stores the streak value before it was broken.
-- Used for recovery: if user practices within 2 days of breaking,
-- they can recover their old streak instead of starting from 1.

ALTER TABLE candidate_streaks
  ADD COLUMN IF NOT EXISTS last_broken_streak integer NOT NULL DEFAULT 0;

ALTER TABLE candidate_streaks
  ADD CONSTRAINT cs_last_broken_gte0 CHECK (last_broken_streak >= 0);


-- ═══════════════════════════════════════════════
-- 2. RPC — update_candidate_streak() (REPLACE)
-- ═══════════════════════════════════════════════
-- Enhanced logic:
--   1. Today already active → no-op
--   2. Yesterday → consecutive +1 (normal)
--   3. Gap = 2 days (day before yesterday) + freeze available → consume freeze, streak preserved
--   4. Gap = 2 days + no freeze → break streak, save last_broken_streak, reset to 1
--   5. Gap > 2 days → hard break, reset to 1, clear last_broken_streak
--   6. Recovery: if last_broken_streak > 0 and gap ≤ 2 days → recover old streak
--      (recovery happens on the FIRST activity after a break, consuming last_broken_streak)

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
  v_gap integer;
  v_frozen boolean := false;
  v_recovered boolean := false;
BEGIN
  SELECT id INTO v_cid FROM candidates WHERE user_id = auth.uid();
  IF v_cid IS NULL THEN
    RETURN jsonb_build_object('error', 'no_candidate');
  END IF;

  SELECT * INTO v_row FROM candidate_streaks WHERE candidate_id = v_cid FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO candidate_streaks (candidate_id, current_streak, longest_streak, last_activity_date, updated_at)
    VALUES (v_cid, 1, 1, v_today, now());
    RETURN jsonb_build_object(
      'current_streak', 1, 'longest_streak', 1,
      'last_activity_date', v_today,
      'streak_freezes_available', 1,
      'streak_frozen_today', false,
      'last_broken_streak', 0,
      'frozen', false, 'recovered', false
    );
  END IF;

  -- Already active today
  IF v_row.last_activity_date = v_today THEN
    RETURN jsonb_build_object(
      'current_streak', v_row.current_streak,
      'longest_streak', v_row.longest_streak,
      'last_activity_date', v_row.last_activity_date,
      'streak_freezes_available', v_row.streak_freezes_available,
      'streak_frozen_today', v_row.streak_frozen_today,
      'last_broken_streak', v_row.last_broken_streak,
      'frozen', false, 'recovered', false
    );
  END IF;

  v_gap := v_today - v_row.last_activity_date;

  IF v_gap = 1 THEN
    -- Consecutive day — normal increment
    v_new_streak := v_row.current_streak + 1;

  ELSIF v_gap = 2 THEN
    -- Missed exactly 1 day
    IF v_row.streak_freezes_available > 0 AND v_row.current_streak > 0 THEN
      -- Auto-freeze: consume 1 freeze, preserve streak
      v_new_streak := v_row.current_streak + 1;
      v_frozen := true;
    ELSIF v_row.last_broken_streak > 0 THEN
      -- Recovery: restore old streak (one-time)
      v_new_streak := v_row.last_broken_streak + 1;
      v_recovered := true;
    ELSE
      -- Break: save current streak, reset
      v_new_streak := 1;
    END IF;

  ELSE
    -- Gap > 2 days — hard break, no recovery possible
    v_new_streak := 1;
  END IF;

  UPDATE candidate_streaks SET
    current_streak = v_new_streak,
    longest_streak = GREATEST(v_row.longest_streak, v_new_streak),
    last_activity_date = v_today,
    streak_frozen_today = v_frozen,
    streak_freezes_available = CASE
      WHEN v_frozen THEN v_row.streak_freezes_available - 1
      ELSE v_row.streak_freezes_available
    END,
    last_broken_streak = CASE
      WHEN v_gap = 2 AND NOT v_frozen AND NOT v_recovered AND v_row.current_streak > 0
        THEN v_row.current_streak  -- save broken streak for future recovery
      WHEN v_recovered THEN 0      -- consumed recovery
      WHEN v_gap > 2 THEN 0        -- too late for recovery
      ELSE v_row.last_broken_streak -- preserve existing
    END,
    updated_at = now()
  WHERE candidate_id = v_cid;

  RETURN jsonb_build_object(
    'current_streak', v_new_streak,
    'longest_streak', GREATEST(v_row.longest_streak, v_new_streak),
    'last_activity_date', v_today,
    'streak_freezes_available', CASE
      WHEN v_frozen THEN v_row.streak_freezes_available - 1
      ELSE v_row.streak_freezes_available
    END,
    'streak_frozen_today', v_frozen,
    'last_broken_streak', CASE
      WHEN v_recovered THEN 0
      WHEN v_gap > 2 THEN 0
      ELSE v_row.last_broken_streak
    END,
    'frozen', v_frozen,
    'recovered', v_recovered
  );
END;
$$;


-- ═══════════════════════════════════════════════
-- 3. RPC — get_my_streak_status() (REPLACE)
-- ═══════════════════════════════════════════════
-- Enhanced: returns can_freeze, can_recover, last_broken_streak

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
  v_gap integer;
  v_can_freeze boolean := false;
  v_can_recover boolean := false;
BEGIN
  SELECT id INTO v_cid FROM candidates WHERE user_id = auth.uid();
  IF v_cid IS NULL THEN
    RETURN jsonb_build_object('error', 'no_candidate');
  END IF;

  SELECT * INTO v_row FROM candidate_streaks WHERE candidate_id = v_cid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'current_streak', 0, 'longest_streak', 0,
      'last_activity_date', NULL,
      'streak_freezes_available', 1,
      'streak_frozen_today', false,
      'streak_alive', false,
      'can_freeze', false,
      'can_recover', false,
      'last_broken_streak', 0
    );
  END IF;

  v_gap := CASE
    WHEN v_row.last_activity_date IS NULL THEN 999
    ELSE v_today - v_row.last_activity_date
  END;

  v_display_streak := v_row.current_streak;

  IF v_gap > 1 THEN
    -- Streak has lapsed
    v_display_streak := 0;
    IF v_gap = 2 THEN
      -- Missed exactly 1 day — freeze or recovery may be possible
      v_can_freeze := (v_row.streak_freezes_available > 0 AND v_row.current_streak > 0);
      v_can_recover := (NOT v_can_freeze AND v_row.last_broken_streak > 0);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'current_streak', v_display_streak,
    'longest_streak', v_row.longest_streak,
    'last_activity_date', v_row.last_activity_date,
    'streak_freezes_available', v_row.streak_freezes_available,
    'streak_frozen_today', v_row.streak_frozen_today,
    'streak_alive', (v_gap <= 1),
    'can_freeze', v_can_freeze,
    'can_recover', v_can_recover,
    'last_broken_streak', v_row.last_broken_streak
  );
END;
$$;


-- ═══════════════════════════════════════════════
-- 4. GRANTS (idempotent)
-- ═══════════════════════════════════════════════
GRANT SELECT, UPDATE ON candidate_streaks TO authenticated;
GRANT EXECUTE ON FUNCTION update_candidate_streak() TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_streak_status() TO authenticated;
