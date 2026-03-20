-- ═══════════════════════════════════════════════════════════════
-- COMBINED DEPLOY: Migrations 032 → 036
-- Date: 2026-03-16
-- Run in Supabase SQL Editor (Cmd+A → Cmd+Return)
--
-- Prerequisites: 030 + 031 already deployed
-- All statements are idempotent (safe to re-run)
-- ═══════════════════════════════════════════════════════════════


-- ╔═══════════════════════════════════════════════════════════════╗
-- ║  032: VISIBILITY ENFORCEMENT                                  ║
-- ╚═══════════════════════════════════════════════════════════════╝

-- Enhanced send_employer_message with blocked/hidden/profile_completed checks
CREATE OR REPLACE FUNCTION send_employer_message(
  p_candidate_id bigint,
  p_subject text,
  p_body text,
  p_position_id bigint DEFAULT NULL,
  p_template_id bigint DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_company_id bigint;
  v_msg_id bigint;
  v_candidate record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT company_id INTO v_company_id
  FROM hr_profiles WHERE id = v_user_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Employer not linked to a company';
  END IF;

  SELECT id, is_active, profile_completed, hide_from_current_employer
  INTO v_candidate
  FROM candidates WHERE id = p_candidate_id;

  IF v_candidate IS NULL THEN
    RAISE EXCEPTION 'Candidate not found';
  END IF;

  IF NOT v_candidate.is_active THEN
    RAISE EXCEPTION 'Candidate profile is not active';
  END IF;

  IF NOT v_candidate.profile_completed THEN
    RAISE EXCEPTION 'Candidate profile is not complete';
  END IF;

  -- Blocked company check
  IF EXISTS (
    SELECT 1 FROM candidate_blocked_companies
    WHERE candidate_id = p_candidate_id
      AND company_id = v_company_id
  ) THEN
    RAISE EXCEPTION 'Bu adaya mesaj gönderemezsiniz';
  END IF;

  -- Hide from current employer check (brand + company name match)
  IF v_candidate.hide_from_current_employer THEN
    IF EXISTS (
      SELECT 1 FROM candidate_experiences ce
      JOIN brands b ON LOWER(TRIM(ce.marka)) = LOWER(TRIM(b.name))
        OR LOWER(TRIM(ce.sirket)) = LOWER(TRIM(b.name))
      WHERE ce.candidate_id = p_candidate_id
        AND ce.devam_ediyor = true
        AND b.company_id = v_company_id
    ) THEN
      RAISE EXCEPTION 'Bu adaya mesaj gönderemezsiniz';
    END IF;
    IF EXISTS (
      SELECT 1 FROM candidate_experiences ce
      JOIN companies co ON LOWER(TRIM(ce.sirket)) = LOWER(TRIM(co.company_name))
        OR LOWER(TRIM(ce.marka)) = LOWER(TRIM(co.company_name))
      WHERE ce.candidate_id = p_candidate_id
        AND ce.devam_ediyor = true
        AND co.id = v_company_id
    ) THEN
      RAISE EXCEPTION 'Bu adaya mesaj gönderemezsiniz';
    END IF;
  END IF;

  -- Position ownership check
  IF p_position_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM positions
      WHERE id = p_position_id AND company_id = v_company_id
    ) THEN
      RAISE EXCEPTION 'Position does not belong to your company';
    END IF;
  END IF;

  INSERT INTO employer_messages (sender_id, company_id, candidate_id, position_id, template_id, subject, body)
  VALUES (v_user_id, v_company_id, p_candidate_id, p_position_id, p_template_id, TRIM(p_subject), TRIM(p_body))
  RETURNING id INTO v_msg_id;

  RETURN v_msg_id;
END;
$$;

-- Reusable visibility helper
CREATE OR REPLACE FUNCTION check_candidate_visible_to_employer(p_candidate_id bigint)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_company_id bigint;
  v_candidate record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN false; END IF;

  SELECT company_id INTO v_company_id
  FROM hr_profiles WHERE id = v_user_id;
  IF v_company_id IS NULL THEN RETURN false; END IF;

  SELECT id, is_active, profile_completed, hide_from_current_employer
  INTO v_candidate
  FROM candidates WHERE id = p_candidate_id;

  IF v_candidate IS NULL THEN RETURN false; END IF;
  IF NOT v_candidate.is_active THEN RETURN false; END IF;
  IF NOT v_candidate.profile_completed THEN RETURN false; END IF;

  IF EXISTS (
    SELECT 1 FROM candidate_blocked_companies
    WHERE candidate_id = p_candidate_id AND company_id = v_company_id
  ) THEN RETURN false; END IF;

  IF v_candidate.hide_from_current_employer THEN
    IF EXISTS (
      SELECT 1 FROM candidate_experiences ce
      JOIN brands b ON LOWER(TRIM(ce.marka)) = LOWER(TRIM(b.name))
        OR LOWER(TRIM(ce.sirket)) = LOWER(TRIM(b.name))
      WHERE ce.candidate_id = p_candidate_id
        AND ce.devam_ediyor = true
        AND b.company_id = v_company_id
    ) THEN RETURN false; END IF;
    IF EXISTS (
      SELECT 1 FROM candidate_experiences ce
      JOIN companies co ON LOWER(TRIM(ce.sirket)) = LOWER(TRIM(co.company_name))
        OR LOWER(TRIM(ce.marka)) = LOWER(TRIM(co.company_name))
      WHERE ce.candidate_id = p_candidate_id
        AND ce.devam_ediyor = true
        AND co.id = v_company_id
    ) THEN RETURN false; END IF;
  END IF;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION check_candidate_visible_to_employer TO authenticated;


-- ╔═══════════════════════════════════════════════════════════════╗
-- ║  033: SUBSCRIPTIONS & PREMIUM SYSTEM                          ║
-- ╚═══════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type text NOT NULL CHECK (user_type IN ('candidate', 'employer')),
  plan text NOT NULL CHECK (plan IN ('pro', 'enterprise')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'trial', 'expired', 'cancelled')),
  auto_renew boolean NOT NULL DEFAULT true,
  amount integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'TRY',
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  renewed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id, user_type);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_type_status ON subscriptions(user_type, status);

CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS subscriptions_updated_at ON subscriptions;
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_subscriptions_updated_at();

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscriptions' AND policyname = 'subscriptions_user_read') THEN
    CREATE POLICY subscriptions_user_read ON subscriptions FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscriptions' AND policyname = 'subscriptions_admin_all') THEN
    CREATE POLICY subscriptions_admin_all ON subscriptions FOR ALL USING (is_admin());
  END IF;
END $$;

-- Employer daily usage tracking
CREATE TABLE IF NOT EXISTS employer_daily_usage (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  candidate_views integer NOT NULL DEFAULT 0,
  messages_sent integer NOT NULL DEFAULT 0,
  UNIQUE(user_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_employer_daily_usage_user_date ON employer_daily_usage(user_id, usage_date);

ALTER TABLE employer_daily_usage ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employer_daily_usage' AND policyname = 'edu_user_read') THEN
    CREATE POLICY edu_user_read ON employer_daily_usage FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employer_daily_usage' AND policyname = 'edu_admin_all') THEN
    CREATE POLICY edu_admin_all ON employer_daily_usage FOR ALL USING (is_admin());
  END IF;
END $$;

-- Premium helper functions
CREATE OR REPLACE FUNCTION is_premium_employer()
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM subscriptions
    WHERE user_id = auth.uid()
      AND user_type = 'employer'
      AND plan IN ('pro', 'enterprise')
      AND status IN ('active', 'trial')
      AND expires_at > now()
  );
END;
$$;

CREATE OR REPLACE FUNCTION get_employer_plan()
RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_plan text;
BEGIN
  SELECT plan INTO v_plan FROM subscriptions
  WHERE user_id = auth.uid()
    AND user_type = 'employer'
    AND status IN ('active', 'trial')
    AND expires_at > now()
  ORDER BY CASE plan WHEN 'enterprise' THEN 1 WHEN 'pro' THEN 2 ELSE 3 END
  LIMIT 1;
  RETURN COALESCE(v_plan, 'demo');
END;
$$;

CREATE OR REPLACE FUNCTION check_employer_usage_limit(p_action text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_plan text; v_usage record;
BEGIN
  IF NOT is_employer() THEN RETURN true; END IF;
  v_plan := get_employer_plan();
  IF v_plan IN ('pro', 'enterprise') THEN RETURN true; END IF;

  SELECT candidate_views, messages_sent INTO v_usage
  FROM employer_daily_usage
  WHERE user_id = auth.uid() AND usage_date = CURRENT_DATE;

  IF p_action = 'candidate_view' THEN
    RETURN COALESCE(v_usage.candidate_views, 0) < 5;
  ELSIF p_action = 'message' THEN
    RETURN false;
  END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION increment_employer_usage(p_action text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT is_employer() THEN RETURN; END IF;
  INSERT INTO employer_daily_usage (user_id, usage_date, candidate_views, messages_sent)
  VALUES (
    auth.uid(), CURRENT_DATE,
    CASE WHEN p_action = 'candidate_view' THEN 1 ELSE 0 END,
    CASE WHEN p_action = 'message' THEN 1 ELSE 0 END
  )
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET
    candidate_views = employer_daily_usage.candidate_views +
      CASE WHEN p_action = 'candidate_view' THEN 1 ELSE 0 END,
    messages_sent = employer_daily_usage.messages_sent +
      CASE WHEN p_action = 'message' THEN 1 ELSE 0 END;
END;
$$;

GRANT EXECUTE ON FUNCTION is_premium_employer TO authenticated;
GRANT EXECUTE ON FUNCTION get_employer_plan TO authenticated;
GRANT EXECUTE ON FUNCTION check_employer_usage_limit TO authenticated;
GRANT EXECUTE ON FUNCTION increment_employer_usage TO authenticated;


-- ╔═══════════════════════════════════════════════════════════════╗
-- ║  034: SMS PHONE VERIFICATION                                  ║
-- ╚═══════════════════════════════════════════════════════════════╝

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS phone_verified_at timestamptz;

CREATE TABLE IF NOT EXISTS phone_verifications (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  telefon text NOT NULL,
  otp_code text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'verified', 'expired', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  verified_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_phone_verifications_user ON phone_verifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_status ON phone_verifications(status, expires_at);

ALTER TABLE phone_verifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'phone_verifications' AND policyname = 'pv_user_read') THEN
    CREATE POLICY pv_user_read ON phone_verifications FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'phone_verifications' AND policyname = 'pv_admin_all') THEN
    CREATE POLICY pv_admin_all ON phone_verifications FOR ALL USING (is_admin());
  END IF;
END $$;

CREATE OR REPLACE FUNCTION request_phone_otp(p_telefon text)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid; v_candidate_id bigint; v_daily_count integer; v_otp text; v_record_id bigint;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Giriş yapmalısınız');
  END IF;

  SELECT id INTO v_candidate_id FROM candidates WHERE user_id = v_user_id;
  IF v_candidate_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Aday profili bulunamadı');
  END IF;

  SELECT COUNT(*) INTO v_daily_count FROM phone_verifications
  WHERE user_id = v_user_id AND created_at > (now() - interval '24 hours');

  IF v_daily_count >= 5 THEN
    RETURN json_build_object('success', false, 'error', 'Günlük doğrulama limiti aşıldı. 24 saat sonra tekrar deneyin.');
  END IF;

  UPDATE phone_verifications SET status = 'expired'
  WHERE user_id = v_user_id AND status = 'pending';

  v_otp := LPAD(FLOOR(RANDOM() * 1000000)::text, 6, '0');

  INSERT INTO phone_verifications (user_id, telefon, otp_code)
  VALUES (v_user_id, TRIM(p_telefon), v_otp)
  RETURNING id INTO v_record_id;

  RETURN json_build_object('success', true, 'verification_id', v_record_id, 'expires_in_seconds', 300);
END;
$$;

CREATE OR REPLACE FUNCTION verify_phone_otp(p_verification_id bigint, p_code text)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_user_id uuid; v_record record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Giriş yapmalısınız');
  END IF;

  SELECT * INTO v_record FROM phone_verifications
  WHERE id = p_verification_id AND user_id = v_user_id;

  IF v_record IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Doğrulama kaydı bulunamadı');
  END IF;
  IF v_record.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Bu doğrulama kodu artık geçerli değil');
  END IF;
  IF v_record.expires_at < now() THEN
    UPDATE phone_verifications SET status = 'expired' WHERE id = p_verification_id;
    RETURN json_build_object('success', false, 'error', 'Doğrulama kodunun süresi doldu');
  END IF;

  UPDATE phone_verifications SET attempts = attempts + 1 WHERE id = p_verification_id;

  IF v_record.attempts >= v_record.max_attempts THEN
    UPDATE phone_verifications SET status = 'failed' WHERE id = p_verification_id;
    RETURN json_build_object('success', false, 'error', 'Maksimum deneme sayısına ulaşıldı');
  END IF;

  IF TRIM(p_code) != v_record.otp_code THEN
    RETURN json_build_object('success', false, 'error', 'Doğrulama kodu hatalı', 'remaining_attempts', v_record.max_attempts - v_record.attempts - 1);
  END IF;

  UPDATE phone_verifications SET status = 'verified', verified_at = now() WHERE id = p_verification_id;
  UPDATE candidates SET phone_verified = true, phone_verified_at = now() WHERE user_id = v_user_id;

  RETURN json_build_object('success', true, 'message', 'Telefon numaranız doğrulandı');
END;
$$;

GRANT EXECUTE ON FUNCTION request_phone_otp TO authenticated;
GRANT EXECUTE ON FUNCTION verify_phone_otp TO authenticated;


-- ╔═══════════════════════════════════════════════════════════════╗
-- ║  035: PROFILE COMPLETION THRESHOLD                            ║
-- ╚═══════════════════════════════════════════════════════════════╝

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS profile_completion_pct int NOT NULL DEFAULT 0;
ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_profile_completion_pct_check;
ALTER TABLE candidates ADD CONSTRAINT candidates_profile_completion_pct_check
  CHECK (profile_completion_pct >= 0 AND profile_completion_pct <= 100);

-- Backfill (coarse initial scoring)
DO $$
DECLARE r candidates%ROWTYPE; score int;
BEGIN
  FOR r IN SELECT * FROM candidates LOOP
    score := 0;
    IF coalesce(nullif(trim(r.full_name), ''), '') <> '' THEN score := score + 10; END IF;
    IF coalesce(nullif(trim(r.adres_il), ''), '') <> '' THEN score := score + 5; END IF;
    IF EXISTS (SELECT 1 FROM candidate_work_preferences wp WHERE wp.candidate_id = r.id) THEN score := score + 15; END IF;
    IF EXISTS (SELECT 1 FROM candidate_experiences e WHERE e.candidate_id = r.id) THEN score := score + 25; END IF;
    IF EXISTS (SELECT 1 FROM candidate_education ed WHERE ed.candidate_id = r.id) THEN score := score + 15; END IF;
    IF EXISTS (SELECT 1 FROM candidate_languages lg WHERE lg.candidate_id = r.id) THEN score := score + 10; END IF;
    IF r.tercih_sehirler IS NOT NULL AND array_length(r.tercih_sehirler, 1) > 0 THEN score := score + 10; END IF;
    IF score > 100 THEN score := 100; ELSIF score < 0 THEN score := 0; END IF;
    UPDATE candidates SET profile_completion_pct = score WHERE id = r.id;
  END LOOP;
END;
$$;

-- Updated employer read policies (active + completed OR >=45%)
DROP POLICY IF EXISTS candidates_employer_read ON candidates;
CREATE POLICY candidates_employer_read ON candidates
  FOR SELECT USING (
    is_employer() AND is_active = true
    AND (profile_completed = true OR profile_completion_pct >= 45)
  );

DROP POLICY IF EXISTS experiences_employer_read ON candidate_experiences;
CREATE POLICY experiences_employer_read ON candidate_experiences
  FOR SELECT USING (
    is_employer() AND candidate_id IN (
      SELECT id FROM candidates WHERE is_active = true AND (profile_completed = true OR profile_completion_pct >= 45)
    )
  );

DROP POLICY IF EXISTS work_prefs_employer_read ON candidate_work_preferences;
CREATE POLICY work_prefs_employer_read ON candidate_work_preferences
  FOR SELECT USING (
    is_employer() AND candidate_id IN (
      SELECT id FROM candidates WHERE is_active = true AND (profile_completed = true OR profile_completion_pct >= 45)
    )
  );

DROP POLICY IF EXISTS education_employer_read ON candidate_education;
CREATE POLICY education_employer_read ON candidate_education
  FOR SELECT USING (
    is_employer() AND candidate_id IN (
      SELECT id FROM candidates WHERE is_active = true AND (profile_completed = true OR profile_completion_pct >= 45)
    )
  );

DROP POLICY IF EXISTS languages_employer_read ON candidate_languages;
CREATE POLICY languages_employer_read ON candidate_languages
  FOR SELECT USING (
    is_employer() AND candidate_id IN (
      SELECT id FROM candidates WHERE is_active = true AND (profile_completed = true OR profile_completion_pct >= 45)
    )
  );


-- ╔═══════════════════════════════════════════════════════════════╗
-- ║  036: PROFILE COMPLETION SYNC + ADMIN HARDENING               ║
-- ╚═══════════════════════════════════════════════════════════════╝

-- Scoring function (normalized: uses candidate_location_preferences not tercih_sehirler)
CREATE OR REPLACE FUNCTION compute_candidate_profile_completion(
  p_candidate_id bigint, p_full_name text, p_adres_il text
)
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE score int := 0;
BEGIN
  IF coalesce(nullif(trim(p_full_name), ''), '') <> '' THEN score := score + 10; END IF;
  IF coalesce(nullif(trim(p_adres_il), ''), '') <> '' THEN score := score + 5; END IF;
  IF EXISTS (SELECT 1 FROM candidate_work_preferences wp WHERE wp.candidate_id = p_candidate_id) THEN score := score + 15; END IF;
  IF EXISTS (SELECT 1 FROM candidate_experiences e WHERE e.candidate_id = p_candidate_id) THEN score := score + 25; END IF;
  IF EXISTS (SELECT 1 FROM candidate_education ed WHERE ed.candidate_id = p_candidate_id) THEN score := score + 15; END IF;
  IF EXISTS (SELECT 1 FROM candidate_languages lg WHERE lg.candidate_id = p_candidate_id) THEN score := score + 10; END IF;
  IF EXISTS (SELECT 1 FROM candidate_location_preferences lp WHERE lp.candidate_id = p_candidate_id) THEN score := score + 10; END IF;
  IF score > 100 THEN score := 100; ELSIF score < 0 THEN score := 0; END IF;
  RETURN score;
END;
$$;

-- Refresh helper
CREATE OR REPLACE FUNCTION refresh_candidate_profile_completion(p_candidate_id bigint)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_full_name text; v_adres_il text; v_score int;
BEGIN
  SELECT full_name, adres_il INTO v_full_name, v_adres_il FROM candidates WHERE id = p_candidate_id;
  IF NOT FOUND THEN RETURN; END IF;
  v_score := compute_candidate_profile_completion(p_candidate_id, v_full_name, v_adres_il);
  UPDATE candidates SET profile_completion_pct = v_score WHERE id = p_candidate_id;
END;
$$;

-- Candidates trigger (recursion-safe)
DROP TRIGGER IF EXISTS trg_candidates_profile_completion ON candidates;
DROP FUNCTION IF EXISTS trg_candidates_profile_completion_fn() CASCADE;

CREATE FUNCTION trg_candidates_profile_completion_fn()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id bigint;
BEGIN
  v_id := COALESCE(NEW.id, OLD.id);
  IF v_id IS NULL THEN RETURN NEW; END IF;
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  PERFORM refresh_candidate_profile_completion(v_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_candidates_profile_completion
AFTER INSERT OR UPDATE ON candidates
FOR EACH ROW EXECUTE FUNCTION trg_candidates_profile_completion_fn();

-- Child table triggers
DROP TRIGGER IF EXISTS trg_work_prefs_profile_completion ON candidate_work_preferences;
DROP TRIGGER IF EXISTS trg_experiences_profile_completion ON candidate_experiences;
DROP TRIGGER IF EXISTS trg_education_profile_completion ON candidate_education;
DROP TRIGGER IF EXISTS trg_languages_profile_completion ON candidate_languages;
DROP TRIGGER IF EXISTS trg_loc_prefs_profile_completion ON candidate_location_preferences;
DROP FUNCTION IF EXISTS trg_child_profile_completion_fn() CASCADE;

CREATE FUNCTION trg_child_profile_completion_fn()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id bigint;
BEGIN
  v_id := COALESCE(
    CASE WHEN TG_ARGV[0] = 'candidate_id' THEN COALESCE(NEW.candidate_id, OLD.candidate_id) END,
    COALESCE(NEW.candidate_id, OLD.candidate_id)
  );
  IF v_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  PERFORM refresh_candidate_profile_completion(v_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_work_prefs_profile_completion
AFTER INSERT OR UPDATE OR DELETE ON candidate_work_preferences
FOR EACH ROW EXECUTE FUNCTION trg_child_profile_completion_fn('candidate_id');

CREATE TRIGGER trg_experiences_profile_completion
AFTER INSERT OR UPDATE OR DELETE ON candidate_experiences
FOR EACH ROW EXECUTE FUNCTION trg_child_profile_completion_fn('candidate_id');

CREATE TRIGGER trg_education_profile_completion
AFTER INSERT OR UPDATE OR DELETE ON candidate_education
FOR EACH ROW EXECUTE FUNCTION trg_child_profile_completion_fn('candidate_id');

CREATE TRIGGER trg_languages_profile_completion
AFTER INSERT OR UPDATE OR DELETE ON candidate_languages
FOR EACH ROW EXECUTE FUNCTION trg_child_profile_completion_fn('candidate_id');

CREATE TRIGGER trg_loc_prefs_profile_completion
AFTER INSERT OR UPDATE OR DELETE ON candidate_location_preferences
FOR EACH ROW EXECUTE FUNCTION trg_child_profile_completion_fn('candidate_id');

-- Admin read hardening (idempotent)
DROP POLICY IF EXISTS hr_admin_read ON hr_profiles;
CREATE POLICY hr_admin_read ON hr_profiles FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS candidates_admin_read ON candidates;
CREATE POLICY candidates_admin_read ON candidates FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS companies_admin_read ON companies;
CREATE POLICY companies_admin_read ON companies FOR SELECT USING (is_admin());

-- Full re-sync (normalize all scores with location_preferences model)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM candidates LOOP
    PERFORM refresh_candidate_profile_completion(r.id);
  END LOOP;
END;
$$;


-- ═══════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES (run after deploy)
-- ═══════════════════════════════════════════════════════════════
-- SELECT get_employer_plan();
-- SELECT check_employer_usage_limit('candidate_view');
-- SELECT COUNT(*) FROM subscriptions;
-- SELECT COUNT(*) FROM phone_verifications;
-- SELECT id, full_name, profile_completion_pct FROM candidates ORDER BY id LIMIT 10;
-- SELECT check_candidate_visible_to_employer(1);
