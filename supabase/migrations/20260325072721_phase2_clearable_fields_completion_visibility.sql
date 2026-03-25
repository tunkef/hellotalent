-- ═══════════════════════════════════════════════════════════════
-- Migration: Phase 2 — clearable fields, ilk_deneyim completion, visibility alignment
-- Date: 2026-03-25
--
-- Fixes three issues:
--   1. save_candidate_profile: optional root fields now clearable to NULL.
--      Previously COALESCE(p_profile->>'field', field) kept old values when
--      frontend sent null. Fix: use p_profile->>'field' directly for optional
--      fields. Required fields (full_name, email) keep COALESCE.
--
--   2. compute_candidate_profile_completion: ilk_deneyim = true now awards
--      the 25 experience points, matching frontend calculateCompletion().
--
--   3. check_candidate_visible_to_employer + send_employer_message: visibility
--      now uses the same compound rule as search RPC and RLS policies:
--        is_active = true AND (profile_completed = true OR profile_completion_pct >= 45)
--      Previously both functions used boolean-only (profile_completed = true),
--      causing candidates visible in search to be unreachable by message.
--
-- Depends on: 048 (save_candidate_profile), 039 (completion fn), 049 (visibility fns)
-- Safe: All CREATE OR REPLACE — no table changes, no data loss.
-- ═══════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════
-- PART 1: save_candidate_profile — clearable optional fields
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION save_candidate_profile(
  p_profile jsonb,
  p_experiences jsonb DEFAULT '[]'::jsonb,
  p_education jsonb DEFAULT '[]'::jsonb,
  p_certificates jsonb DEFAULT '[]'::jsonb,
  p_languages jsonb DEFAULT '[]'::jsonb,
  p_target_roles jsonb DEFAULT '[]'::jsonb,
  p_work_prefs jsonb DEFAULT NULL,
  p_brand_interests jsonb DEFAULT '[]'::jsonb,
  p_locations jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_candidate_id bigint;
  v_son_sirket text;
  v_son_pozisyon text;
  v_son_marka text;
  v_halen boolean := false;
  v_toplam_ay int := 0;
  v_loc record;
  v_loc_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id INTO v_candidate_id FROM candidates WHERE user_id = v_user_id;

  IF v_candidate_id IS NULL THEN
    INSERT INTO candidates (user_id, created_at, updated_at)
    VALUES (v_user_id, now(), now())
    RETURNING id INTO v_candidate_id;
  END IF;

  -- Required fields keep COALESCE (never cleared to null).
  -- Optional fields: key present (even with null value) → set/clear; key absent → keep old value.
  -- This is omission-safe: a partial caller that omits 'telefon' won't wipe it.
  UPDATE candidates SET
    full_name         = COALESCE(p_profile->>'full_name', full_name),
    email             = COALESCE(p_profile->>'email', email),
    telefon           = CASE WHEN p_profile ? 'telefon'        THEN p_profile->>'telefon'        ELSE telefon        END,
    cinsiyet          = CASE WHEN p_profile ? 'cinsiyet'       THEN p_profile->>'cinsiyet'       ELSE cinsiyet       END,
    dogum_yili        = CASE WHEN p_profile ? 'dogum_yili'     THEN p_profile->>'dogum_yili'     ELSE dogum_yili     END,
    adres_il          = CASE WHEN p_profile ? 'adres_il'       THEN p_profile->>'adres_il'       ELSE adres_il       END,
    adres_ilce        = CASE WHEN p_profile ? 'adres_ilce'     THEN p_profile->>'adres_ilce'     ELSE adres_ilce     END,
    linkedin          = CASE WHEN p_profile ? 'linkedin'       THEN p_profile->>'linkedin'       ELSE linkedin       END,
    engel_durumu      = CASE WHEN p_profile ? 'engel_durumu'   THEN p_profile->>'engel_durumu'   ELSE engel_durumu   END,
    askerlik_durumu   = CASE WHEN p_profile ? 'askerlik_durumu' THEN p_profile->>'askerlik_durumu' ELSE askerlik_durumu END,
    is_active         = COALESCE((p_profile->>'is_active')::boolean, is_active),
    ilk_deneyim       = COALESCE((p_profile->>'ilk_deneyim')::boolean, ilk_deneyim),
    profile_completed = COALESCE((p_profile->>'profile_completed')::boolean, profile_completed),
    updated_at        = now()
  WHERE id = v_candidate_id;

  -- ── EXPERIENCES ────────────────────────────────────────────
  DELETE FROM candidate_experiences WHERE candidate_id = v_candidate_id;

  INSERT INTO candidate_experiences (
    candidate_id, sirket, marka, pozisyon, departman, sektor, segment,
    istihdam_tipi, kidem_seviyesi, lokasyon_tipi, sehir, takim_buyuklugu,
    basari_ozeti, baslangic_ay, baslangic_yil, bitis_ay, bitis_yil,
    devam_ediyor, ayrilma_nedeni, sira,
    rol_ailesi, rol_unvani,
    company_id, brand_id
  )
  SELECT
    v_candidate_id,
    e->>'sirket', e->>'marka', e->>'pozisyon', e->>'departman', e->>'sektor',
    e->>'segment', e->>'istihdam_tipi', e->>'kidem_seviyesi', e->>'lokasyon_tipi',
    e->>'sehir', e->>'takim_buyuklugu', e->>'basari_ozeti',
    (e->>'baslangic_ay')::int, (e->>'baslangic_yil')::int,
    (e->>'bitis_ay')::int, (e->>'bitis_yil')::int,
    COALESCE((e->>'devam_ediyor')::boolean, false),
    e->>'ayrilma_nedeni',
    (ord - 1)::int,
    e->>'rol_ailesi', e->>'rol_unvani',
    (e->>'company_id')::bigint, (e->>'brand_id')::bigint
  FROM jsonb_array_elements(p_experiences) WITH ORDINALITY AS t(e, ord);

  -- ── DERIVED FIELDS ─────────────────────────────────────────
  SELECT sirket, pozisyon, marka
  INTO v_son_sirket, v_son_pozisyon, v_son_marka
  FROM candidate_experiences
  WHERE candidate_id = v_candidate_id
  ORDER BY devam_ediyor DESC, baslangic_yil DESC, COALESCE(baslangic_ay, 1) DESC
  LIMIT 1;

  SELECT EXISTS(
    SELECT 1 FROM candidate_experiences
    WHERE candidate_id = v_candidate_id AND devam_ediyor = true
  ) INTO v_halen;

  SELECT COALESCE(SUM(
    CASE
      WHEN devam_ediyor THEN
        (EXTRACT(YEAR FROM now())::int - baslangic_yil) * 12
        + (EXTRACT(MONTH FROM now())::int - COALESCE(baslangic_ay, 1))
      WHEN bitis_yil IS NOT NULL THEN
        (bitis_yil - baslangic_yil) * 12
        + (COALESCE(bitis_ay, 1) - COALESCE(baslangic_ay, 1))
      ELSE 0
    END
  ), 0)::int
  INTO v_toplam_ay
  FROM candidate_experiences
  WHERE candidate_id = v_candidate_id;

  IF v_toplam_ay < 0 THEN v_toplam_ay := 0; END IF;

  UPDATE candidates SET
    son_sirket = v_son_sirket,
    son_pozisyon = v_son_pozisyon,
    son_marka = v_son_marka,
    halen_calisiyor = v_halen,
    toplam_deneyim_ay = v_toplam_ay
  WHERE id = v_candidate_id;

  -- ── EDUCATION ──────────────────────────────────────────────
  DELETE FROM candidate_education WHERE candidate_id = v_candidate_id;

  INSERT INTO candidate_education (
    candidate_id, egitim_seviye, okul, bolum, mezun_yil, sira
  )
  SELECT
    v_candidate_id,
    e->>'egitim_seviye', e->>'okul', e->>'bolum',
    (e->>'mezun_yil')::int,
    (ord - 1)::int
  FROM jsonb_array_elements(p_education) WITH ORDINALITY AS t(e, ord);

  -- ── CERTIFICATES ───────────────────────────────────────────
  DELETE FROM candidate_certificates WHERE candidate_id = v_candidate_id;

  INSERT INTO candidate_certificates (
    candidate_id, egitim_adi, kurum, yil, sira
  )
  SELECT
    v_candidate_id,
    e->>'egitim_adi', e->>'kurum', (e->>'yil')::int,
    (ord - 1)::int
  FROM jsonb_array_elements(p_certificates) WITH ORDINALITY AS t(e, ord);

  -- ── LANGUAGES ──────────────────────────────────────────────
  DELETE FROM candidate_languages WHERE candidate_id = v_candidate_id;

  INSERT INTO candidate_languages (
    candidate_id, dil, seviye, sira
  )
  SELECT
    v_candidate_id,
    e->>'dil', e->>'seviye',
    (ord - 1)::int
  FROM jsonb_array_elements(p_languages) WITH ORDINALITY AS t(e, ord);

  -- ── TARGET ROLES ───────────────────────────────────────────
  DELETE FROM candidate_target_roles WHERE candidate_id = v_candidate_id;

  INSERT INTO candidate_target_roles (
    candidate_id, rol_ailesi, rol_unvani
  )
  SELECT
    v_candidate_id,
    e->>'rol_ailesi', e->>'rol_unvani'
  FROM jsonb_array_elements(COALESCE(p_target_roles, '[]'::jsonb)) WITH ORDINALITY AS t(e, ord)
  WHERE (e->>'rol_ailesi') IS NOT NULL AND trim(e->>'rol_ailesi') <> ''
    AND (e->>'rol_unvani') IS NOT NULL AND trim(e->>'rol_unvani') <> '';

  -- ── WORK PREFERENCES ──────────────────────────────────────
  IF p_work_prefs IS NOT NULL THEN
    INSERT INTO candidate_work_preferences (
      candidate_id, musaitlik, maas_beklenti, calisma_tipleri,
      segmentler, career_goal, career_type
    )
    VALUES (
      v_candidate_id,
      p_work_prefs->>'musaitlik',
      p_work_prefs->>'maas_beklenti',
      CASE WHEN p_work_prefs ? 'calisma_tipleri'
        THEN ARRAY(SELECT jsonb_array_elements_text(p_work_prefs->'calisma_tipleri'))
        ELSE NULL END,
      CASE WHEN p_work_prefs ? 'segmentler'
        THEN ARRAY(SELECT jsonb_array_elements_text(p_work_prefs->'segmentler'))
        ELSE NULL END,
      p_work_prefs->>'career_goal',
      p_work_prefs->>'career_type'
    )
    ON CONFLICT (candidate_id) DO UPDATE SET
      musaitlik       = EXCLUDED.musaitlik,
      maas_beklenti   = EXCLUDED.maas_beklenti,
      calisma_tipleri = EXCLUDED.calisma_tipleri,
      segmentler      = EXCLUDED.segmentler,
      career_goal     = EXCLUDED.career_goal,
      career_type     = EXCLUDED.career_type;
  END IF;

  -- ── BRAND INTERESTS ────────────────────────────────────────
  DELETE FROM candidate_brand_interests WHERE candidate_id = v_candidate_id;

  INSERT INTO candidate_brand_interests (candidate_id, marka, brand_id)
  SELECT v_candidate_id, e->>'marka', (e->>'brand_id')::bigint
  FROM jsonb_array_elements(p_brand_interests) WITH ORDINALITY AS t(e, ord);

  -- ── LOCATION PREFERENCES ──────────────────────────────────
  DELETE FROM candidate_location_preferences WHERE candidate_id = v_candidate_id;

  FOR v_loc IN SELECT value, ord FROM jsonb_array_elements(p_locations) WITH ORDINALITY AS t(value, ord) LOOP
    INSERT INTO candidate_location_preferences (candidate_id, sehir)
    VALUES (v_candidate_id, v_loc.value->>'sehir')
    RETURNING id INTO v_loc_id;

    IF v_loc.value ? 'ilceler' AND jsonb_array_length(v_loc.value->'ilceler') > 0 THEN
      INSERT INTO candidate_location_pref_districts (location_pref_id, ilce)
      SELECT v_loc_id, d
      FROM jsonb_array_elements_text(v_loc.value->'ilceler') AS d;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'candidate_id', v_candidate_id,
    'halen_calisiyor', v_halen,
    'toplam_deneyim_ay', v_toplam_ay,
    'son_sirket', v_son_sirket,
    'son_pozisyon', v_son_pozisyon
  );
END;
$$;


-- ═══════════════════════════════════════════════════
-- PART 2: compute_candidate_profile_completion — ilk_deneyim support
-- ═══════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION compute_candidate_profile_completion(
  p_candidate_id bigint,
  p_full_name text,
  p_adres_il text
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  score int := 0;
  v_telefon text;
  v_linkedin text;
  v_ilk_deneyim boolean;
BEGIN
  -- Fetch additional fields from candidates row
  SELECT telefon, linkedin, ilk_deneyim
  INTO v_telefon, v_linkedin, v_ilk_deneyim
  FROM candidates
  WHERE id = p_candidate_id;

  -- Identity (20 points)
  IF coalesce(nullif(trim(p_full_name), ''), '') <> '' THEN
    score := score + 10;
  END IF;
  IF coalesce(nullif(trim(v_telefon), ''), '') <> '' THEN
    score := score + 5;
  END IF;
  IF coalesce(nullif(trim(p_adres_il), ''), '') <> '' THEN
    score := score + 5;
  END IF;

  -- Contact (5 points)
  IF coalesce(nullif(trim(v_linkedin), ''), '') <> '' THEN
    score := score + 5;
  END IF;

  -- Experiences (25 points)
  -- ilk_deneyim = true means the candidate explicitly declared "no experience"
  -- which is a valid, complete answer — award full points like frontend does.
  IF v_ilk_deneyim = true THEN
    score := score + 25;
  ELSIF EXISTS (
    SELECT 1 FROM candidate_experiences e
    WHERE e.candidate_id = p_candidate_id
  ) THEN
    score := score + 25;
  END IF;

  -- Education (15 points)
  IF EXISTS (
    SELECT 1 FROM candidate_education ed
    WHERE ed.candidate_id = p_candidate_id
  ) THEN
    score := score + 15;
  END IF;

  -- Languages (10 points)
  IF EXISTS (
    SELECT 1 FROM candidate_languages lg
    WHERE lg.candidate_id = p_candidate_id
  ) THEN
    score := score + 10;
  END IF;

  -- Work preferences (15 points)
  IF EXISTS (
    SELECT 1 FROM candidate_work_preferences wp
    WHERE wp.candidate_id = p_candidate_id
  ) THEN
    score := score + 15;
  END IF;

  -- Location preferences (10 points)
  IF EXISTS (
    SELECT 1 FROM candidate_location_preferences lp
    WHERE lp.candidate_id = p_candidate_id
  ) THEN
    score := score + 10;
  END IF;

  -- Clamp
  IF score > 100 THEN score := 100; END IF;
  IF score < 0 THEN score := 0; END IF;

  RETURN score;
END;
$$;


-- ═══════════════════════════════════════════════════
-- PART 3: check_candidate_visible_to_employer — compound visibility rule
-- ═══════════════════════════════════════════════════

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

  SELECT id, is_active, profile_completed,
         COALESCE(profile_completion_pct, 0) AS profile_completion_pct,
         hide_from_current_employer
  INTO v_candidate
  FROM candidates WHERE id = p_candidate_id;

  IF v_candidate IS NULL THEN RETURN false; END IF;
  IF NOT v_candidate.is_active THEN RETURN false; END IF;

  -- Compound visibility: same rule as search RPC and RLS policies
  IF NOT v_candidate.profile_completed AND v_candidate.profile_completion_pct < 45 THEN
    RETURN false;
  END IF;

  -- Blocked check
  IF EXISTS (
    SELECT 1 FROM candidate_blocked_companies
    WHERE candidate_id = p_candidate_id AND company_id = v_company_id
  ) THEN
    RETURN false;
  END IF;

  -- Hide from current employer: id-first with text fallback
  IF v_candidate.hide_from_current_employer THEN
    IF EXISTS (
      SELECT 1 FROM candidate_experiences ce
      WHERE ce.candidate_id = p_candidate_id
        AND ce.devam_ediyor = true
        AND (
          -- ID-first
          ce.company_id = v_company_id
          OR ce.brand_id IN (SELECT b.id FROM brands b WHERE b.company_id = v_company_id)
          -- Text fallback for legacy rows
          OR (ce.company_id IS NULL AND ce.brand_id IS NULL AND (
            EXISTS (
              SELECT 1 FROM brands b
              WHERE b.company_id = v_company_id
                AND (lower(trim(ce.marka)) = lower(trim(b.brand_name))
                  OR lower(trim(ce.sirket)) = lower(trim(b.brand_name)))
            )
            OR EXISTS (
              SELECT 1 FROM companies co
              WHERE co.id = v_company_id
                AND (lower(trim(ce.sirket)) = lower(trim(co.company_name))
                  OR lower(trim(ce.marka)) = lower(trim(co.company_name)))
            )
          ))
        )
    ) THEN
      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$$;


-- ═══════════════════════════════════════════════════
-- PART 4: send_employer_message — compound visibility rule
-- ═══════════════════════════════════════════════════

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

  SELECT id, is_active, profile_completed,
         COALESCE(profile_completion_pct, 0) AS profile_completion_pct,
         hide_from_current_employer
  INTO v_candidate
  FROM candidates WHERE id = p_candidate_id;

  IF v_candidate IS NULL THEN
    RAISE EXCEPTION 'Candidate not found';
  END IF;

  IF NOT v_candidate.is_active THEN
    RAISE EXCEPTION 'Candidate profile is not active';
  END IF;

  -- Compound visibility: same rule as search RPC and RLS policies
  IF NOT v_candidate.profile_completed AND v_candidate.profile_completion_pct < 45 THEN
    RAISE EXCEPTION 'Candidate profile is not complete';
  END IF;

  -- Blocked check
  IF EXISTS (
    SELECT 1 FROM candidate_blocked_companies
    WHERE candidate_id = p_candidate_id
      AND company_id = v_company_id
  ) THEN
    RAISE EXCEPTION 'Bu adaya mesaj gönderemezsiniz';
  END IF;

  -- Hide from current employer: id-first with text fallback
  IF v_candidate.hide_from_current_employer THEN
    IF EXISTS (
      SELECT 1 FROM candidate_experiences ce
      WHERE ce.candidate_id = p_candidate_id
        AND ce.devam_ediyor = true
        AND (
          ce.company_id = v_company_id
          OR ce.brand_id IN (SELECT b.id FROM brands b WHERE b.company_id = v_company_id)
          OR (ce.company_id IS NULL AND ce.brand_id IS NULL AND (
            EXISTS (
              SELECT 1 FROM brands b
              WHERE b.company_id = v_company_id
                AND (lower(trim(ce.marka)) = lower(trim(b.brand_name))
                  OR lower(trim(ce.sirket)) = lower(trim(b.brand_name)))
            )
            OR EXISTS (
              SELECT 1 FROM companies co
              WHERE co.id = v_company_id
                AND (lower(trim(ce.sirket)) = lower(trim(co.company_name))
                  OR lower(trim(ce.marka)) = lower(trim(co.company_name)))
            )
          ))
        )
    ) THEN
      RAISE EXCEPTION 'Bu adaya mesaj gönderemezsiniz';
    END IF;
  END IF;

  -- Position check
  IF p_position_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM positions
      WHERE id = p_position_id AND company_id = v_company_id
    ) THEN
      RAISE EXCEPTION 'Position does not belong to your company';
    END IF;
  END IF;

  -- Insert message
  INSERT INTO employer_messages (sender_id, company_id, candidate_id, position_id, template_id, subject, body)
  VALUES (v_user_id, v_company_id, p_candidate_id, p_position_id, p_template_id, TRIM(p_subject), TRIM(p_body))
  RETURNING id INTO v_msg_id;

  RETURN v_msg_id;
END;
$$;


-- ═══════════════════════════════════════════════════
-- PART 5: Re-sync ilk_deneyim candidates whose pct was under-counted
-- ═══════════════════════════════════════════════════

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id FROM candidates WHERE ilk_deneyim = true
  LOOP
    PERFORM refresh_candidate_profile_completion(r.id);
  END LOOP;
END;
$$;
