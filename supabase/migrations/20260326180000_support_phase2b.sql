-- Support Phase 2B — Candidate replies, waiting_on_candidate, email notifications, auto-close email
-- Date: 2026-03-26
-- Type: RPC + EMAIL + CRON UPDATE
-- Purpose:
--   1. candidate_reply_to_ticket RPC (candidate replies in ticket detail)
--   2. admin_add_support_note updated with p_set_waiting + email notification
--   3. auto_close_resolved_tickets updated with email notification
--   4. admin_get_support_queue updated with waiting_on_candidate sort priority
--   5. Extend email_outbox CHECK for 3 new types

-- ═══════════════════════════════════════════════
-- 1. CANDIDATE REPLY RPC
-- ═══════════════════════════════════════════════

CREATE OR REPLACE FUNCTION candidate_reply_to_ticket(p_ticket_id bigint, p_body text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_current_status text;
  v_ticket_no text;
  v_subject text;
  v_assigned_admin uuid;
  v_candidate_name text;
  v_recipient_email text;
  v_body text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Oturum gereklidir.';
  END IF;

  v_body := btrim(COALESCE(p_body, ''));
  IF v_body = '' THEN
    RAISE EXCEPTION 'Mesaj bos olamaz.';
  END IF;

  SELECT status, ticket_no, subject, assigned_admin_user_id
    INTO v_current_status, v_ticket_no, v_subject, v_assigned_admin
    FROM support_tickets
    WHERE id = p_ticket_id AND user_id = v_user_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Talep bulunamadi veya size ait degil.';
  END IF;

  IF v_current_status NOT IN ('open', 'in_review', 'waiting_on_candidate') THEN
    RAISE EXCEPTION 'Bu durumda yanit gonderemezsiniz.';
  END IF;

  -- Insert candidate message
  INSERT INTO support_ticket_messages (ticket_id, author_type, author_user_id, body, visibility)
  VALUES (p_ticket_id, 'candidate', v_user_id, v_body, 'public');

  -- If waiting_on_candidate → transition to in_review + system message
  IF v_current_status = 'waiting_on_candidate' THEN
    UPDATE support_tickets
      SET status = 'in_review'
      WHERE id = p_ticket_id;
    -- (this UPDATE also bumps updated_at via trigger)

    INSERT INTO support_ticket_messages (ticket_id, author_type, body, visibility)
    VALUES (p_ticket_id, 'system', 'Aday yanit gonderdi. Talep tekrar inceleniyor.', 'public');
  ELSE
    -- Bump updated_at for queue recency (no status change, so explicit touch needed)
    UPDATE support_tickets SET updated_at = now() WHERE id = p_ticket_id;
  END IF;

  -- Resolve candidate name for email
  SELECT full_name INTO v_candidate_name
    FROM candidates WHERE user_id = v_user_id;

  -- Resolve notification recipient: assigned admin's email, or fallback to shared inbox
  v_recipient_email := NULL;
  IF v_assigned_admin IS NOT NULL THEN
    SELECT email INTO v_recipient_email FROM auth.users WHERE id = v_assigned_admin;
  END IF;
  IF v_recipient_email IS NULL OR v_recipient_email = '' THEN
    v_recipient_email := 'support@hellotalent.ai';
  END IF;

  -- Enqueue notification to assigned admin (or shared inbox fallback)
  INSERT INTO email_outbox (
    email_type, recipient_email, payload, dedupe_key, source_table, source_id
  ) VALUES (
    'support_ticket_candidate_reply',
    v_recipient_email,
    jsonb_build_object(
      'ticket_no', v_ticket_no,
      'subject', v_subject,
      'candidate_name', COALESCE(v_candidate_name, ''),
      'reply_body', v_body
    ),
    'support_candidate_reply:' || p_ticket_id::text || ':' || extract(epoch from now())::int::text,
    'support_tickets',
    p_ticket_id::text
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION candidate_reply_to_ticket(bigint, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION candidate_reply_to_ticket(bigint, text) TO authenticated;


-- ═══════════════════════════════════════════════
-- 2. ADMIN NOTE — add p_set_waiting + email to candidate on public reply
-- ═══════════════════════════════════════════════

CREATE OR REPLACE FUNCTION admin_add_support_note(
  p_ticket_id bigint,
  p_body text,
  p_visibility text DEFAULT 'public',
  p_set_waiting boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status text;
  v_candidate_email text;
  v_candidate_name text;
  v_ticket_no text;
  v_subject text;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Yetki hatasi: admin erisimi gereklidir.';
  END IF;

  IF p_visibility NOT IN ('public', 'internal') THEN
    RAISE EXCEPTION 'Gecersiz gorunurluk degeri. Izin verilen: public, internal';
  END IF;

  SELECT t.status, t.contact_email_snapshot, t.ticket_no, t.subject,
         c.full_name
    INTO v_current_status, v_candidate_email, v_ticket_no, v_subject,
         v_candidate_name
    FROM support_tickets t
    LEFT JOIN candidates c ON c.id = t.candidate_id
    WHERE t.id = p_ticket_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Talep bulunamadi.';
  END IF;

  -- Insert the note/reply
  INSERT INTO support_ticket_messages (ticket_id, author_type, author_user_id, body, visibility)
  VALUES (p_ticket_id, 'support', auth.uid(), p_body, p_visibility);

  -- Set waiting_on_candidate if requested (only from in_review, only for public messages)
  IF p_set_waiting = true AND p_visibility = 'public' AND v_current_status = 'in_review' THEN
    UPDATE support_tickets
      SET status = 'waiting_on_candidate'
      WHERE id = p_ticket_id;
    -- (this UPDATE also bumps updated_at via trigger)

    INSERT INTO support_ticket_messages (ticket_id, author_type, body, visibility)
    VALUES (p_ticket_id, 'system', 'Destek ekibi yanitinizi bekliyor.', 'public');
  ELSE
    -- Bump updated_at for queue recency (no status change, so explicit touch needed)
    UPDATE support_tickets SET updated_at = now() WHERE id = p_ticket_id;
  END IF;

  -- Email candidate on public replies (not internal notes)
  IF p_visibility = 'public' AND v_candidate_email IS NOT NULL AND v_candidate_email <> '' THEN
    INSERT INTO email_outbox (
      email_type, recipient_email, payload, dedupe_key, source_table, source_id
    ) VALUES (
      'support_ticket_admin_reply',
      v_candidate_email,
      jsonb_build_object(
        'candidate_name', COALESCE(v_candidate_name, ''),
        'ticket_no', v_ticket_no,
        'subject', v_subject,
        'reply_body', p_body
      ),
      'support_admin_reply:' || p_ticket_id::text || ':' || extract(epoch from now())::int::text,
      'support_tickets',
      p_ticket_id::text
    );
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_add_support_note(bigint, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_add_support_note(bigint, text, text, boolean) TO authenticated;

-- Drop old 3-param overload if it exists (replaced by 4-param with defaults)
DROP FUNCTION IF EXISTS admin_add_support_note(bigint, text, text);


-- ═══════════════════════════════════════════════
-- 3. AUTO-CLOSE — add email notification
-- ═══════════════════════════════════════════════

CREATE OR REPLACE FUNCTION auto_close_resolved_tickets()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_closed_count int := 0;
  v_ticket RECORD;
BEGIN
  FOR v_ticket IN
    SELECT t.id, t.ticket_no, t.subject, t.contact_email_snapshot,
           c.full_name AS candidate_name
    FROM support_tickets t
    LEFT JOIN candidates c ON c.id = t.candidate_id
    WHERE t.status = 'resolved'
      AND t.resolved_at < now() - interval '7 days'
  LOOP
    UPDATE support_tickets
      SET status = 'closed', closed_at = now()
      WHERE id = v_ticket.id;

    INSERT INTO support_ticket_messages (ticket_id, author_type, body, visibility)
    VALUES (v_ticket.id, 'system', 'Bu talep 7 gun icinde yanit alinmadigi icin otomatik olarak kapatildi.', 'public');

    -- Enqueue auto-close notification to candidate
    IF v_ticket.contact_email_snapshot IS NOT NULL AND v_ticket.contact_email_snapshot <> '' THEN
      INSERT INTO email_outbox (
        email_type, recipient_email, payload, dedupe_key, source_table, source_id
      ) VALUES (
        'support_ticket_auto_closed',
        v_ticket.contact_email_snapshot,
        jsonb_build_object(
          'candidate_name', COALESCE(v_ticket.candidate_name, ''),
          'ticket_no', v_ticket.ticket_no,
          'subject', v_ticket.subject
        ),
        'support_auto_closed:' || v_ticket.id::text || ':' || extract(epoch from now())::int::text,
        'support_tickets',
        v_ticket.id::text
      );
    END IF;

    v_closed_count := v_closed_count + 1;
  END LOOP;

  RETURN v_closed_count;
END;
$$;


-- ═══════════════════════════════════════════════
-- 4. ADMIN QUEUE — add waiting_on_candidate sort priority
-- ═══════════════════════════════════════════════

CREATE OR REPLACE FUNCTION admin_get_support_queue(
  p_status text DEFAULT 'all',
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id bigint,
  ticket_no text,
  category text,
  ui_topic text,
  subject text,
  status text,
  candidate_name text,
  candidate_email text,
  assigned_admin_name text,
  message_count bigint,
  created_at timestamptz,
  updated_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Yetki hatasi: admin erisimi gereklidir.';
  END IF;

  RETURN QUERY
    SELECT
      t.id,
      t.ticket_no,
      t.category,
      t.ui_topic,
      t.subject,
      t.status,
      c.full_name AS candidate_name,
      t.contact_email_snapshot AS candidate_email,
      a.display_name AS assigned_admin_name,
      (SELECT count(*) FROM support_ticket_messages m WHERE m.ticket_id = t.id) AS message_count,
      t.created_at,
      t.updated_at,
      t.resolved_at,
      t.closed_at
    FROM support_tickets t
    LEFT JOIN candidates c ON c.id = t.candidate_id
    LEFT JOIN admin_users a ON a.id = t.assigned_admin_user_id
    WHERE (p_status = 'all' OR t.status = p_status)
    ORDER BY
      CASE t.status
        WHEN 'open' THEN 0
        WHEN 'waiting_on_candidate' THEN 1
        WHEN 'in_review' THEN 2
        WHEN 'resolved' THEN 3
        WHEN 'closed' THEN 4
        ELSE 5
      END,
      t.updated_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_get_support_queue(text, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_get_support_queue(text, int, int) TO authenticated;


-- ═══════════════════════════════════════════════
-- 5. EMAIL OUTBOX — extend CHECK for 3 new types
-- ═══════════════════════════════════════════════

ALTER TABLE email_outbox DROP CONSTRAINT IF EXISTS email_outbox_email_type_check;
ALTER TABLE email_outbox ADD CONSTRAINT email_outbox_email_type_check
  CHECK (email_type IN (
    'candidate_welcome',
    'employer_welcome',
    'new_message',
    'coach_invite',
    'coach_post_published',
    'coach_post_changes_requested',
    'coach_post_rejected',
    'coach_post_archived',
    'coach_post_deletion_requested',
    'coach_post_deletion_dismissed',
    'support_ticket_confirmation',
    'support_ticket_internal_alert',
    'support_ticket_resolved',
    'support_ticket_admin_reply',
    'support_ticket_candidate_reply',
    'support_ticket_auto_closed'
  ));
