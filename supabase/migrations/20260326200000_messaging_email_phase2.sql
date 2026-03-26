-- Messaging Email Phase 2 — employer follow-up + candidate reply email notifications
-- Date: 2026-03-26
-- Type: TRIGGER + EMAIL
-- Purpose:
--   1. Employer follow-up reply → candidate email (reuses new_message template)
--   2. Candidate reply → employer (original sender) email (new template type)
--   3. Extend email_outbox CHECK for candidate_reply_notification

-- ═══════════════════════════════════════════════
-- 1. EMPLOYER FOLLOW-UP → CANDIDATE EMAIL
-- Mirrors enqueue_message_email() from migration 051 but fires on
-- employer_message_replies INSERT. Reuses 'new_message' email type.
-- ═══════════════════════════════════════════════

CREATE OR REPLACE FUNCTION enqueue_employer_followup_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_root       record;
  v_candidate  record;
  v_hr         record;
  v_company_name text;
  v_sender_name  text;
  v_preview      text;
BEGIN
  -- 1. Fetch root message to get candidate_id
  SELECT candidate_id, sender_id, company_id
    INTO v_root
    FROM employer_messages
    WHERE id = NEW.message_id;

  IF NOT FOUND THEN RETURN NEW; END IF;

  -- 2. Fetch candidate info + notify preference
  SELECT full_name, email, notify_email_messages
    INTO v_candidate
    FROM candidates
    WHERE id = v_root.candidate_id;

  IF NOT FOUND OR v_candidate.email IS NULL THEN
    RETURN NEW;
  END IF;

  -- 3. Check notify preference — if false, enqueue as skipped
  IF v_candidate.notify_email_messages IS NOT TRUE THEN
    INSERT INTO email_outbox (
      dedupe_key, email_type, recipient_email, payload,
      status, source_table, source_id
    ) VALUES (
      'new_message_followup:' || NEW.id::text,
      'new_message',
      v_candidate.email,
      '{}'::jsonb,
      'skipped',
      'employer_message_replies',
      NEW.id::text
    ) ON CONFLICT (dedupe_key) DO NOTHING;
    RETURN NEW;
  END IF;

  -- 4. Derive sender_name with 3-level fallback (same as 051)
  SELECT ad, soyad
    INTO v_hr
    FROM hr_profiles
    WHERE id = NEW.sender_id;

  v_sender_name := NULLIF(TRIM(
    COALESCE(v_hr.ad, '') || ' ' || COALESCE(v_hr.soyad, '')
  ), '');

  IF v_sender_name IS NULL THEN
    SELECT company_name INTO v_company_name
      FROM companies
      WHERE id = NEW.company_id;
    v_sender_name := v_company_name;
  END IF;

  v_sender_name := COALESCE(v_sender_name, 'HelloTalent İşveren Ekibi');

  -- 5. Message preview
  v_preview := LEFT(NEW.body, 100);

  -- 6. Enqueue — reuses 'new_message' template (same UX as root message email)
  INSERT INTO email_outbox (
    dedupe_key, email_type, recipient_email, payload,
    source_table, source_id
  ) VALUES (
    'new_message_followup:' || NEW.id::text,
    'new_message',
    v_candidate.email,
    jsonb_build_object(
      'recipient_name', v_candidate.full_name,
      'sender_name',    v_sender_name,
      'message_preview', v_preview,
      'sent_at',        to_char(NEW.created_at, 'HH24:MI'),
      'cta_url',        'https://hellotalent.ai/giris.html',
      'settings_url',   'https://hellotalent.ai/giris.html'
    ),
    'employer_message_replies',
    NEW.id::text
  ) ON CONFLICT (dedupe_key) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_employer_followup_email ON employer_message_replies;
CREATE TRIGGER trg_employer_followup_email
  AFTER INSERT ON employer_message_replies
  FOR EACH ROW
  EXECUTE FUNCTION enqueue_employer_followup_email();


-- ═══════════════════════════════════════════════
-- 2. CANDIDATE REPLY → EMPLOYER (ORIGINAL SENDER) EMAIL
-- Notifies the original message sender (hr_profiles.id = employer_messages.sender_id).
-- Uses a new 'candidate_reply_notification' email type with dedicated template.
-- ═══════════════════════════════════════════════

CREATE OR REPLACE FUNCTION enqueue_candidate_reply_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_root          record;
  v_sender_email  text;
  v_sender_name   text;
  v_candidate_name text;
  v_preview       text;
BEGIN
  -- 1. Fetch root message to get sender_id and candidate_id
  SELECT sender_id, candidate_id, subject
    INTO v_root
    FROM employer_messages
    WHERE id = NEW.message_id;

  IF NOT FOUND THEN RETURN NEW; END IF;

  -- 2. Resolve sender (employer) email from auth.users
  SELECT email INTO v_sender_email
    FROM auth.users
    WHERE id = v_root.sender_id;

  IF v_sender_email IS NULL OR v_sender_email = '' THEN
    RETURN NEW;  -- no email to notify → skip silently
  END IF;

  -- 3. Resolve sender display name
  SELECT NULLIF(TRIM(COALESCE(ad, '') || ' ' || COALESCE(soyad, '')), '')
    INTO v_sender_name
    FROM hr_profiles
    WHERE id = v_root.sender_id;

  v_sender_name := COALESCE(v_sender_name, 'İşveren');

  -- 4. Resolve candidate name
  SELECT full_name INTO v_candidate_name
    FROM candidates
    WHERE id = v_root.candidate_id;

  v_candidate_name := COALESCE(v_candidate_name, 'Aday');

  -- 5. Message preview
  v_preview := LEFT(NEW.body, 100);

  -- 6. Enqueue notification to employer
  INSERT INTO email_outbox (
    dedupe_key, email_type, recipient_email, payload,
    source_table, source_id
  ) VALUES (
    'candidate_reply_notif:' || NEW.id::text,
    'candidate_reply_notification',
    v_sender_email,
    jsonb_build_object(
      'recipient_name', v_sender_name,
      'candidate_name', v_candidate_name,
      'message_preview', v_preview,
      'sent_at',        to_char(NEW.created_at, 'HH24:MI'),
      'subject',        v_root.subject,
      'cta_url',        'https://hellotalent.ai/giris.html?tab=ik'
    ),
    'candidate_message_replies',
    NEW.id::text
  ) ON CONFLICT (dedupe_key) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_candidate_reply_email ON candidate_message_replies;
CREATE TRIGGER trg_candidate_reply_email
  AFTER INSERT ON candidate_message_replies
  FOR EACH ROW
  EXECUTE FUNCTION enqueue_candidate_reply_email();


-- ═══════════════════════════════════════════════
-- 3. EXTEND EMAIL OUTBOX CHECK
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
    'support_ticket_auto_closed',
    'candidate_reply_notification'
  ));
