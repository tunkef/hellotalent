-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Asama 84.3 — Onboarding wizard: 8 step → 9 step             ║
-- ║                                                              ║
-- ║  Tuna feedback: hero metnini wizard'in 1. kapak step'ine     ║
-- ║  tasi. Mevcut 8 backend step korunur, frontend'de bir        ║
-- ║  welcome step eklenir → mantıksal 9 step.                    ║
-- ║                                                              ║
-- ║  Backend implikasyonu:                                       ║
-- ║    - onboarding_step CHECK 1..8 → 1..9                       ║
-- ║    - save_onboarding_step p_step ust limit 8 → 9             ║
-- ║    - complete_onboarding final step 8 → 9                    ║
-- ║    - state machine semantigi: 1=welcome, 2=segment,          ║
-- ║      3=phone-review, 4=brands, 5=team, 6=positions,          ║
-- ║      7=monthly, 8=urgency, 9=consent                         ║
-- ║                                                              ║
-- ║  T3 — auditor + code-reviewer + Codex review                 ║
-- ║                                                              ║
-- ║  RLS: hr_profiles policy'leri (auth.uid() = id) korunur      ║
-- ║  GRANT: save_onboarding_step / complete_onboarding zaten     ║
-- ║         authenticated rolune verilmis (parent migration)     ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════
-- 1. CHECK constraint guncellemesi: 1..8 → 1..9
-- ═══════════════════════════════════════════════

ALTER TABLE hr_profiles
  DROP CONSTRAINT IF EXISTS hr_profiles_onboarding_step_check;

ALTER TABLE hr_profiles
  ADD CONSTRAINT hr_profiles_onboarding_step_check
  CHECK (onboarding_step BETWEEN 1 AND 9);

-- ═══════════════════════════════════════════════
-- 2. save_onboarding_step — p_step limit 8 → 9
--    Diger mantik aynen korunur (whitelist + GREATEST overwrite)
-- ═══════════════════════════════════════════════

CREATE OR REPLACE FUNCTION save_onboarding_step(
  p_step int,
  p_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_allowed_keys text[] := ARRAY[
    'segment_type',
    'team_size',
    'monthly_positions',
    'urgency',
    'brands',
    'position_types',
    'phone',
    'company_name',
    'marketing_opt_in'
  ];
  v_filtered jsonb := '{}'::jsonb;
  v_key text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;

  -- Asama 84.3: 1..9 (1=welcome, 9=consent)
  IF p_step IS NULL OR p_step < 1 OR p_step > 9 THEN
    RAISE EXCEPTION 'invalid step: %', p_step;
  END IF;

  IF p_data IS NULL OR jsonb_typeof(p_data) <> 'object' THEN
    RAISE EXCEPTION 'data must be object';
  END IF;

  -- Whitelist filter — sadece izinli kolonlar
  FOREACH v_key IN ARRAY v_allowed_keys LOOP
    IF p_data ? v_key THEN
      v_filtered := v_filtered || jsonb_build_object(v_key, p_data -> v_key);
    END IF;
  END LOOP;

  -- Tek UPDATE — RLS auth.uid() = id zaten gating yapar
  -- COALESCE pattern: yeni alanlar varsa overwrite, yoksa mevcut korunur
  UPDATE hr_profiles SET
    segment_type      = COALESCE((v_filtered ->> 'segment_type')::text,      segment_type),
    team_size         = COALESCE((v_filtered ->> 'team_size')::text,         team_size),
    monthly_positions = COALESCE((v_filtered ->> 'monthly_positions')::text, monthly_positions),
    urgency           = COALESCE((v_filtered ->> 'urgency')::text,           urgency),
    brands            = COALESCE(v_filtered -> 'brands',                     brands),
    position_types    = COALESCE(v_filtered -> 'position_types',             position_types),
    phone             = COALESCE((v_filtered ->> 'phone')::text,             phone),
    company_name      = COALESCE((v_filtered ->> 'company_name')::text,      company_name),
    marketing_opt_in  = COALESCE((v_filtered ->> 'marketing_opt_in')::boolean, marketing_opt_in),
    onboarding_step      = GREATEST(COALESCE(onboarding_step, 1), p_step),
    onboarding_responses = COALESCE(onboarding_responses, '{}'::jsonb)
                            || jsonb_build_object('step_' || p_step, v_filtered)
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'hr_profile not found for current user';
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'step', p_step,
    'persisted_keys', (SELECT array_agg(k) FROM jsonb_object_keys(v_filtered) k)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION save_onboarding_step(int, jsonb) TO authenticated;

-- ═══════════════════════════════════════════════
-- 3. complete_onboarding — final step 8 → 9
--    Idempotent + zorunlu alan defansif kontrol korunur
-- ═══════════════════════════════════════════════

CREATE OR REPLACE FUNCTION complete_onboarding()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_already boolean;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;

  -- Idempotent: ikinci cagriya guvenli yanit
  SELECT onboarding_completed INTO v_already
    FROM hr_profiles WHERE id = v_user_id;

  IF v_already IS NULL THEN
    RAISE EXCEPTION 'hr_profile not found for current user';
  END IF;

  IF v_already = true THEN
    RETURN jsonb_build_object('ok', true, 'already_completed', true);
  END IF;

  -- Tum zorunlu wizard kolonlari dolmus mu? (defansif kontrol)
  IF NOT EXISTS (
    SELECT 1 FROM hr_profiles
    WHERE id = v_user_id
      AND segment_type IS NOT NULL
      AND team_size IS NOT NULL
      AND monthly_positions IS NOT NULL
      AND company_name IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'wizard incomplete — required fields missing';
  END IF;

  -- Asama 84.3: final step 9 (consent)
  UPDATE hr_profiles SET
    onboarding_completed    = true,
    onboarding_completed_at = now(),
    onboarding_step         = 9
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'ok', true,
    'already_completed', false,
    'completed_at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION complete_onboarding() TO authenticated;

-- ═══════════════════════════════════════════════
-- 4. Notlar:
--    - Eski kayitlar onboarding_step IN (1..8) — yeni CHECK
--      1..9 daha gevsek, hicbir mevcut satir reject olmaz.
--    - Tamamlanmis profillerde onboarding_completed=true zaten,
--      onboarding_step=8 → 9 migrate edilmesine gerek yok
--      (UI is_employer() ve onboarding_completed bool bakiyor).
--    - register_employer fonksiyonu (parent migration) hala
--      onboarding_step=1 set ediyor — yeni semantikte 1=welcome,
--      yeni kullanici welcome screen gorur (dogru davranis).
-- ═══════════════════════════════════════════════
