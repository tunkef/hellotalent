-- ═══════════════════════════════════════════════════════════════
-- Migration: Add description field to candidate_experiences
-- Date: 2026-04-04
-- Reason: Apple benchmark AKS-1 — iş tanımı serbest metin alanı
--         Profil kalitesini artırır, aynı unvan altındaki farkı ortaya çıkarır
-- ═══════════════════════════════════════════════════════════════

-- 1. Add column
ALTER TABLE candidate_experiences
  ADD COLUMN IF NOT EXISTS description text;

-- 2. Update save_candidate_profile RPC to include description in INSERT
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
    basari_ozeti, description, baslangic_ay, baslangic_yil, bitis_ay, bitis_yil,
    devam_ediyor, ayrilma_nedeni, sira,
    rol_ailesi, rol_unvani,
    company_id, brand_id
  )
  SELECT
    v_candidate_id,
    e->>'sirket', e->>'marka', e->>'pozisyon', e->>'departman', e->>'sektor',
    e->>'segment', e->>'istihdam_tipi', e->>'kidem_seviyesi', e->>'lokasyon_tipi',
    e->>'sehir', e->>'takim_buyuklugu', e->>'basari_ozeti', e->>'description',
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

  -- ── BRAND INTERESTS → AUTO-FOLLOW (additive only) ─────────
  INSERT INTO candidate_brand_follows (candidate_id, brand_id)
  SELECT v_candidate_id, (e->>'brand_id')::bigint
  FROM jsonb_array_elements(p_brand_interests) WITH ORDINALITY AS t(e, ord)
  WHERE (e->>'brand_id') IS NOT NULL
  ON CONFLICT (candidate_id, brand_id) DO NOTHING;

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
