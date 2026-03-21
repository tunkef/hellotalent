-- ════════════════════════════════════════════════════════════════
-- Migration 055 — Fix get_company_message_threads for 3-way activity
-- Date: 2026-03-21
-- Purpose: Include employer_message_replies in last_body/last_sender/
--          last_activity_at computation so the thread list stays fresh
--          after employer follow-up replies.
-- Corrective: replaces 053's version of get_company_message_threads.
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
  last_body        text,
  last_sender      text,
  last_activity_at timestamptz,
  employer_read_at timestamptz,
  unread_replies   bigint
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
      COALESCE(latest.body, em.body) AS last_body,
      COALESCE(latest.sender, 'employer') AS last_sender,
      COALESCE(latest.lat, em.created_at) AS last_activity_at,
      em.read_at                     AS employer_read_at,
      (SELECT count(*) FROM candidate_message_replies r
        WHERE r.message_id = em.id AND r.read_at IS NULL
      )                              AS unread_replies
    FROM employer_messages em
    JOIN candidates c ON c.id = em.candidate_id
    LEFT JOIN LATERAL (
      -- True latest thread item across both reply tables
      SELECT x.body, x.sender, x.created_at AS lat
      FROM (
        SELECT cmr.body, 'candidate'::text AS sender, cmr.created_at
          FROM candidate_message_replies cmr
         WHERE cmr.message_id = em.id
        UNION ALL
        SELECT emr.body, 'employer'::text AS sender, emr.created_at
          FROM employer_message_replies emr
         WHERE emr.message_id = em.id
      ) x
      ORDER BY x.created_at DESC
      LIMIT 1
    ) latest ON true
    WHERE em.company_id = v_company_id
      AND em.status <> 'deleted'
    ORDER BY COALESCE(latest.lat, em.created_at) DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;
