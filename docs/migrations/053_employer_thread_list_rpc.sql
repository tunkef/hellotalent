-- ════════════════════════════════════════════════════════════════
-- Migration 053 — Employer thread list RPC
-- Date: 2026-03-21
-- Purpose: Let employers list their company's message threads
--          with candidate name, preview, and unread reply count.
-- Additive: one new RPC. No table changes.
-- ════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_company_message_threads(
  p_limit  int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE(
  message_id       bigint,
  candidate_id     bigint,
  candidate_name   text,
  subject          text,
  last_body        text,       -- latest reply body, or original body if no replies
  last_sender      text,       -- 'employer' or 'candidate'
  last_activity_at timestamptz,
  employer_read_at timestamptz, -- candidate read the employer msg?
  unread_replies   bigint      -- count of candidate replies with read_at IS NULL
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id bigint;
BEGIN
  SELECT hp.company_id INTO v_company_id
    FROM hr_profiles hp WHERE hp.id = auth.uid();

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'İşveren profili bulunamadı.';
  END IF;

  RETURN QUERY
    SELECT
      em.id                          AS message_id,
      em.candidate_id,
      COALESCE(c.full_name, 'Aday')  AS candidate_name,
      em.subject,
      COALESCE(lr.body, em.body)     AS last_body,
      CASE WHEN lr.id IS NOT NULL THEN 'candidate' ELSE 'employer' END AS last_sender,
      COALESCE(lr.created_at, em.created_at) AS last_activity_at,
      em.read_at                     AS employer_read_at,
      (SELECT count(*) FROM candidate_message_replies r
        WHERE r.message_id = em.id AND r.read_at IS NULL
      )                              AS unread_replies
    FROM employer_messages em
    JOIN candidates c ON c.id = em.candidate_id
    LEFT JOIN LATERAL (
      SELECT cmr.id, cmr.body, cmr.created_at
        FROM candidate_message_replies cmr
       WHERE cmr.message_id = em.id
       ORDER BY cmr.created_at DESC
       LIMIT 1
    ) lr ON true
    WHERE em.company_id = v_company_id
      AND em.status <> 'deleted'
    ORDER BY COALESCE(lr.created_at, em.created_at) DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_company_message_threads(int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_company_message_threads(int, int) TO authenticated;
