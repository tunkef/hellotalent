-- Support Queue MVP — Admin queue, closure workflow, auto-close
-- Date: 2026-03-26
-- Type: SCHEMA + RPC + RLS + CRON
-- Purpose:
--   1. Add lifecycle columns to support_tickets (resolved_at, closed_at, assigned_admin_user_id)
--   2. Admin RLS read policies for tickets + messages
--   3. Admin RPCs: claim, resolve, note, close, queue
--   4. Candidate RPCs: confirm resolved, reopen
--   5. Auto-close function + cron job
--   6. Extend email_outbox CHECK for support_ticket_resolved

-- ═══════════════════════════════════════════════
-- 1. SCHEMA — lifecycle columns
-- ═══════════════════════════════════════════════

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS assigned_admin_user_id uuid REFERENCES admin_users(id);

-- Index for auto-close job: find resolved tickets older than 7 days
CREATE INDEX IF NOT EXISTS idx_support_tickets_resolved_pending
  ON support_tickets (resolved_at) WHERE status = 'resolved';

-- Index for admin queue ordering
CREATE INDEX IF NOT EXISTS idx_support_tickets_status_created
  ON support_tickets (status, created_at DESC);


-- ═══════════════════════════════════════════════
-- 2. RLS — admin read access
-- ═══════════════════════════════════════════════

-- Admin can read all tickets
DROP POLICY IF EXISTS support_tickets_admin_read ON support_tickets;
CREATE POLICY support_tickets_admin_read ON support_tickets
  FOR SELECT TO authenticated
  USING (is_admin());

-- Admin can read all messages (public + internal)
DROP POLICY IF EXISTS stm_admin_read ON support_ticket_messages;
CREATE POLICY stm_admin_read ON support_ticket_messages
  FOR SELECT TO authenticated
  USING (is_admin());


-- ═══════════════════════════════════════════════
-- 3. ADMIN RPCs
-- ═══════════════════════════════════════════════

-- ── admin_claim_support_ticket ──
CREATE OR REPLACE FUNCTION admin_claim_support_ticket(p_ticket_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Yetki hatasi: admin erisimi gereklidir.';
  END IF;

  UPDATE support_tickets
    SET status = 'in_review',
        assigned_admin_user_id = auth.uid()
    WHERE id = p_ticket_id AND status = 'open';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Talep bulunamadi veya durumu uygun degil (sadece acik talepler ustlenilebilir).';
  END IF;

  INSERT INTO support_ticket_messages (ticket_id, author_type, author_user_id, body, visibility)
  VALUES (p_ticket_id, 'system', auth.uid(), 'Destek ekibi talebinizi inceliyor.', 'public');
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_claim_support_ticket(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_claim_support_ticket(bigint) TO authenticated;


-- ── admin_resolve_support_ticket ──
-- Works from open or in_review. If open, implicitly claims.
CREATE OR REPLACE FUNCTION admin_resolve_support_ticket(p_ticket_id bigint, p_message text)
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
  v_message text;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Yetki hatasi: admin erisimi gereklidir.';
  END IF;

  -- Sanitize and validate resolve message
  v_message := btrim(COALESCE(p_message, ''));
  IF v_message = '' THEN
    RAISE EXCEPTION 'Cozum aciklamasi bos olamaz. Lutfen bir aciklama girin.';
  END IF;

  SELECT status, contact_email_snapshot, ticket_no, subject
    INTO v_current_status, v_candidate_email, v_ticket_no, v_subject
    FROM support_tickets WHERE id = p_ticket_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Talep bulunamadi.';
  END IF;

  IF v_current_status NOT IN ('open', 'in_review') THEN
    RAISE EXCEPTION 'Sadece acik veya inceleniyor durumundaki talepler cozuldu olarak isaretlenebilir.';
  END IF;

  UPDATE support_tickets
    SET status = 'resolved',
        resolved_at = now(),
        closed_at = NULL,
        assigned_admin_user_id = COALESCE(assigned_admin_user_id, auth.uid())
    WHERE id = p_ticket_id;

  INSERT INTO support_ticket_messages (ticket_id, author_type, author_user_id, body, visibility)
  VALUES (p_ticket_id, 'support', auth.uid(), v_message, 'public');

  -- Enqueue resolved notification email to candidate
  IF v_candidate_email IS NOT NULL AND v_candidate_email <> '' THEN
    INSERT INTO email_outbox (
      email_type, recipient_email, payload, dedupe_key, source_table, source_id
    ) VALUES (
      'support_ticket_resolved',
      v_candidate_email,
      jsonb_build_object(
        'candidate_name', COALESCE((SELECT full_name FROM candidates WHERE id = (SELECT candidate_id FROM support_tickets WHERE id = p_ticket_id)), ''),
        'ticket_no', v_ticket_no,
        'subject', v_subject,
        'resolution_message', v_message
      ),
      'support_resolved:' || p_ticket_id::text || ':' || extract(epoch from now())::int::text,
      'support_tickets',
      p_ticket_id::text
    );
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_resolve_support_ticket(bigint, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_resolve_support_ticket(bigint, text) TO authenticated;


-- ── admin_add_support_note ──
CREATE OR REPLACE FUNCTION admin_add_support_note(p_ticket_id bigint, p_body text, p_visibility text DEFAULT 'public')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Yetki hatasi: admin erisimi gereklidir.';
  END IF;

  IF p_visibility NOT IN ('public', 'internal') THEN
    RAISE EXCEPTION 'Gecersiz gorunurluk degeri. Izin verilen: public, internal';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM support_tickets WHERE id = p_ticket_id) THEN
    RAISE EXCEPTION 'Talep bulunamadi.';
  END IF;

  INSERT INTO support_ticket_messages (ticket_id, author_type, author_user_id, body, visibility)
  VALUES (p_ticket_id, 'support', auth.uid(), p_body, p_visibility);
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_add_support_note(bigint, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_add_support_note(bigint, text, text) TO authenticated;


-- ── admin_close_support_ticket ──
CREATE OR REPLACE FUNCTION admin_close_support_ticket(p_ticket_id bigint, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_msg text;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Yetki hatasi: admin erisimi gereklidir.';
  END IF;

  UPDATE support_tickets
    SET status = 'closed',
        closed_at = now()
    WHERE id = p_ticket_id AND status IN ('open', 'in_review', 'resolved');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Talep bulunamadi veya zaten kapali.';
  END IF;

  v_msg := 'Bu talep destek ekibi tarafindan kapatildi.';
  IF p_reason IS NOT NULL AND p_reason <> '' THEN
    v_msg := v_msg || ' Neden: ' || p_reason;
  END IF;

  INSERT INTO support_ticket_messages (ticket_id, author_type, author_user_id, body, visibility)
  VALUES (p_ticket_id, 'system', auth.uid(), v_msg, 'public');
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_close_support_ticket(bigint, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_close_support_ticket(bigint, text) TO authenticated;


-- ── admin_get_support_queue ──
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
        WHEN 'in_review' THEN 1
        WHEN 'resolved' THEN 2
        WHEN 'closed' THEN 3
        ELSE 4
      END,
      t.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;

REVOKE EXECUTE ON FUNCTION admin_get_support_queue(text, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_get_support_queue(text, int, int) TO authenticated;


-- ═══════════════════════════════════════════════
-- 4. CANDIDATE RPCs
-- ═══════════════════════════════════════════════

-- ── candidate_confirm_resolved ──
CREATE OR REPLACE FUNCTION candidate_confirm_resolved(p_ticket_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE support_tickets
    SET status = 'closed',
        closed_at = now()
    WHERE id = p_ticket_id
      AND status = 'resolved'
      AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Talep bulunamadi, durumu uygun degil veya size ait degil.';
  END IF;

  INSERT INTO support_ticket_messages (ticket_id, author_type, author_user_id, body, visibility)
  VALUES (p_ticket_id, 'system', auth.uid(), 'Aday sorunu cozuldu olarak onayladi.', 'public');
END;
$$;

REVOKE EXECUTE ON FUNCTION candidate_confirm_resolved(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION candidate_confirm_resolved(bigint) TO authenticated;


-- ── candidate_reopen_ticket ──
CREATE OR REPLACE FUNCTION candidate_reopen_ticket(p_ticket_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE support_tickets
    SET status = 'in_review',
        resolved_at = NULL,
        closed_at = NULL
    WHERE id = p_ticket_id
      AND status = 'resolved'
      AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Talep bulunamadi, durumu uygun degil veya size ait degil.';
  END IF;

  INSERT INTO support_ticket_messages (ticket_id, author_type, author_user_id, body, visibility)
  VALUES (p_ticket_id, 'system', auth.uid(), 'Aday sorunun devam ettigini bildirdi.', 'public');
END;
$$;

REVOKE EXECUTE ON FUNCTION candidate_reopen_ticket(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION candidate_reopen_ticket(bigint) TO authenticated;


-- ═══════════════════════════════════════════════
-- 5. AUTO-CLOSE function
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
    SELECT id FROM support_tickets
    WHERE status = 'resolved'
      AND resolved_at < now() - interval '7 days'
  LOOP
    UPDATE support_tickets
      SET status = 'closed', closed_at = now()
      WHERE id = v_ticket.id;

    INSERT INTO support_ticket_messages (ticket_id, author_type, body, visibility)
    VALUES (v_ticket.id, 'system', 'Bu talep 7 gun icinde yanit alinmadigi icin otomatik olarak kapatildi.', 'public');

    v_closed_count := v_closed_count + 1;
  END LOOP;

  RETURN v_closed_count;
END;
$$;

-- Schedule daily at 03:00 UTC
SELECT cron.schedule(
  'auto-close-resolved-tickets',
  '0 3 * * *',
  'SELECT auto_close_resolved_tickets()'
);


-- ═══════════════════════════════════════════════
-- 6. EMAIL OUTBOX — extend CHECK for resolved notification
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
    'support_ticket_resolved'
  ));
