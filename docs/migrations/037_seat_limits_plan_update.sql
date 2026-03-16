-- ═══════════════════════════════════════════════════════════════
-- Migration 037: Subscription Plan Update + Seat Limits
-- Date: 2026-03-16
-- Type: SCHEMA — seat-based team limits for employer plans
--
-- Purpose:
--   1. Update plan constraint: free (no row) | premium | pro | enterprise
--   2. Add seat_limit helper function
--   3. Add check_seat_available() for invitation flow
--   4. Update get_employer_plan() to reflect new tiers
--
-- Plan tiers:
--   free (default, no subscription row): 1 user
--   premium: 3 users
--   pro: 5 users
--   enterprise: custom (lets talk → admin sets manually)
--
-- Depends on: 033 (subscriptions), 029 (company_teams + invitations)
-- ═══════════════════════════════════════════════════════════════


-- ── 1. UPDATE PLAN CONSTRAINT ─────────────────────────────────
-- Add 'premium' to allowed plans. Keep old 'pro' and 'enterprise'.
-- Safe: DROP + ADD is idempotent pattern.

ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_plan_check;

ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN ('premium', 'pro', 'enterprise'));


-- ── 2. SEAT LIMIT FUNCTION ────────────────────────────────────
-- Returns max team members for a given plan.
-- free = 1, premium = 3, pro = 5, enterprise = 50 (practical cap; admin overrides)

CREATE OR REPLACE FUNCTION get_seat_limit(p_plan text)
RETURNS int
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  CASE p_plan
    WHEN 'premium'    THEN RETURN 3;
    WHEN 'pro'        THEN RETURN 5;
    WHEN 'enterprise' THEN RETURN 50;
    ELSE RETURN 1;  -- free / demo / unknown
  END CASE;
END;
$$;


-- ── 3. UPDATE get_employer_plan() ─────────────────────────────
-- Now returns 'free' | 'premium' | 'pro' | 'enterprise'
-- Priority: enterprise > pro > premium

CREATE OR REPLACE FUNCTION get_employer_plan()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text;
BEGIN
  SELECT plan INTO v_plan
  FROM subscriptions
  WHERE user_id = auth.uid()
    AND user_type = 'employer'
    AND status IN ('active', 'trial')
    AND expires_at > now()
  ORDER BY
    CASE plan WHEN 'enterprise' THEN 1 WHEN 'pro' THEN 2 WHEN 'premium' THEN 3 ELSE 4 END
  LIMIT 1;

  RETURN COALESCE(v_plan, 'free');
END;
$$;


-- ── 4. CHECK SEAT AVAILABLE ───────────────────────────────────
-- Returns true if the company still has room for another team member.
-- Counts active hr_profiles with same company_id.

CREATE OR REPLACE FUNCTION check_seat_available(p_company_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text;
  v_limit int;
  v_current int;
BEGIN
  -- Get the calling user's plan
  v_plan := get_employer_plan();
  v_limit := get_seat_limit(v_plan);

  -- Count current team members for this company
  SELECT COUNT(*) INTO v_current
  FROM hr_profiles
  WHERE company_id = p_company_id;

  RETURN v_current < v_limit;
END;
$$;


-- ── 5. GET TEAM INFO ──────────────────────────────────────────
-- Returns plan, seat limit, current usage for the employer's company.
-- Used by ik.html to show team panel.

CREATE OR REPLACE FUNCTION get_employer_team_info()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id bigint;
  v_plan text;
  v_limit int;
  v_current int;
  v_members json;
BEGIN
  -- Get caller's company
  SELECT company_id INTO v_company_id
  FROM hr_profiles
  WHERE id = auth.uid();

  IF v_company_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Şirket kaydı bulunamadı'
    );
  END IF;

  v_plan := get_employer_plan();
  v_limit := get_seat_limit(v_plan);

  -- Count and list team members
  SELECT COUNT(*) INTO v_current
  FROM hr_profiles
  WHERE company_id = v_company_id;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_members
  FROM (
    SELECT
      hp.id,
      hp.email,
      hp.display_name,
      hp.employer_role,
      hp.created_at
    FROM hr_profiles hp
    WHERE hp.company_id = v_company_id
    ORDER BY hp.created_at
  ) t;

  RETURN json_build_object(
    'success', true,
    'plan', v_plan,
    'seat_limit', v_limit,
    'seat_used', v_current,
    'seats_available', v_limit - v_current,
    'company_id', v_company_id,
    'members', v_members
  );
END;
$$;


-- ── 6. INVITE TEAM MEMBER ─────────────────────────────────────
-- Creates an invitation if seats available and caller is admin.
-- Returns invitation record for the backend to send email.

CREATE OR REPLACE FUNCTION invite_team_member(p_email text, p_role text DEFAULT 'recruiter')
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id bigint;
  v_employer_role text;
  v_plan text;
  v_limit int;
  v_current int;
  v_pending int;
  v_invite_id bigint;
BEGIN
  -- Verify caller is admin
  SELECT company_id, employer_role INTO v_company_id, v_employer_role
  FROM hr_profiles
  WHERE id = auth.uid();

  IF v_company_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Şirket kaydı bulunamadı');
  END IF;

  IF v_employer_role != 'admin' THEN
    RETURN json_build_object('success', false, 'error', 'Sadece admin kullanıcılar davet gönderebilir');
  END IF;

  -- Check seat limit
  v_plan := get_employer_plan();
  v_limit := get_seat_limit(v_plan);

  SELECT COUNT(*) INTO v_current
  FROM hr_profiles
  WHERE company_id = v_company_id;

  SELECT COUNT(*) INTO v_pending
  FROM company_invitations
  WHERE company_id = v_company_id
    AND status = 'pending';

  IF (v_current + v_pending) >= v_limit THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Kullanıcı limitine ulaşıldı. Planınızı yükseltin.',
      'plan', v_plan,
      'limit', v_limit,
      'used', v_current,
      'pending', v_pending
    );
  END IF;

  -- Check if already a member
  IF EXISTS (SELECT 1 FROM hr_profiles WHERE email = LOWER(TRIM(p_email)) AND company_id = v_company_id) THEN
    RETURN json_build_object('success', false, 'error', 'Bu e-posta adresi zaten ekibinizde');
  END IF;

  -- Check if already invited (pending)
  IF EXISTS (SELECT 1 FROM company_invitations WHERE email = LOWER(TRIM(p_email)) AND company_id = v_company_id AND status = 'pending') THEN
    RETURN json_build_object('success', false, 'error', 'Bu e-posta adresine zaten davet gönderilmiş');
  END IF;

  -- Validate role
  IF p_role NOT IN ('admin', 'recruiter', 'viewer') THEN
    p_role := 'recruiter';
  END IF;

  -- Create invitation
  INSERT INTO company_invitations (company_id, email, invited_role, invited_by)
  VALUES (v_company_id, LOWER(TRIM(p_email)), p_role, auth.uid())
  RETURNING id INTO v_invite_id;

  RETURN json_build_object(
    'success', true,
    'invitation_id', v_invite_id,
    'email', LOWER(TRIM(p_email)),
    'role', p_role,
    'message', 'Davet başarıyla oluşturuldu'
  );
END;
$$;


-- ── 7. GRANTS ─────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION get_seat_limit TO authenticated;
GRANT EXECUTE ON FUNCTION check_seat_available TO authenticated;
GRANT EXECUTE ON FUNCTION get_employer_team_info TO authenticated;
GRANT EXECUTE ON FUNCTION invite_team_member TO authenticated;


-- ═══════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════
-- SELECT get_seat_limit('free');       -- 1
-- SELECT get_seat_limit('premium');    -- 3
-- SELECT get_seat_limit('pro');        -- 5
-- SELECT get_seat_limit('enterprise'); -- 50
-- SELECT get_employer_plan();          -- 'free' for users without subscription
-- SELECT get_employer_team_info();     -- JSON with plan, seats, members
