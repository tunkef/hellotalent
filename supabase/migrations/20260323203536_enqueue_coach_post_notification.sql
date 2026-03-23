-- Coach post notification enqueue RPC
-- Date: 2026-03-23
-- Type: RPC (SECURITY DEFINER)
-- Purpose: Admin moderasyon aksiyonu sonrasi coach'a email bildirimi gonderir.
--          RLS bypass eder (SECURITY DEFINER). Sadece admin cagirabilir.
-- Dependencies: email_outbox (051), coach_posts (058), coach_profiles (058),
--              coach_invites (058), is_admin() (014)

CREATE OR REPLACE FUNCTION enqueue_coach_post_notification(
  p_post_id bigint,
  p_new_status text,
  p_admin_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email_type text;
  v_post_title text;
  v_coach_name text;
  v_coach_email text;
  v_dedupe text;
BEGIN
  -- Admin guard
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Yetki hatasi: sadece admin bu islemi yapabilir.';
  END IF;

  -- Map status to email type
  IF p_new_status = 'published' THEN
    v_email_type := 'coach_post_published';
  ELSIF p_new_status = 'changes_requested' THEN
    v_email_type := 'coach_post_changes_requested';
  ELSIF p_new_status = 'rejected' THEN
    v_email_type := 'coach_post_rejected';
  ELSE
    RETURN; -- no notification for other statuses
  END IF;

  -- Resolve post title + coach info
  SELECT cp.title, prof.display_name, inv.email
  INTO v_post_title, v_coach_name, v_coach_email
  FROM coach_posts cp
  JOIN coach_profiles prof ON prof.id = cp.coach_id
  JOIN coach_invites inv ON inv.id = prof.invite_id
  WHERE cp.id = p_post_id;

  IF v_coach_email IS NULL THEN
    RETURN; -- cannot send without email
  END IF;

  -- Dedupe key prevents duplicate notification for same post+action
  v_dedupe := v_email_type || ':' || p_post_id::text;

  -- Insert into email_outbox (idempotent via dedupe_key UNIQUE)
  INSERT INTO email_outbox (
    email_type,
    recipient_email,
    payload,
    dedupe_key,
    source_table,
    source_id
  ) VALUES (
    v_email_type,
    v_coach_email,
    jsonb_build_object(
      'coach_name', COALESCE(v_coach_name, ''),
      'post_title', COALESCE(v_post_title, ''),
      'status', p_new_status,
      'admin_note', p_admin_note,
      'studio_url', 'https://hellotalent.ai/coach-studio.html'
    ),
    v_dedupe,
    'coach_posts',
    p_post_id::text
  )
  ON CONFLICT (dedupe_key) DO NOTHING; -- idempotent
END;
$$;

REVOKE EXECUTE ON FUNCTION enqueue_coach_post_notification(bigint, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION enqueue_coach_post_notification(bigint, text, text) TO authenticated;
