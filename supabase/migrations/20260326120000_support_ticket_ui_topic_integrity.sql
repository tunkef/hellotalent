-- Support Ticket ui_topic integrity hardening
-- Date: 2026-03-26
-- Type: DATA CLEANUP + CONSTRAINT + RPC (non-breaking)
-- Purpose:
--   1. Sanitize any existing rows with invalid ui_topic/category combinations
--   2. Replace loose CHECK with compound integrity CHECK
--   3. Replace RPC with server-side normalization via v_ui_topic

-- ═══════════════════════════════════════════════
-- 1. SANITIZE EXISTING DATA
-- ═══════════════════════════════════════════════

-- Force NULL for non-merged categories that somehow got a ui_topic
UPDATE support_tickets
  SET ui_topic = NULL
  WHERE category <> 'mesajlar_teklifler'
    AND ui_topic IS NOT NULL;

-- Force NULL for merged category rows with invalid ui_topic values
UPDATE support_tickets
  SET ui_topic = NULL
  WHERE category = 'mesajlar_teklifler'
    AND ui_topic IS NOT NULL
    AND ui_topic NOT IN ('mesajlar', 'teklifler');


-- ═══════════════════════════════════════════════
-- 2. REPLACE CHECK — compound integrity constraint
-- ═══════════════════════════════════════════════

ALTER TABLE support_tickets
  DROP CONSTRAINT IF EXISTS support_tickets_ui_topic_check;

ALTER TABLE support_tickets
  ADD CONSTRAINT support_tickets_ui_topic_check
  CHECK (
    ui_topic IS NULL
    OR (
      category = 'mesajlar_teklifler'
      AND ui_topic IN ('mesajlar', 'teklifler')
    )
  );


-- ═══════════════════════════════════════════════
-- 3. REPLACE RPC — server-side v_ui_topic normalization
-- ═══════════════════════════════════════════════

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
  v_ui_topic text;
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

  -- ── Normalize ui_topic ──
  IF p_category <> 'mesajlar_teklifler' THEN
    -- Non-merged categories: ui_topic is always NULL
    v_ui_topic := NULL;
  ELSIF p_ui_topic IS NULL OR p_ui_topic = '' THEN
    -- Merged category but no topic specified: backward compat
    v_ui_topic := NULL;
  ELSIF p_ui_topic IN ('mesajlar', 'teklifler') THEN
    -- Valid split value
    v_ui_topic := p_ui_topic;
  ELSE
    RAISE EXCEPTION 'Gecersiz ui_topic degeri: %. Izin verilen: mesajlar, teklifler', p_ui_topic;
  END IF;

  -- Generate ticket number
  SELECT COALESCE(MAX(id), 0) + 1 INTO v_next_seq FROM support_tickets;
  v_ticket_no := 'HT-' || LPAD(v_next_seq::text, 6, '0');

  -- Insert ticket with sanitized v_ui_topic
  INSERT INTO support_tickets (
    ticket_no, candidate_id, user_id, category, subject, description,
    source, contact_email_snapshot, current_panel, page_path, user_agent,
    ui_topic
  ) VALUES (
    v_ticket_no, v_candidate_id, v_user_id, p_category, p_subject, p_description,
    'candidate_portal', v_email, p_current_panel, p_page_path, p_user_agent,
    v_ui_topic
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

  -- Enqueue internal alert — uses sanitized v_ui_topic
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
      'ui_topic', COALESCE(v_ui_topic, ''),
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
