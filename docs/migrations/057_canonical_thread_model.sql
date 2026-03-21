-- ════════════════════════════════════════════════════════════════
-- Migration 057 — Canonical thread model hardening
-- Date: 2026-03-21
-- 1. Move deleted-thread reactivation to send_employer_followup (write side)
-- 2. Replace get_candidate_unread_count with read-only STABLE version
-- 3. Add get_candidate_thread_summaries canonical RPC for all candidate surfaces
-- ════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────
-- 1. send_employer_followup: add auto-reactivation on write
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION send_employer_followup(
  p_message_id bigint,
  p_body       text
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id bigint;
  v_msg_company_id bigint;
  v_reply_id bigint;
BEGIN
  SELECT hp.company_id INTO v_company_id
    FROM hr_profiles hp WHERE hp.id = auth.uid();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'İşveren profili bulunamadı.';
  END IF;

  SELECT em.company_id INTO v_msg_company_id
    FROM employer_messages em WHERE em.id = p_message_id;
  IF v_msg_company_id IS NULL THEN
    RAISE EXCEPTION 'Mesaj bulunamadı.';
  END IF;
  IF v_msg_company_id <> v_company_id THEN
    RAISE EXCEPTION 'Bu mesaja yanıt verme yetkiniz yok.';
  END IF;

  IF p_body IS NULL OR char_length(trim(p_body)) < 1 THEN
    RAISE EXCEPTION 'Yanıt metni boş olamaz.';
  END IF;
  IF char_length(p_body) > 5000 THEN
    RAISE EXCEPTION 'Yanıt 5000 karakteri aşamaz.';
  END IF;

  -- Auto-reactivate deleted thread on new employer follow-up
  UPDATE employer_messages
     SET status = 'sent'
   WHERE id = p_message_id
     AND status = 'deleted';

  INSERT INTO employer_message_replies (message_id, sender_id, company_id, body)
  VALUES (p_message_id, auth.uid(), v_company_id, trim(p_body))
  RETURNING id INTO v_reply_id;

  RETURN v_reply_id;
END;
$$;

-- ──────────────────────────────────────────────
-- 2. get_candidate_unread_count: read-only, no UPDATE
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_candidate_unread_count()
RETURNS int
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_candidate_id bigint;
  v_count int;
BEGIN
  SELECT c.id INTO v_candidate_id
    FROM candidates c WHERE c.user_id = auth.uid();
  IF v_candidate_id IS NULL THEN RETURN 0; END IF;

  SELECT count(*) INTO v_count
    FROM employer_messages em
   WHERE em.candidate_id = v_candidate_id
     AND em.status <> 'deleted'
     AND (
       em.status = 'sent'
       OR EXISTS (
         SELECT 1 FROM employer_message_replies emr
          WHERE emr.message_id = em.id
            AND emr.read_at IS NULL
       )
     );

  RETURN v_count;
END;
$$;

-- ──────────────────────────────────────────────
-- 3. Canonical candidate thread summary RPC
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_candidate_thread_summaries(
  p_limit  int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE(
  message_id       bigint,
  company_name     text,
  company_logo     text,
  subject          text,
  status           text,
  last_body        text,
  last_sender      text,       -- 'employer' or 'candidate'
  last_activity_at timestamptz,
  unread_followups bigint,     -- employer follow-ups with read_at IS NULL
  is_unread        boolean     -- true if root unread OR has unread followups
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_candidate_id bigint;
BEGIN
  SELECT c.id INTO v_candidate_id
    FROM candidates c WHERE c.user_id = auth.uid();
  IF v_candidate_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
    SELECT
      em.id                                AS message_id,
      COALESCE(co.company_name, 'İşveren') AS company_name,
      co.logo_url                          AS company_logo,
      em.subject,
      em.status,
      COALESCE(latest.body, em.body)       AS last_body,
      COALESCE(latest.sender, 'employer')  AS last_sender,
      COALESCE(latest.lat, em.created_at)  AS last_activity_at,
      COALESCE(uf.cnt, 0)                  AS unread_followups,
      (em.status = 'sent' OR COALESCE(uf.cnt, 0) > 0) AS is_unread
    FROM employer_messages em
    LEFT JOIN companies co ON co.id = em.company_id
    LEFT JOIN LATERAL (
      SELECT x.body, x.sender, x.created_at AS lat
      FROM (
        SELECT cmr.body, 'candidate'::text AS sender, cmr.created_at
          FROM candidate_message_replies cmr WHERE cmr.message_id = em.id
        UNION ALL
        SELECT emr.body, 'employer'::text AS sender, emr.created_at
          FROM employer_message_replies emr WHERE emr.message_id = em.id
      ) x
      ORDER BY x.created_at DESC
      LIMIT 1
    ) latest ON true
    LEFT JOIN LATERAL (
      SELECT count(*) AS cnt
        FROM employer_message_replies emr
       WHERE emr.message_id = em.id
         AND emr.read_at IS NULL
    ) uf ON true
    WHERE em.candidate_id = v_candidate_id
    ORDER BY COALESCE(latest.lat, em.created_at) DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_candidate_thread_summaries(int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_candidate_thread_summaries(int, int) TO authenticated;
