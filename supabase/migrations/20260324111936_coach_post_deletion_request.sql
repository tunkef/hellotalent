-- Coach post deletion request flow
-- Date: 2026-03-24
-- Type: SCHEMA + RPC
-- Purpose: Allow coaches to request deletion of their published posts.
--          Adds deletion_requested_at column and a SECURITY DEFINER RPC
--          that bypasses RLS (published posts are read-only for coaches).
--          Also adds coach_post_deletion_requested email type for admin notification.

-- 1. Add deletion request timestamp to coach_posts
ALTER TABLE coach_posts ADD COLUMN IF NOT EXISTS deletion_requested_at timestamptz DEFAULT NULL;

-- 2. RPC: coach requests deletion of own published post
CREATE OR REPLACE FUNCTION request_coach_post_deletion(p_post_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coach_id uuid;
  v_post_status text;
  v_post_coach_id uuid;
BEGIN
  v_coach_id := auth.uid();
  IF v_coach_id IS NULL THEN
    RAISE EXCEPTION 'Oturum gereklidir.';
  END IF;

  -- Verify post belongs to caller and is published
  SELECT status, coach_id INTO v_post_status, v_post_coach_id
  FROM coach_posts WHERE id = p_post_id;

  IF v_post_coach_id IS NULL OR v_post_coach_id != v_coach_id THEN
    RAISE EXCEPTION 'Bu yazi size ait degil.';
  END IF;

  IF v_post_status != 'published' THEN
    RAISE EXCEPTION 'Sadece yayinda olan yazilar icin silme talebi gonderilebilir.';
  END IF;

  -- Set deletion request timestamp
  UPDATE coach_posts
  SET deletion_requested_at = NOW()
  WHERE id = p_post_id AND coach_id = v_coach_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION request_coach_post_deletion(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION request_coach_post_deletion(bigint) TO authenticated;

-- 3. RPC: coach cancels own deletion request
CREATE OR REPLACE FUNCTION cancel_coach_post_deletion_request(p_post_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coach_id uuid;
BEGIN
  v_coach_id := auth.uid();
  IF v_coach_id IS NULL THEN
    RAISE EXCEPTION 'Oturum gereklidir.';
  END IF;

  UPDATE coach_posts
  SET deletion_requested_at = NULL
  WHERE id = p_post_id AND coach_id = v_coach_id AND status = 'published';
END;
$$;

REVOKE EXECUTE ON FUNCTION cancel_coach_post_deletion_request(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cancel_coach_post_deletion_request(bigint) TO authenticated;

-- 4. Extend email_outbox CHECK constraint for deletion lifecycle notifications
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
    'coach_post_deletion_dismissed'
  ));

-- 5. Extend enqueue_coach_post_notification to handle deletion_requested
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
  ELSIF p_new_status = 'archived' THEN
    v_email_type := 'coach_post_archived';
  ELSIF p_new_status = 'deletion_dismissed' THEN
    v_email_type := 'coach_post_deletion_dismissed';
  ELSE
    RETURN;
  END IF;

  -- Resolve post title + coach info
  SELECT cp.title, prof.display_name, inv.email
  INTO v_post_title, v_coach_name, v_coach_email
  FROM coach_posts cp
  JOIN coach_profiles prof ON prof.id = cp.coach_id
  JOIN coach_invites inv ON inv.id = prof.invite_id
  WHERE cp.id = p_post_id;

  IF v_coach_email IS NULL THEN
    RETURN;
  END IF;

  v_dedupe := v_email_type || ':' || p_post_id::text;

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
  ON CONFLICT (dedupe_key) DO NOTHING;
END;
$$;

REVOKE EXECUTE ON FUNCTION enqueue_coach_post_notification(bigint, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION enqueue_coach_post_notification(bigint, text, text) TO authenticated;
