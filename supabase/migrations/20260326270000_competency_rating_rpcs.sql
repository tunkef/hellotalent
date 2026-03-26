-- Competency self-rating RPCs — minimum viable candidate persistence
-- Date: 2026-03-26
-- Type: RPC
-- Purpose:
--   1. upsert_competency_rating — candidate saves strong/growing self-rating
--   2. get_my_competency_ratings — candidate loads all own ratings

-- ═══════════════════════════════════════════════
-- 1. UPSERT RATING
-- ═══════════════════════════════════════════════

CREATE OR REPLACE FUNCTION upsert_competency_rating(
  p_competency_code text,
  p_rating text DEFAULT 'growing'
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

  IF p_rating NOT IN ('strong', 'growing') THEN
    RAISE EXCEPTION 'Gecersiz rating degeri. Izin verilen: strong, growing';
  END IF;

  INSERT INTO candidate_competencies (candidate_id, competency_code, rating)
  VALUES (v_candidate_id, p_competency_code, p_rating)
  ON CONFLICT (candidate_id, competency_code)
  DO UPDATE SET rating = EXCLUDED.rating;
END;
$$;

REVOKE EXECUTE ON FUNCTION upsert_competency_rating(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION upsert_competency_rating(text, text) TO authenticated;


-- ═══════════════════════════════════════════════
-- 2. GET MY RATINGS
-- ═══════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_my_competency_ratings()
RETURNS TABLE (
  competency_code text,
  rating text,
  updated_at timestamptz
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
    SELECT cc.competency_code::text, cc.rating::text, cc.updated_at
    FROM candidate_competencies cc
    WHERE cc.candidate_id = v_candidate_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_my_competency_ratings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_my_competency_ratings() TO authenticated;
