-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Asama 84 — Migration B: Onboarding RPC'leri                 ║
-- ║                                                              ║
-- ║  save_onboarding_step(p_step, p_data)                        ║
-- ║    - SECURITY INVOKER (RLS uygulanir, auth.uid() = id)       ║
-- ║    - Allowed-keys whitelist (mass-assignment koruma)          ║
-- ║    - Step 1..8 zorla                                         ║
-- ║                                                              ║
-- ║  complete_onboarding()                                       ║
-- ║    - Hibrit set: onboarding_completed=true                   ║
-- ║                + onboarding_completed_at=now()               ║
-- ║    - is_employer() RLS contract korunur                      ║
-- ║                                                              ║
-- ║  T3 — auditor (RLS + KVKK) + Codex review zorunlu            ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════
-- 1. save_onboarding_step
--    SECURITY INVOKER → RLS'in auth.uid() = id policy'si uygular
--    Yalnizca whitelist'teki kolonlari guncelliyor — istemci JSON'a
--    'is_admin' veya 'company_id' ekleyemez (mass-assignment guard).
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

  IF p_step IS NULL OR p_step < 1 OR p_step > 8 THEN
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
-- 2. complete_onboarding
--    Hibrit set: legacy bool + audit timestamp
--    RLS auth.uid() = id zaten satir filtreliyor.
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

  UPDATE hr_profiles SET
    onboarding_completed    = true,
    onboarding_completed_at = now(),
    onboarding_step         = 8
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
-- 3. get_onboarding_state
--    Wizard load anında "kaldigi step" + dolu alanlari okur.
--    auth.uid() = id (kendi satiri).
-- ═══════════════════════════════════════════════

-- ═══════════════════════════════════════════════
-- 4. register_employer EXTEND
--    Mevcut imza (028 migration): (p_email, p_sirket, p_website)
--    Yeni imza: (p_email, p_sirket, p_website, p_phone, p_first_name, p_last_name)
--    Telefon + ad + soyad'i hr_profiles'a yazar.
--    Asama 84 signup form'u bu RPC'yi gunceller.
--    Eski 3-arg cagri korunur (geriye donuk uyum) — yeni opsiyonel param.
--    onboarding_step = 1 set edilir (wizard ilk adim).
-- ═══════════════════════════════════════════════

CREATE OR REPLACE FUNCTION register_employer(
  p_email text,
  p_sirket text DEFAULT NULL,
  p_website text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_first_name text DEFAULT NULL,
  p_last_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_is_free boolean;
  v_domain_match boolean;
  v_existing boolean;
  v_phone_clean text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Telefon temizle (sadece rakam) ve uzunluk kontrol
  v_phone_clean := NULLIF(regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g'), '');
  IF v_phone_clean IS NOT NULL AND (length(v_phone_clean) < 7 OR length(v_phone_clean) > 20) THEN
    RAISE EXCEPTION 'invalid phone length';
  END IF;

  -- Domain bilgileri
  v_is_free := is_free_email_domain(p_email);
  v_domain_match := false;
  IF p_website IS NOT NULL AND NOT v_is_free THEN
    v_domain_match := check_domain_match(p_email, p_website);
  END IF;

  -- Idempotent: profil varsa update; yoksa insert
  SELECT EXISTS(SELECT 1 FROM hr_profiles WHERE id = v_user_id) INTO v_existing;

  IF v_existing THEN
    UPDATE hr_profiles SET
      email           = COALESCE(email, p_email),
      sirket          = COALESCE(sirket, NULLIF(TRIM(COALESCE(p_sirket, '')), '')),
      company_name    = COALESCE(company_name, NULLIF(TRIM(COALESCE(p_sirket, '')), '')),
      web_sitesi      = COALESCE(web_sitesi, NULLIF(TRIM(COALESCE(p_website, '')), '')),
      phone           = COALESCE(phone, v_phone_clean),
      ad              = COALESCE(ad, NULLIF(TRIM(COALESCE(p_first_name, '')), '')),
      soyad           = COALESCE(soyad, NULLIF(TRIM(COALESCE(p_last_name, '')), '')),
      domain_verified = COALESCE(domain_verified, v_domain_match),
      onboarding_step = COALESCE(onboarding_step, 1)
    WHERE id = v_user_id;

    RETURN jsonb_build_object(
      'status', 'updated',
      'is_free_email', v_is_free,
      'domain_verified', v_domain_match,
      'onboarding_step', (SELECT onboarding_step FROM hr_profiles WHERE id = v_user_id),
      'onboarding_completed', (SELECT onboarding_completed FROM hr_profiles WHERE id = v_user_id)
    );
  END IF;

  INSERT INTO hr_profiles (
    id, email, sirket, company_name, web_sitesi,
    phone, ad, soyad,
    employer_role, domain_verified,
    onboarding_step, onboarding_completed
  )
  VALUES (
    v_user_id,
    p_email,
    NULLIF(TRIM(COALESCE(p_sirket, '')), ''),
    NULLIF(TRIM(COALESCE(p_sirket, '')), ''),
    NULLIF(TRIM(COALESCE(p_website, '')), ''),
    v_phone_clean,
    NULLIF(TRIM(COALESCE(p_first_name, '')), ''),
    NULLIF(TRIM(COALESCE(p_last_name, '')), ''),
    'admin',
    v_domain_match,
    1,
    false
  );

  RETURN jsonb_build_object(
    'status', 'created',
    'is_free_email', v_is_free,
    'domain_verified', v_domain_match,
    'employer_role', 'admin',
    'onboarding_step', 1,
    'onboarding_completed', false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION register_employer(text, text, text, text, text, text) TO authenticated;
-- Eski 3-arg overload (028) hala mevcut (CREATE OR REPLACE 6-arg overload yarattigindan
-- geriye donuk uyum icin eski fonksiyon imza ayri kalmali — eski uye-ol.html cagrilari
-- bozulmasin diye explicit overload tutuluyor)

-- ═══════════════════════════════════════════════
-- 5. get_onboarding_state
--    Wizard load aninda "kaldigi step" + dolu alanlari okur.
-- ═══════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_onboarding_state()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_row hr_profiles%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;

  SELECT * INTO v_row FROM hr_profiles WHERE id = v_user_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'onboarding_completed', v_row.onboarding_completed,
    'onboarding_step',      COALESCE(v_row.onboarding_step, 1),
    'segment_type',         v_row.segment_type,
    'team_size',            v_row.team_size,
    'monthly_positions',    v_row.monthly_positions,
    'urgency',              v_row.urgency,
    'brands',               v_row.brands,
    'position_types',       v_row.position_types,
    'phone',                v_row.phone,
    'company_name',         v_row.company_name,
    'marketing_opt_in',     v_row.marketing_opt_in,
    'email',                v_row.email
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_onboarding_state() TO authenticated;

-- ═══════════════════════════════════════════════
-- 6. ADMIN — kurumsal signup listesi
--    admin_get_hr_signups: hr_profiles uzerinden lead listesi
--    Filter: 'all' | 'in_progress' | 'completed' | 'new'
--    Admin check: admin_users tablosu (var olan pattern)
-- ═══════════════════════════════════════════════

CREATE OR REPLACE FUNCTION admin_get_hr_signups(
  p_filter text DEFAULT 'all',
  p_limit  int  DEFAULT 100,
  p_offset int  DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_is_admin boolean;
  v_results jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- admin_users tablo varsa onu kullan; yoksa user_metadata fallback
  BEGIN
    SELECT EXISTS(SELECT 1 FROM admin_users WHERE id = v_user_id) INTO v_is_admin;
  EXCEPTION WHEN undefined_table THEN
    SELECT EXISTS(
      SELECT 1 FROM auth.users
      WHERE id = v_user_id
        AND (raw_user_meta_data->>'role' = 'admin' OR raw_user_meta_data->>'is_admin' = 'true')
    ) INTO v_is_admin;
  END;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT jsonb_build_object(
    'rows', COALESCE(jsonb_agg(row_to_json(r)::jsonb), '[]'::jsonb),
    'total', (
      SELECT count(*) FROM hr_profiles
      WHERE (
        p_filter = 'all'
        OR (p_filter = 'new'         AND COALESCE(onboarding_step, 1) = 1 AND onboarding_completed = false)
        OR (p_filter = 'in_progress' AND onboarding_completed = false AND COALESCE(onboarding_step, 1) > 1)
        OR (p_filter = 'completed'   AND onboarding_completed = true)
      )
    )
  )
  INTO v_results
  FROM (
    SELECT
      id,
      email,
      ad,
      soyad,
      COALESCE(company_name, sirket) AS company,
      phone,
      segment_type,
      team_size,
      monthly_positions,
      urgency,
      brands,
      position_types,
      marketing_opt_in,
      onboarding_step,
      onboarding_completed,
      onboarding_completed_at,
      created_at
    FROM hr_profiles
    WHERE (
      p_filter = 'all'
      OR (p_filter = 'new'         AND COALESCE(onboarding_step, 1) = 1 AND onboarding_completed = false)
      OR (p_filter = 'in_progress' AND onboarding_completed = false AND COALESCE(onboarding_step, 1) > 1)
      OR (p_filter = 'completed'   AND onboarding_completed = true)
    )
    ORDER BY
      CASE WHEN onboarding_completed_at IS NOT NULL THEN onboarding_completed_at ELSE created_at END DESC
    LIMIT p_limit OFFSET p_offset
  ) r;

  RETURN v_results;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_hr_signups(text, int, int) TO authenticated;

