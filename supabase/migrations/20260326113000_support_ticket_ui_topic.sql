-- Support Ticket UI Topic — persistent Mesajlar / Teklifler separation
-- Date: 2026-03-26
-- Type: SCHEMA + RPC (non-breaking, additive)
-- Purpose:
--   Add nullable ui_topic column to support_tickets so the frontend
--   Mesajlar vs Teklifler split persists after save/reload.
--   The DB category enum stays unchanged. ui_topic is UI-layer metadata.

-- ═══════════════════════════════════════════════
-- 1. ADD NULLABLE COLUMN
-- ═══════════════════════════════════════════════

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS ui_topic text;

-- Only validate when set; NULL is always allowed (legacy rows)
ALTER TABLE support_tickets
  DROP CONSTRAINT IF EXISTS support_tickets_ui_topic_check;
ALTER TABLE support_tickets
  ADD CONSTRAINT support_tickets_ui_topic_check
  CHECK (ui_topic IS NULL OR ui_topic IN ('mesajlar', 'teklifler'));


-- ═══════════════════════════════════════════════
-- 2. REPLACE RPC — add p_ui_topic parameter
-- ═══════════════════════════════════════════════

-- Drop old 6-param signature so PostgREST doesn't see an overload conflict
DROP FUNCTION IF EXISTS create_support_ticket(text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION create_support_ticket(
  p_category text,
  p_subject text,
  p_description text,
  p_current_panel text DEFAULT NULL,
  p_page_path text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_ui_topic text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_candidate_id bigint;
  v_email text;
  v_full_name text;
  v_ticket_id bigint;
  v_ticket_no text;
  v_next_seq bigint;
BEGIN
  -- Auth guard
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Oturum gereklidir.';
  END IF;

  -- Resolve candidate
  SELECT id, email, full_name INTO v_candidate_id, v_email, v_full_name
  FROM candidates WHERE user_id = v_user_id;

  IF v_candidate_id IS NULL THEN
    RAISE EXCEPTION 'Aday profili bulunamadi.';
  END IF;

  -- Generate ticket number: HT-NNNNNN (zero-padded sequence)
  SELECT COALESCE(MAX(id), 0) + 1 INTO v_next_seq FROM support_tickets;
  v_ticket_no := 'HT-' || LPAD(v_next_seq::text, 6, '0');

  -- Insert ticket (ui_topic nullable — only meaningful for mesajlar_teklifler)
  INSERT INTO support_tickets (
    ticket_no, candidate_id, user_id, category, subject, description,
    source, contact_email_snapshot, current_panel, page_path, user_agent,
    ui_topic
  ) VALUES (
    v_ticket_no, v_candidate_id, v_user_id, p_category, p_subject, p_description,
    'candidate_portal', v_email, p_current_panel, p_page_path, p_user_agent,
    p_ui_topic
  ) RETURNING id INTO v_ticket_id;

  -- Insert initial message
  INSERT INTO support_ticket_messages (ticket_id, author_type, author_user_id, body, visibility)
  VALUES (v_ticket_id, 'candidate', v_user_id, p_description, 'public');

  -- Enqueue candidate confirmation email
  INSERT INTO email_outbox (
    email_type, recipient_email, payload, dedupe_key, source_table, source_id
  ) VALUES (
    'support_ticket_confirmation',
    v_email,
    jsonb_build_object(
      'candidate_name', COALESCE(v_full_name, ''),
      'ticket_no', v_ticket_no,
      'subject', p_subject,
      'category', p_category
    ),
    'support_confirm:' || v_ticket_id::text,
    'support_tickets',
    v_ticket_id::text
  );

  -- Enqueue internal alert to support@hellotalent.ai
  INSERT INTO email_outbox (
    email_type, recipient_email, payload, dedupe_key, source_table, source_id
  ) VALUES (
    'support_ticket_internal_alert',
    'support@hellotalent.ai',
    jsonb_build_object(
      'candidate_name', COALESCE(v_full_name, ''),
      'candidate_email', COALESCE(v_email, ''),
      'ticket_no', v_ticket_no,
      'subject', p_subject,
      'category', p_category,
      'ui_topic', COALESCE(p_ui_topic, ''),
      'description', p_description,
      'current_panel', COALESCE(p_current_panel, ''),
      'page_path', COALESCE(p_page_path, ''),
      'user_agent', COALESCE(p_user_agent, '')
    ),
    'support_alert:' || v_ticket_id::text,
    'support_tickets',
    v_ticket_id::text
  );

  RETURN jsonb_build_object(
    'ticket_id', v_ticket_id,
    'ticket_no', v_ticket_no
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION create_support_ticket(text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_support_ticket(text, text, text, text, text, text, text) TO authenticated;
