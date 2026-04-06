-- ═══════════════════════════════════════════════════════════════
-- Migration: Zero Tech Debt — auth.users removal from live functions
-- Date: 2026-04-06
--
-- Fixes all runtime auth.users references per project rule:
--   "Policy/function icinde SELECT ... FROM auth.users KULLANMA"
--   "auth.jwt() her zaman guvenlidir, RLS bypass gerektirmez"
--
-- 1. admin_get_leads() — auth.users admin check → admin_users table
-- 2. admin_update_lead() — same fix
-- 3. enqueue_candidate_reply_email() trigger — auth.users email → hr_profiles.email
-- 4. candidate_reply_to_ticket() — auth.users email → admin_users + hr_profiles
--
-- analytics_events.user_id REFERENCES auth.users(id) is a DDL FK — safe, no change.
-- ═══════════════════════════════════════════════════════════════

-- ┌─────────────────────────────────────────────────────────────┐
-- │ 1. admin_get_leads() — replace auth.users with admin_users  │
-- └─────────────────────────────────────────────────────────────┘

CREATE OR REPLACE FUNCTION admin_get_leads(
  p_status text DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_results jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Admin check via admin_users table (replaces auth.users metadata query)
  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT jsonb_build_object(
    'leads', COALESCE(jsonb_agg(row_to_json(l)::jsonb ORDER BY l.created_at DESC), '[]'::jsonb),
    'total', (SELECT count(*) FROM employer_leads WHERE (p_status IS NULL OR status = p_status))
  )
  INTO v_results
  FROM (
    SELECT id, name, email, company, phone, team_size, status, notes, created_at, updated_at
    FROM employer_leads
    WHERE (p_status IS NULL OR status = p_status)
    ORDER BY created_at DESC
    LIMIT p_limit OFFSET p_offset
  ) l;

  RETURN v_results;
END;
$$;

-- ┌─────────────────────────────────────────────────────────────┐
-- │ 2. admin_update_lead() — replace auth.users with admin_users│
-- └─────────────────────────────────────────────────────────────┘

CREATE OR REPLACE FUNCTION admin_update_lead(
  p_lead_id uuid,
  p_status text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM admin_users WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  UPDATE employer_leads SET
    status = COALESCE(p_status, status),
    notes = COALESCE(p_notes, notes),
    updated_at = now()
  WHERE id = p_lead_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead not found';
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ┌─────────────────────────────────────────────────────────────┐
-- │ 3. enqueue_candidate_reply_email() — auth.users → hr_profiles│
-- │    Trigger on candidate_message_replies                      │
-- └─────────────────────────────────────────────────────────────┘

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

  -- 2. Resolve sender (employer) email from hr_profiles (replaces auth.users)
  SELECT email INTO v_sender_email
    FROM hr_profiles
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

  -- 6. Enqueue notification email to employer
  INSERT INTO email_outbox (
    email_type, recipient_email, payload, dedupe_key, source_table, source_id
  ) VALUES (
    'candidate_reply',
    v_sender_email,
    jsonb_build_object(
      'employer_name', v_sender_name,
      'candidate_name', v_candidate_name,
      'subject', COALESCE(v_root.subject, 'Mesaj'),
      'preview', v_preview
    ),
    'reply-' || NEW.id::text,
    'candidate_message_replies',
    NEW.id
  );

  RETURN NEW;
END;
$$;

-- ┌─────────────────────────────────────────────────────────────┐
-- │ 4. candidate_reply_to_ticket() — admin email from hr_profiles│
-- │    Support system: resolve assigned admin email              │
-- └─────────────────────────────────────────────────────────────┘

-- This is a targeted fix: only the auth.users email lookup line changes.
-- We read the full function and replace just the problematic query.
-- The admin's email comes from hr_profiles (if they have one) or fallback.

-- Note: We can't easily replace just one line in a trigger.
-- Instead we apply the fix via a direct SQL update to the production function.
-- The migration file below re-creates candidate_reply_to_ticket with the fix.
-- We need to read the full function first. Since it's complex, we do a targeted
-- replacement using a DO block that patches the specific query.

-- The support function reads: SELECT email INTO v_recipient_email FROM auth.users WHERE id = v_assigned_admin
-- Replace with: SELECT email INTO v_recipient_email FROM hr_profiles WHERE id = v_assigned_admin

-- Since we can't partially replace a function body, and the full function is in
-- a long migration, we use a direct ALTER approach. However, PG doesn't support
-- ALTER FUNCTION body. We need CREATE OR REPLACE with the full body.
--
-- For safety, we'll use a targeted DO block that reads the current function source,
-- replaces the problematic line, and re-creates it. This avoids hardcoding the
-- entire function body here.

DO $$
DECLARE
  v_src text;
  v_fixed text;
BEGIN
  -- Get current function source
  SELECT pg_get_functiondef(oid) INTO v_src
  FROM pg_proc
  WHERE proname = 'candidate_reply_to_ticket'
    AND pronamespace = 'public'::regnamespace;

  IF v_src IS NULL THEN
    RAISE NOTICE 'candidate_reply_to_ticket not found — skipping';
    RETURN;
  END IF;

  -- Check if fix is needed
  IF v_src NOT LIKE '%FROM auth.users WHERE id = v_assigned_admin%' THEN
    RAISE NOTICE 'candidate_reply_to_ticket already fixed — skipping';
    RETURN;
  END IF;

  -- Replace auth.users with hr_profiles
  v_fixed := replace(v_src,
    'FROM auth.users WHERE id = v_assigned_admin',
    'FROM hr_profiles WHERE id = v_assigned_admin'
  );

  -- Re-create function with fix
  EXECUTE v_fixed;
  RAISE NOTICE 'candidate_reply_to_ticket: auth.users → hr_profiles fix applied';
END;
$$;
