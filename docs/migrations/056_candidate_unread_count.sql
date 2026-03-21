-- ════════════════════════════════════════════════════════════════
-- Migration 056 — Candidate canonical unread count RPC
-- Date: 2026-03-21
-- Purpose: Single source of truth for candidate unread message count.
--          Counts threads with ANY employer-originated unread item:
--          root message (status='sent') OR follow-up reply (read_at IS NULL).
--          Also auto-reactivates deleted threads on new employer activity.
-- ════════════════════════════════════════════════════════════════

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

  -- Auto-reactivate: deleted threads that received new employer follow-ups
  UPDATE employer_messages em
     SET status = 'sent'
   WHERE em.candidate_id = v_candidate_id
     AND em.status = 'deleted'
     AND EXISTS (
       SELECT 1 FROM employer_message_replies emr
        WHERE emr.message_id = em.id
          AND emr.read_at IS NULL
     );

  -- Count threads with any employer-originated unread item
  SELECT count(*) INTO v_count
    FROM employer_messages em
   WHERE em.candidate_id = v_candidate_id
     AND em.status <> 'deleted'
     AND (
       em.status = 'sent'  -- root message never read
       OR EXISTS (
         SELECT 1 FROM employer_message_replies emr
          WHERE emr.message_id = em.id
            AND emr.read_at IS NULL
       )
     );

  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_candidate_unread_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_candidate_unread_count() TO authenticated;
