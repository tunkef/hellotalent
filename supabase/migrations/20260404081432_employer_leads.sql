-- ═══════════════════════════════════════════════════════════════
-- Migration: Employer leads table + submit RPC + email notification
-- Date: 2026-04-04
-- Reason: LS2+LS3+LS4 — işveren lead toplama + mail bildirim
-- ═══════════════════════════════════════════════════════════════

-- 1. Create table
CREATE TABLE IF NOT EXISTS employer_leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  company text NOT NULL,
  phone text,
  team_size text,
  status text DEFAULT 'yeni' CHECK (status IN ('yeni', 'iletisime_gecildi', 'demo_gosterildi', 'kayit_oldu', 'reddedildi')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. RLS
ALTER TABLE employer_leads ENABLE ROW LEVEL SECURITY;

-- Anon insert: lead form is public (no auth required)
CREATE POLICY employer_leads_anon_insert ON employer_leads
  FOR INSERT TO anon
  WITH CHECK (true);

-- Authenticated insert: also allow from authenticated context
CREATE POLICY employer_leads_auth_insert ON employer_leads
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- No select/update/delete for regular users — admin only via service_role

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_employer_leads_status ON employer_leads (status);
CREATE INDEX IF NOT EXISTS idx_employer_leads_created ON employer_leads (created_at DESC);

-- 4. Grants
GRANT INSERT ON employer_leads TO anon;
GRANT INSERT ON employer_leads TO authenticated;

-- 5. Submit lead RPC — inserts lead + queues email notification
CREATE OR REPLACE FUNCTION submit_employer_lead(
  p_name text,
  p_email text,
  p_company text,
  p_phone text DEFAULT NULL,
  p_team_size text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
BEGIN
  -- Validate required fields
  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'İsim zorunludur';
  END IF;
  IF p_email IS NULL OR trim(p_email) = '' THEN
    RAISE EXCEPTION 'E-posta zorunludur';
  END IF;
  IF p_company IS NULL OR trim(p_company) = '' THEN
    RAISE EXCEPTION 'Şirket adı zorunludur';
  END IF;

  -- Insert lead
  INSERT INTO employer_leads (name, email, company, phone, team_size)
  VALUES (trim(p_name), trim(p_email), trim(p_company), nullif(trim(p_phone), ''), nullif(p_team_size, ''))
  RETURNING id INTO v_lead_id;

  -- Queue email notification to info@
  INSERT INTO email_outbox (
    email_type, recipient_email, payload, dedupe_key, source_table, source_id
  ) VALUES (
    'employer_lead_notification',
    'info@hellotalent.ai',
    jsonb_build_object(
      'lead_name', trim(p_name),
      'lead_email', trim(p_email),
      'lead_company', trim(p_company),
      'lead_phone', COALESCE(trim(p_phone), '-'),
      'lead_team_size', COALESCE(p_team_size, '-')
    ),
    'lead_' || v_lead_id::text,
    'employer_leads',
    v_lead_id::text
  );

  RETURN jsonb_build_object('success', true, 'lead_id', v_lead_id);
END;
$$;

-- 6. Update email_type CHECK to include new type
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
    'candidate_reply_notification',
    'employer_lead_notification'
  ));

-- 7. Grant RPC to anon (form is public)
GRANT EXECUTE ON FUNCTION submit_employer_lead TO anon;
GRANT EXECUTE ON FUNCTION submit_employer_lead TO authenticated;

-- 8. Admin RPC — list and update leads
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

  -- Admin check: user must have admin role in metadata
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = v_user_id
    AND (raw_user_meta_data->>'role' = 'admin' OR raw_user_meta_data->>'is_admin' = 'true')
  ) THEN
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

  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = v_user_id
    AND (raw_user_meta_data->>'role' = 'admin' OR raw_user_meta_data->>'is_admin' = 'true')
  ) THEN
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
