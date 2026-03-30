-- T10 — Badge Extension MVP
-- Date: 2026-03-30
-- Type: DDL ALTER + RPC + SEED
-- Purpose:
--   1. Expand badge_definitions rule_type + category CHECK constraints
--   2. Extend evaluate_candidate_badges() with 3 new rule branches
--   3. Seed 9 new badges (practice milestones, streak milestones, journal writing)
--   4. Hook badge evaluation into practice/streak/journal RPCs

-- ═══════════════════════════════════════════════
-- 1. EXPAND CHECK CONSTRAINTS
-- ═══════════════════════════════════════════════

-- Add new rule_types: practice_total, streak_longest, journal_count
ALTER TABLE badge_definitions DROP CONSTRAINT badge_definitions_rule_type_check;
ALTER TABLE badge_definitions ADD CONSTRAINT badge_definitions_rule_type_check
  CHECK (rule_type IN (
    'module_complete_count', 'section_complete', 'total_complete_count',
    'practice_total', 'streak_longest', 'journal_count'
  ));


-- ═══════════════════════════════════════════════
-- 2. SEED 9 NEW BADGE DEFINITIONS
-- ═══════════════════════════════════════════════

INSERT INTO badge_definitions (slug, title, description, category, icon_key, badge_tier, rule_type, rule_config, sort_order)
VALUES
  -- Practice milestones (yetenek category)
  ('pratik-5',
   '5 Pratik',
   'İlk 5 pratik seansını tamamladın. Düzenli çalışma alışkanlığın başlıyor.',
   'yetenek', 'medal', 'base',
   'practice_total', '{"min_count": 5}'::jsonb, 10),

  ('pratik-10',
   '10 Pratik',
   '10 pratik seansı! Düzenli çalışman fark yaratıyor.',
   'yetenek', 'medal', 'milestone',
   'practice_total', '{"min_count": 10}'::jsonb, 11),

  ('pratik-25',
   'Pratik Ustası',
   '25 pratik seansı — disiplinli çalışmanın meyvesi.',
   'yetenek', 'star', 'milestone',
   'practice_total', '{"min_count": 25}'::jsonb, 12),

  ('pratik-50',
   'Pratik Efsanesi',
   '50 pratik seansı! Azim ve kararlılığınla fark yaratıyorsun.',
   'yetenek', 'diamond', 'advanced',
   'practice_total', '{"min_count": 50}'::jsonb, 13),

  -- Streak milestones (studio category)
  ('seri-7',
   'Haftalık Seri',
   '7 gün üst üste pratik yaptın. Harika bir tempo!',
   'studio', 'flame', 'milestone',
   'streak_longest', '{"min_days": 7}'::jsonb, 20),

  ('seri-30',
   'Aylık Seri',
   '30 günlük kesintisiz seri! İnanılmaz disiplin.',
   'studio', 'flame', 'advanced',
   'streak_longest', '{"min_days": 30}'::jsonb, 21),

  -- Journal writing milestones (yetenek category)
  ('jurnal-ilk',
   'İlk Günlük',
   'İlk STAR+T günlüğünü yazdın. Deneyimlerini kaydetmeye başladın.',
   'yetenek', 'pen', 'base',
   'journal_count', '{"min_count": 1}'::jsonb, 30),

  ('jurnal-5',
   'Düzenli Kayıtçı',
   '5 STAR+T günlüğü yazdın. Deneyimlerini aktif olarak dokümante ediyorsun.',
   'yetenek', 'pen', 'milestone',
   'journal_count', '{"min_count": 5}'::jsonb, 31),

  ('jurnal-10',
   'Deneyim Yazarı',
   '10 STAR+T günlüğü! Mülakat hazırlığın çok güçlü.',
   'yetenek', 'pen', 'advanced',
   'journal_count', '{"min_count": 10}'::jsonb, 32)

ON CONFLICT (slug) DO NOTHING;


-- ═══════════════════════════════════════════════
-- 3. EXTENDED evaluate_candidate_badges()
-- Adds 3 new rule branches alongside the original 3.
-- Still idempotent: ON CONFLICT DO NOTHING.
-- ═══════════════════════════════════════════════

CREATE OR REPLACE FUNCTION evaluate_candidate_badges(p_candidate_id bigint)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_badge RECORD;
  v_awarded int := 0;
  v_count int;
  v_section_total int;
  v_section_completed int;
  v_streak int;
BEGIN
  FOR v_badge IN
    SELECT id, slug, rule_type, rule_config, category
    FROM badge_definitions
    WHERE status = 'active'
      AND id NOT IN (SELECT badge_id FROM candidate_badges WHERE candidate_id = p_candidate_id)
  LOOP

    -- ── module_complete_count: N modules in a specific section (or any) ──
    IF v_badge.rule_type = 'module_complete_count' THEN
      IF v_badge.rule_config ? 'section' THEN
        SELECT count(*) INTO v_count
        FROM candidate_studio_progress csp
        JOIN studio_modules sm ON sm.id = csp.module_id
        WHERE csp.candidate_id = p_candidate_id
          AND csp.status = 'completed'
          AND sm.section = v_badge.rule_config->>'section';
      ELSE
        SELECT count(*) INTO v_count
        FROM candidate_studio_progress
        WHERE candidate_id = p_candidate_id AND status = 'completed';
      END IF;

      IF v_count >= COALESCE((v_badge.rule_config->>'min_count')::int, 1) THEN
        INSERT INTO candidate_badges (candidate_id, badge_id, award_reason)
        VALUES (p_candidate_id, v_badge.id, v_badge.rule_type || ':' || v_count)
        ON CONFLICT (candidate_id, badge_id) DO NOTHING;
        v_awarded := v_awarded + 1;
      END IF;

    -- ── section_complete: all published modules in a section completed ──
    ELSIF v_badge.rule_type = 'section_complete' THEN
      SELECT count(*) INTO v_section_total
      FROM studio_modules
      WHERE section = v_badge.rule_config->>'section' AND status = 'published';

      IF v_section_total > 0 THEN
        SELECT count(*) INTO v_section_completed
        FROM candidate_studio_progress csp
        JOIN studio_modules sm ON sm.id = csp.module_id
        WHERE csp.candidate_id = p_candidate_id
          AND csp.status = 'completed'
          AND sm.section = v_badge.rule_config->>'section'
          AND sm.status = 'published';

        IF v_section_completed >= v_section_total THEN
          INSERT INTO candidate_badges (candidate_id, badge_id, award_reason)
          VALUES (p_candidate_id, v_badge.id, 'section_complete:' || (v_badge.rule_config->>'section') || ':' || v_section_completed || '/' || v_section_total)
          ON CONFLICT (candidate_id, badge_id) DO NOTHING;
          v_awarded := v_awarded + 1;
        END IF;
      END IF;

    -- ── total_complete_count: N modules completed regardless of section ──
    ELSIF v_badge.rule_type = 'total_complete_count' THEN
      SELECT count(*) INTO v_count
      FROM candidate_studio_progress
      WHERE candidate_id = p_candidate_id AND status = 'completed';

      IF v_count >= COALESCE((v_badge.rule_config->>'min_count')::int, 1) THEN
        INSERT INTO candidate_badges (candidate_id, badge_id, award_reason)
        VALUES (p_candidate_id, v_badge.id, 'total_complete:' || v_count)
        ON CONFLICT (candidate_id, badge_id) DO NOTHING;
        v_awarded := v_awarded + 1;
      END IF;

    -- ── NEW: practice_total: SUM(practice_count) from candidate_yetenek_progress ──
    ELSIF v_badge.rule_type = 'practice_total' THEN
      SELECT COALESCE(SUM(practice_count), 0) INTO v_count
      FROM candidate_yetenek_progress
      WHERE candidate_id = p_candidate_id;

      IF v_count >= COALESCE((v_badge.rule_config->>'min_count')::int, 1) THEN
        INSERT INTO candidate_badges (candidate_id, badge_id, award_reason)
        VALUES (p_candidate_id, v_badge.id, 'practice_total:' || v_count)
        ON CONFLICT (candidate_id, badge_id) DO NOTHING;
        v_awarded := v_awarded + 1;
      END IF;

    -- ── NEW: streak_longest: longest_streak from candidate_streaks ──
    ELSIF v_badge.rule_type = 'streak_longest' THEN
      SELECT COALESCE(longest_streak, 0) INTO v_streak
      FROM candidate_streaks
      WHERE candidate_id = p_candidate_id;

      IF v_streak >= COALESCE((v_badge.rule_config->>'min_days')::int, 7) THEN
        INSERT INTO candidate_badges (candidate_id, badge_id, award_reason)
        VALUES (p_candidate_id, v_badge.id, 'streak_longest:' || v_streak)
        ON CONFLICT (candidate_id, badge_id) DO NOTHING;
        v_awarded := v_awarded + 1;
      END IF;

    -- ── NEW: journal_count: COUNT of candidate_studio_journals ──
    ELSIF v_badge.rule_type = 'journal_count' THEN
      SELECT count(*) INTO v_count
      FROM candidate_studio_journals
      WHERE candidate_id = p_candidate_id;

      IF v_count >= COALESCE((v_badge.rule_config->>'min_count')::int, 1) THEN
        INSERT INTO candidate_badges (candidate_id, badge_id, award_reason)
        VALUES (p_candidate_id, v_badge.id, 'journal_count:' || v_count)
        ON CONFLICT (candidate_id, badge_id) DO NOTHING;
        v_awarded := v_awarded + 1;
      END IF;

    END IF;
  END LOOP;

  RETURN v_awarded;
END;
$$;

REVOKE EXECUTE ON FUNCTION evaluate_candidate_badges(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION evaluate_candidate_badges(bigint) TO authenticated;


-- ═══════════════════════════════════════════════
-- 4. HOOK badge evaluation into practice RPC
-- record_yetenek_practice already resolves candidate_id —
-- add evaluate call at the end.
-- ═══════════════════════════════════════════════

CREATE OR REPLACE FUNCTION record_yetenek_practice(
  p_role_key text,
  p_competency_code text,
  p_questions_answered int DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_candidate_id bigint;
BEGIN
  SELECT id INTO v_candidate_id FROM candidates WHERE user_id = auth.uid();
  IF v_candidate_id IS NULL THEN RETURN; END IF;

  INSERT INTO candidate_yetenek_progress (
    candidate_id, role_key, competency_code, status, practice_count, questions_answered, last_practiced_at
  ) VALUES (
    v_candidate_id, p_role_key, p_competency_code, 'practiced', 1, p_questions_answered, now()
  )
  ON CONFLICT (candidate_id, role_key, competency_code)
  DO UPDATE SET
    status = CASE
      WHEN candidate_yetenek_progress.status = 'completed' THEN 'completed'
      ELSE 'practiced'
    END,
    practice_count = candidate_yetenek_progress.practice_count + 1,
    questions_answered = candidate_yetenek_progress.questions_answered + EXCLUDED.questions_answered,
    last_practiced_at = now();

  -- Evaluate practice badges
  PERFORM evaluate_candidate_badges(v_candidate_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION record_yetenek_practice FROM PUBLIC;
GRANT EXECUTE ON FUNCTION record_yetenek_practice TO authenticated;


-- ═══════════════════════════════════════════════
-- 5. HOOK badge evaluation into streak RPC
-- update_candidate_streak already resolves candidate_id —
-- add evaluate call at the end (only when streak actually updated).
-- ═══════════════════════════════════════════════

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
  SELECT id INTO v_cid FROM candidates WHERE user_id = auth.uid();
  IF v_cid IS NULL THEN
    RETURN jsonb_build_object('error', 'no_candidate');
  END IF;

  SELECT * INTO v_row FROM candidate_streaks WHERE candidate_id = v_cid FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO candidate_streaks (candidate_id, current_streak, longest_streak, last_activity_date, updated_at)
    VALUES (v_cid, 1, 1, v_today, now());

    -- Evaluate streak badges on first activity
    PERFORM evaluate_candidate_badges(v_cid);

    RETURN jsonb_build_object(
      'current_streak', 1,
      'longest_streak', 1,
      'last_activity_date', v_today,
      'streak_freezes_available', 1,
      'streak_frozen_today', false
    );
  END IF;

  -- Already active today — no-op (no badge eval needed)
  IF v_row.last_activity_date = v_today THEN
    RETURN jsonb_build_object(
      'current_streak', v_row.current_streak,
      'longest_streak', v_row.longest_streak,
      'last_activity_date', v_row.last_activity_date,
      'streak_freezes_available', v_row.streak_freezes_available,
      'streak_frozen_today', v_row.streak_frozen_today
    );
  END IF;

  IF v_row.last_activity_date = v_today - 1 THEN
    v_new_streak := v_row.current_streak + 1;
  ELSE
    v_new_streak := 1;
  END IF;

  UPDATE candidate_streaks SET
    current_streak = v_new_streak,
    longest_streak = GREATEST(v_row.longest_streak, v_new_streak),
    last_activity_date = v_today,
    streak_frozen_today = false,
    updated_at = now()
  WHERE candidate_id = v_cid;

  -- Evaluate streak badges when streak grows
  PERFORM evaluate_candidate_badges(v_cid);

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
-- 6. HOOK badge evaluation into journal upsert RPC
-- upsert_studio_journal already resolves candidate_id —
-- add evaluate call when content is saved (not deleted).
-- ═══════════════════════════════════════════════

CREATE OR REPLACE FUNCTION upsert_studio_journal(
  p_competency_code text,
  p_question_hash text,
  p_question_text text DEFAULT NULL,
  p_role_key text DEFAULT NULL,
  p_situation text DEFAULT '',
  p_task text DEFAULT '',
  p_action text DEFAULT '',
  p_result text DEFAULT '',
  p_takeaway text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_candidate_id bigint;
  v_has_content boolean;
BEGIN
  SELECT id INTO v_candidate_id FROM candidates WHERE user_id = auth.uid();
  IF v_candidate_id IS NULL THEN RETURN; END IF;

  v_has_content := (COALESCE(p_situation, '') <> '' OR COALESCE(p_task, '') <> ''
    OR COALESCE(p_action, '') <> '' OR COALESCE(p_result, '') <> '' OR COALESCE(p_takeaway, '') <> '');

  IF NOT v_has_content THEN
    DELETE FROM candidate_studio_journals
      WHERE candidate_id = v_candidate_id
        AND competency_code = p_competency_code
        AND question_hash = p_question_hash;
    RETURN;
  END IF;

  INSERT INTO candidate_studio_journals (
    candidate_id, competency_code, question_hash, question_text, role_key,
    situation_text, task_text, action_text, result_text, takeaway_text,
    last_edited_at
  ) VALUES (
    v_candidate_id, p_competency_code, p_question_hash, p_question_text, p_role_key,
    p_situation, p_task, p_action, p_result, p_takeaway,
    now()
  )
  ON CONFLICT (candidate_id, competency_code, question_hash)
  DO UPDATE SET
    situation_text = EXCLUDED.situation_text,
    task_text = EXCLUDED.task_text,
    action_text = EXCLUDED.action_text,
    result_text = EXCLUDED.result_text,
    takeaway_text = EXCLUDED.takeaway_text,
    question_text = COALESCE(EXCLUDED.question_text, candidate_studio_journals.question_text),
    role_key = COALESCE(EXCLUDED.role_key, candidate_studio_journals.role_key),
    last_edited_at = now();

  -- Evaluate journal badges after saving content
  PERFORM evaluate_candidate_badges(v_candidate_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION upsert_studio_journal FROM PUBLIC;
GRANT EXECUTE ON FUNCTION upsert_studio_journal TO authenticated;
