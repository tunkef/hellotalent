-- ═══════════════════════════════════════════════════════════════
-- Migration: Newsletter Phase 1 (MVP Launch)
-- Date: 23 Nisan 2026
-- Purpose: Newsletter subscriber capture + campaign infrastructure +
--          İYS sync queue + KVKK-compliant consent tracking.
-- Depends on: consent_log (20260409), email_outbox (051), is_admin() (014)
--
-- Scope (Faz 1):
--   - 4 new tables: newsletter_subscribers, newsletter_campaigns,
--     newsletter_events, iys_sync_queue
--   - consent_log.consent_type CHECK extend (newsletter_opt_in, newsletter_confirmed)
--   - candidates.notify_email_newsletter + hr_profiles.notify_email_newsletter
--   - email_outbox.email_type CHECK extend (4 new types)
--   - log_consent_on_signup trigger extend
--   - RLS + SECURITY DEFINER admin RPCs
--
-- Audience model: single table with audience enum ('aday','kurumsal').
-- Legal: capture + transactional confirmation active. Welcome + campaign
--        gated by İYS key (application-layer check in Edge Functions).
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════
-- 1. newsletter_subscribers — main subscriber table
-- ═══════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext NOT NULL UNIQUE,
  audience text NOT NULL CHECK (audience IN ('aday', 'kurumsal')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'unsubscribed', 'bounced')),
  source text,
  confirmation_token uuid NOT NULL DEFAULT gen_random_uuid(),
  unsubscribe_token uuid NOT NULL DEFAULT gen_random_uuid(),
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  bounce_count int NOT NULL DEFAULT 0,
  last_sent_at timestamptz,
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_audience_status
  ON public.newsletter_subscribers(audience, status);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_user_id
  ON public.newsletter_subscribers(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_confirm_token
  ON public.newsletter_subscribers(confirmation_token);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_unsub_token
  ON public.newsletter_subscribers(unsubscribe_token);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Public INSERT denied — Edge Function with service_role only
-- SELECT: user can read own row (for preference center if logged in)
DROP POLICY IF EXISTS newsletter_subscribers_select_own ON public.newsletter_subscribers;
CREATE POLICY newsletter_subscribers_select_own
  ON public.newsletter_subscribers FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS newsletter_subscribers_admin_all ON public.newsletter_subscribers;
CREATE POLICY newsletter_subscribers_admin_all
  ON public.newsletter_subscribers FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

GRANT SELECT ON public.newsletter_subscribers TO authenticated;

-- ═══════════════════════════════════════════════
-- 2. newsletter_campaigns — admin-composed campaigns
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.newsletter_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audience text NOT NULL CHECK (audience IN ('aday', 'kurumsal', 'all')),
  subject text NOT NULL,
  preheader text,
  body_html text NOT NULL,
  body_text text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  total_recipients int NOT NULL DEFAULT 0,
  sent_count int NOT NULL DEFAULT 0,
  bounce_count int NOT NULL DEFAULT 0,
  unsub_count int NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_campaigns_status
  ON public.newsletter_campaigns(status, scheduled_at);

ALTER TABLE public.newsletter_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS newsletter_campaigns_admin_all ON public.newsletter_campaigns;
CREATE POLICY newsletter_campaigns_admin_all
  ON public.newsletter_campaigns FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

GRANT SELECT ON public.newsletter_campaigns TO authenticated;

-- ═══════════════════════════════════════════════
-- 3. newsletter_events — tracking + İYS audit trail
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.newsletter_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid NOT NULL REFERENCES public.newsletter_subscribers(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.newsletter_campaigns(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'subscribed', 'confirmed', 'unsubscribed', 'bounced', 'complained',
    'sent', 'opened', 'clicked'
  )),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_events_subscriber
  ON public.newsletter_events(subscriber_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_newsletter_events_campaign
  ON public.newsletter_events(campaign_id, event_type) WHERE campaign_id IS NOT NULL;

ALTER TABLE public.newsletter_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS newsletter_events_admin_all ON public.newsletter_events;
CREATE POLICY newsletter_events_admin_all
  ON public.newsletter_events FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ═══════════════════════════════════════════════
-- 4. iys_sync_queue — İleti Yönetim Sistemi sync
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.iys_sync_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid NOT NULL REFERENCES public.newsletter_subscribers(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('add', 'remove')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'syncing', 'synced', 'failed')),
  attempt_count int NOT NULL DEFAULT 0,
  last_error text,
  next_retry_at timestamptz DEFAULT now(),
  synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_iys_sync_queue_pending
  ON public.iys_sync_queue(status, next_retry_at) WHERE status IN ('pending', 'failed');

ALTER TABLE public.iys_sync_queue ENABLE ROW LEVEL SECURITY;
-- service_role only (no authenticated access)
-- Exception documented: İYS sync backend-only, no PostgREST surface.

-- ═══════════════════════════════════════════════
-- 5. consent_log.consent_type CHECK extend
-- ═══════════════════════════════════════════════
ALTER TABLE public.consent_log DROP CONSTRAINT IF EXISTS consent_log_consent_type_check;
ALTER TABLE public.consent_log ADD CONSTRAINT consent_log_consent_type_check
  CHECK (consent_type IN (
    'privacy_terms',
    'kvkk_explicit',
    'age_confirmed',
    'newsletter_opt_in',
    'newsletter_confirmed'
  ));

-- ═══════════════════════════════════════════════
-- 6. candidates + hr_profiles notification toggle
-- ═══════════════════════════════════════════════
ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS notify_email_newsletter boolean NOT NULL DEFAULT false;
ALTER TABLE public.hr_profiles
  ADD COLUMN IF NOT EXISTS notify_email_newsletter boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.candidates.notify_email_newsletter IS
  'User preference for newsletter. Syncs with newsletter_subscribers.status via trigger.';
COMMENT ON COLUMN public.hr_profiles.notify_email_newsletter IS
  'User preference for newsletter. Syncs with newsletter_subscribers.status via trigger.';

-- ═══════════════════════════════════════════════
-- 7. email_outbox.email_type CHECK extend
-- ═══════════════════════════════════════════════
ALTER TABLE public.email_outbox DROP CONSTRAINT IF EXISTS email_outbox_email_type_check;
ALTER TABLE public.email_outbox ADD CONSTRAINT email_outbox_email_type_check
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
    'employer_lead_notification',
    'newsletter_confirmation',
    'newsletter_welcome_aday',
    'newsletter_welcome_kurumsal',
    'newsletter_campaign'
  ));

-- ═══════════════════════════════════════════════
-- 8. log_consent_on_signup trigger extend
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.log_consent_on_signup()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.raw_user_meta_data->>'privacy_consent_at' IS NOT NULL THEN
    INSERT INTO public.consent_log (user_id, consent_type, granted)
    VALUES (NEW.id, 'privacy_terms', true);
  END IF;
  IF NEW.raw_user_meta_data->>'kvkk_explicit_consent_at' IS NOT NULL THEN
    INSERT INTO public.consent_log (user_id, consent_type, granted)
    VALUES (NEW.id, 'kvkk_explicit', true);
  END IF;
  IF (NEW.raw_user_meta_data->>'age_confirmed')::boolean IS TRUE THEN
    INSERT INTO public.consent_log (user_id, consent_type, granted)
    VALUES (NEW.id, 'age_confirmed', true);
  END IF;
  IF NEW.raw_user_meta_data->>'newsletter_opt_in_at' IS NOT NULL THEN
    INSERT INTO public.consent_log (user_id, consent_type, granted)
    VALUES (NEW.id, 'newsletter_opt_in', true);
  END IF;
  RETURN NEW;
END; $$;

-- ═══════════════════════════════════════════════
-- 9. updated_at triggers
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.newsletter_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_newsletter_subscribers_updated_at ON public.newsletter_subscribers;
CREATE TRIGGER trg_newsletter_subscribers_updated_at
  BEFORE UPDATE ON public.newsletter_subscribers
  FOR EACH ROW EXECUTE FUNCTION public.newsletter_set_updated_at();

DROP TRIGGER IF EXISTS trg_newsletter_campaigns_updated_at ON public.newsletter_campaigns;
CREATE TRIGGER trg_newsletter_campaigns_updated_at
  BEFORE UPDATE ON public.newsletter_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.newsletter_set_updated_at();

-- ═══════════════════════════════════════════════
-- 10. Profile toggle cascade
--     candidates/hr_profiles.notify_email_newsletter off → subscriber unsubscribed
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.sync_newsletter_toggle_to_subscriber()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_email citext;
  v_auth_id uuid;
BEGIN
  IF NEW.notify_email_newsletter IS DISTINCT FROM OLD.notify_email_newsletter
     AND NEW.notify_email_newsletter = false THEN

    -- candidates.user_id = auth.uid; hr_profiles.id = auth.uid (FK auth.users)
    IF TG_TABLE_NAME = 'candidates' THEN
      v_auth_id := NEW.user_id;
    ELSIF TG_TABLE_NAME = 'hr_profiles' THEN
      v_auth_id := NEW.id;
    END IF;

    IF v_auth_id IS NOT NULL THEN
      SELECT email::citext INTO v_email FROM auth.users WHERE id = v_auth_id;

      IF v_email IS NOT NULL THEN
        UPDATE public.newsletter_subscribers
        SET status = 'unsubscribed', unsubscribed_at = now()
        WHERE email = v_email AND status = 'confirmed';

        INSERT INTO public.iys_sync_queue (subscriber_id, action)
        SELECT id, 'remove'
        FROM public.newsletter_subscribers
        WHERE email = v_email AND status = 'unsubscribed';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_candidates_newsletter_sync ON public.candidates;
CREATE TRIGGER trg_candidates_newsletter_sync
  AFTER UPDATE OF notify_email_newsletter ON public.candidates
  FOR EACH ROW EXECUTE FUNCTION public.sync_newsletter_toggle_to_subscriber();

DROP TRIGGER IF EXISTS trg_hr_profiles_newsletter_sync ON public.hr_profiles;
CREATE TRIGGER trg_hr_profiles_newsletter_sync
  AFTER UPDATE OF notify_email_newsletter ON public.hr_profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_newsletter_toggle_to_subscriber();

-- ═══════════════════════════════════════════════
-- 11. Admin RPCs (SECURITY DEFINER)
-- ═══════════════════════════════════════════════

-- List subscribers with filter + pagination
CREATE OR REPLACE FUNCTION public.admin_list_newsletter_subscribers(
  p_audience text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_email_search text DEFAULT NULL,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid, email citext, audience text, status text, source text,
  confirmed_at timestamptz, unsubscribed_at timestamptz,
  bounce_count int, last_sent_at timestamptz, created_at timestamptz,
  total_count bigint
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'admin_only' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT * FROM public.newsletter_subscribers
    WHERE (p_audience IS NULL OR audience = p_audience)
      AND (p_status IS NULL OR status = p_status)
      AND (p_email_search IS NULL OR email ILIKE '%' || p_email_search || '%')
  ),
  counted AS (
    SELECT COUNT(*) AS total FROM filtered
  )
  SELECT f.id, f.email, f.audience, f.status, f.source,
         f.confirmed_at, f.unsubscribed_at,
         f.bounce_count, f.last_sent_at, f.created_at,
         c.total
  FROM filtered f, counted c
  ORDER BY f.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_list_newsletter_subscribers TO authenticated;

-- Save campaign draft
CREATE OR REPLACE FUNCTION public.admin_save_newsletter_campaign(
  p_audience text,
  p_subject text,
  p_preheader text,
  p_body_html text,
  p_body_text text,
  p_id uuid DEFAULT NULL,
  p_status text DEFAULT 'draft',
  p_scheduled_at timestamptz DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'admin_only' USING ERRCODE = '42501';
  END IF;

  IF p_audience NOT IN ('aday', 'kurumsal', 'all') THEN
    RAISE EXCEPTION 'invalid_audience';
  END IF;
  IF p_status NOT IN ('draft', 'scheduled') THEN
    RAISE EXCEPTION 'save_only_draft_or_scheduled';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.newsletter_campaigns
      (audience, subject, preheader, body_html, body_text, status, scheduled_at, created_by)
    VALUES
      (p_audience, p_subject, p_preheader, p_body_html, p_body_text, p_status, p_scheduled_at, auth.uid())
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.newsletter_campaigns
    SET audience = p_audience,
        subject = p_subject,
        preheader = p_preheader,
        body_html = p_body_html,
        body_text = p_body_text,
        status = p_status,
        scheduled_at = p_scheduled_at
    WHERE id = p_id AND status IN ('draft', 'scheduled')
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_save_newsletter_campaign TO authenticated;

-- Send campaign — enqueues to email_outbox in batches
CREATE OR REPLACE FUNCTION public.admin_send_newsletter_campaign(
  p_campaign_id uuid
)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_campaign public.newsletter_campaigns;
  v_inserted int := 0;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'admin_only' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_campaign FROM public.newsletter_campaigns
  WHERE id = p_campaign_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'campaign_not_found';
  END IF;
  IF v_campaign.status NOT IN ('draft', 'scheduled') THEN
    RAISE EXCEPTION 'campaign_not_sendable';
  END IF;

  UPDATE public.newsletter_campaigns
  SET status = 'sending', sent_at = now()
  WHERE id = p_campaign_id;

  -- Batch enqueue to email_outbox
  WITH eligible AS (
    SELECT s.id AS subscriber_id, s.email, s.unsubscribe_token
    FROM public.newsletter_subscribers s
    WHERE s.status = 'confirmed'
      AND (v_campaign.audience = 'all' OR s.audience = v_campaign.audience)
  ),
  inserted AS (
    INSERT INTO public.email_outbox
      (dedupe_key, email_type, recipient_email, payload, status)
    SELECT
      'newsletter:' || p_campaign_id || ':' || e.subscriber_id,
      'newsletter_campaign',
      e.email,
      jsonb_build_object(
        'campaign_id', p_campaign_id,
        'subject', v_campaign.subject,
        'preheader', v_campaign.preheader,
        'body_html', v_campaign.body_html,
        'body_text', v_campaign.body_text,
        'unsubscribe_token', e.unsubscribe_token,
        'subscriber_id', e.subscriber_id
      ),
      'pending'
    FROM eligible e
    ON CONFLICT (dedupe_key) DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_inserted FROM inserted;

  UPDATE public.newsletter_campaigns
  SET total_recipients = v_inserted
  WHERE id = p_campaign_id;

  RETURN v_inserted;
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_send_newsletter_campaign TO authenticated;

-- Campaign metrics aggregate
CREATE OR REPLACE FUNCTION public.admin_newsletter_campaign_metrics(
  p_campaign_id uuid
)
RETURNS TABLE (
  total_recipients int,
  sent_count int,
  bounce_count int,
  unsub_count int,
  open_count bigint,
  click_count bigint
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'admin_only' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT c.total_recipients, c.sent_count, c.bounce_count, c.unsub_count,
    (SELECT COUNT(*) FROM public.newsletter_events
      WHERE campaign_id = p_campaign_id AND event_type = 'opened'),
    (SELECT COUNT(*) FROM public.newsletter_events
      WHERE campaign_id = p_campaign_id AND event_type = 'clicked')
  FROM public.newsletter_campaigns c
  WHERE c.id = p_campaign_id;
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_newsletter_campaign_metrics TO authenticated;

-- ═══════════════════════════════════════════════
-- 12. Post-signup link user_id to existing subscriber
--     Called from Edge Function when user opts in during signup
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.link_newsletter_subscriber_to_user(
  p_email citext,
  p_user_id uuid
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.newsletter_subscribers
  SET user_id = p_user_id
  WHERE email = p_email AND user_id IS NULL;
END; $$;

GRANT EXECUTE ON FUNCTION public.link_newsletter_subscriber_to_user TO service_role;

-- ═══════════════════════════════════════════════
-- End of migration
-- ═══════════════════════════════════════════════
