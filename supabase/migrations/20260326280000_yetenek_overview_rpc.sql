-- Yetenek Competency Profile — overview RPC for lobby evidence surface
-- Date: 2026-03-26
-- Type: RPC
-- Purpose: Single-query aggregation of candidate competency evidence for a role

CREATE OR REPLACE FUNCTION get_my_yetenek_overview(p_role_key text)
RETURNS TABLE (
  competency_code text,
  self_rating text,
  practice_status text,
  practice_count int,
  questions_answered int,
  journal_count bigint,
  feedback_signal text,
  last_practiced_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_candidate_id bigint;
BEGIN
  SELECT id INTO v_candidate_id FROM candidates WHERE user_id = auth.uid();
  IF v_candidate_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
    SELECT
      rcm.competency_code::text,

      -- Self-rating from candidate_competencies
      COALESCE(cc.rating, 'none')::text AS self_rating,

      -- Practice status from candidate_yetenek_progress
      COALESCE(cyp.status, 'none')::text AS practice_status,
      COALESCE(cyp.practice_count, 0)::int AS practice_count,
      COALESCE(cyp.questions_answered, 0)::int AS questions_answered,

      -- Journal count for this competency
      COALESCE(jc.cnt, 0)::bigint AS journal_count,

      -- Latest AI feedback signal for this competency
      COALESCE(fb.overall_signal, 'none')::text AS feedback_signal,

      -- Last practice timestamp
      cyp.last_practiced_at

    FROM role_competency_map rcm

    -- Self-rating
    LEFT JOIN candidate_competencies cc
      ON cc.candidate_id = v_candidate_id
      AND cc.competency_code = rcm.competency_code

    -- Practice progress
    LEFT JOIN candidate_yetenek_progress cyp
      ON cyp.candidate_id = v_candidate_id
      AND cyp.role_key = p_role_key
      AND cyp.competency_code = rcm.competency_code

    -- Journal count (aggregate)
    LEFT JOIN LATERAL (
      SELECT count(*) AS cnt
      FROM candidate_studio_journals csj
      WHERE csj.candidate_id = v_candidate_id
        AND csj.competency_code = rcm.competency_code
        AND (csj.situation_text <> '' OR csj.task_text <> '' OR csj.action_text <> '' OR csj.result_text <> '' OR csj.takeaway_text <> '')
    ) jc ON true

    -- Latest completed AI feedback signal
    LEFT JOIN LATERAL (
      SELECT cjf.overall_signal
      FROM candidate_journal_feedback cjf
      WHERE cjf.candidate_id = v_candidate_id
        AND cjf.competency_code = rcm.competency_code
        AND cjf.status = 'completed'
      ORDER BY cjf.completed_at DESC
      LIMIT 1
    ) fb ON true

    WHERE rcm.role_name = p_role_key
    ORDER BY rcm.sort_order;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_my_yetenek_overview(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_my_yetenek_overview(text) TO authenticated;
