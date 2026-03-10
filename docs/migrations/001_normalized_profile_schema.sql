-- ═══════════════════════════════════════════════════════════════
-- HELLOTALENT — Migration 001: Normalized Profile Schema
-- Date: 2026-03-10 (revised v3)
-- Description: Create normalized child tables for candidate profile
--              data to support structured recruiter-side filtering.
-- Strategy: ADDITIVE — existing candidates columns are preserved
--           for backward compatibility until new wizard is connected.
--
-- TYPE NOTE: candidates.id is bigint (Supabase default).
--            All child table candidate_id columns use bigint to match.
--            Child tables' own id columns use uuid (gen_random_uuid).
--
-- SECURITY NOTES:
--   - All SECURITY DEFINER functions pin search_path = public
--   - save_candidate_profile() derives user from auth.uid(),
--     never from client-supplied parameters
--   - RLS policies use DROP IF EXISTS + CREATE for idempotency
-- ═══════════════════════════════════════════════════════════════

-- ── 1. ADD DERIVED COLUMNS TO candidates ──────────────────────
-- These columns are auto-computed on experience save for fast
-- card display and recruiter listing queries.
-- NOTE: updated_at already exists on this table — IF NOT EXISTS
--       will skip it silently.

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS son_sirket text,
  ADD COLUMN IF NOT EXISTS son_pozisyon text,
  ADD COLUMN IF NOT EXISTS son_marka text,
  ADD COLUMN IF NOT EXISTS halen_calisiyor boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS toplam_deneyim_ay int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS profile_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- ── 2. candidate_experiences ──────────────────────────────────

CREATE TABLE IF NOT EXISTS candidate_experiences (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id    bigint NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  sirket          text NOT NULL,
  marka           text,
  pozisyon        text NOT NULL,
  departman       text CHECK (departman IS NULL OR departman IN (
                    'Mağaza','Bölge Yönetimi','Genel Merkez','Visual Merchandising',
                    'Operasyon','İnsan Kaynakları','Eğitim','Pazarlama','E-Ticaret','Diğer'
                  )),
  sektor          text,
  segment         text CHECK (segment IS NULL OR segment IN (
                    'Lüks','Premium','Orta Segment','Fast Fashion','Spor',
                    'Teknoloji','Kozmetik','Otomotiv','Gıda / Market','Ev / Yaşam','Diğer'
                  )),
  istihdam_tipi   text CHECK (istihdam_tipi IS NULL OR istihdam_tipi IN (
                    'Tam Zamanlı','Yarı Zamanlı','Sezonluk','Stajyer','Sözleşmeli'
                  )),
  kidem_seviyesi  text CHECK (kidem_seviyesi IS NULL OR kidem_seviyesi IN (
                    'Stajyer','Giriş Seviye','Orta Seviye','Kıdemli','Yönetici','Üst Yönetici'
                  )),
  lokasyon_tipi   text CHECK (lokasyon_tipi IS NULL OR lokasyon_tipi IN (
                    'Mağaza','Saha','Genel Merkez'
                  )),
  sehir           text,
  takim_buyuklugu text CHECK (takim_buyuklugu IS NULL OR takim_buyuklugu IN (
                    'Yok','1-5','6-15','16-30','30+'
                  )),
  basari_ozeti    text,
  baslangic_ay    int CHECK (baslangic_ay IS NULL OR (baslangic_ay >= 1 AND baslangic_ay <= 12)),
  baslangic_yil   int NOT NULL,
  bitis_ay        int CHECK (bitis_ay IS NULL OR (bitis_ay >= 1 AND bitis_ay <= 12)),
  bitis_yil       int,
  devam_ediyor    boolean DEFAULT false,
  ayrilma_nedeni  text CHECK (ayrilma_nedeni IS NULL OR ayrilma_nedeni IN (
                    'Terfi','İstifa','Kariyer Geçişi','İşten Çıkarılma',
                    'Karşılıklı Fesih','Sözleşme Bitimi','Belirtmek İstemiyorum'
                  )),
  sira            int DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

-- ── 3. candidate_education ────────────────────────────────────

CREATE TABLE IF NOT EXISTS candidate_education (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id    bigint NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  egitim_seviye   text CHECK (egitim_seviye IS NULL OR egitim_seviye IN (
                    'İlkokul','Ortaokul','Lise','Ön Lisans','Lisans','Yüksek Lisans','Doktora'
                  )),
  okul            text,
  bolum           text,
  mezun_yil       int,
  sira            int DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

-- ── 4. candidate_certificates ─────────────────────────────────

CREATE TABLE IF NOT EXISTS candidate_certificates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id    bigint NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  egitim_adi      text NOT NULL,
  kurum           text,
  yil             int,
  sira            int DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

-- ── 5. candidate_languages ────────────────────────────────────

CREATE TABLE IF NOT EXISTS candidate_languages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id    bigint NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  dil             text NOT NULL,
  seviye          text CHECK (seviye IS NULL OR seviye IN (
                    'A1 - Başlangıç','A2 - Temel','B1 - Orta Altı','B2 - Orta',
                    'C1 - İleri','C2 - Üst İleri','Anadil'
                  )),
  sira            int DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

-- ── 6. candidate_target_roles ─────────────────────────────────

CREATE TABLE IF NOT EXISTS candidate_target_roles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id    bigint NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  rol_ailesi      text NOT NULL CHECK (rol_ailesi IN (
                    'Satış','Mağaza Yönetimi','Bölge Yönetimi',
                    'Visual Merchandising','Operasyon','İnsan Kaynakları','Pazarlama / E-Ticaret'
                  )),
  rol_unvani      text NOT NULL,
  created_at      timestamptz DEFAULT now()
);

-- ── 7. candidate_work_preferences (1:1) ───────────────────────

CREATE TABLE IF NOT EXISTS candidate_work_preferences (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id    bigint NOT NULL UNIQUE REFERENCES candidates(id) ON DELETE CASCADE,
  musaitlik       text CHECK (musaitlik IS NULL OR musaitlik IN (
                    'Hemen','2 Hafta İçinde','1 Ay İçinde','2+ Ay İçinde'
                  )),
  maas_beklenti   text,
  calisma_tipleri text[],
  segmentler      text[],
  career_goal     text,
  career_type     text CHECK (career_type IS NULL OR career_type IN ('yukari','yatay','lider')),
  created_at      timestamptz DEFAULT now()
);

-- ── 8. candidate_brand_interests ──────────────────────────────

CREATE TABLE IF NOT EXISTS candidate_brand_interests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id    bigint NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  marka           text NOT NULL,
  created_at      timestamptz DEFAULT now()
);

-- ── 9. candidate_location_preferences ─────────────────────────

CREATE TABLE IF NOT EXISTS candidate_location_preferences (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id    bigint NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  sehir           text NOT NULL,
  created_at      timestamptz DEFAULT now()
);

-- ── 10. candidate_location_pref_districts ─────────────────────

CREATE TABLE IF NOT EXISTS candidate_location_pref_districts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_pref_id  uuid NOT NULL REFERENCES candidate_location_preferences(id) ON DELETE CASCADE,
  ilce              text NOT NULL,
  created_at        timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- INDEXES — Optimized for recruiter-side filtering
-- ═══════════════════════════════════════════════════════════════

-- Experiences
CREATE INDEX IF NOT EXISTS idx_exp_candidate    ON candidate_experiences(candidate_id);
CREATE INDEX IF NOT EXISTS idx_exp_segment      ON candidate_experiences(segment);
CREATE INDEX IF NOT EXISTS idx_exp_departman    ON candidate_experiences(departman);
CREATE INDEX IF NOT EXISTS idx_exp_kidem        ON candidate_experiences(kidem_seviyesi);
CREATE INDEX IF NOT EXISTS idx_exp_devam        ON candidate_experiences(devam_ediyor);
CREATE INDEX IF NOT EXISTS idx_exp_sehir        ON candidate_experiences(sehir);
CREATE INDEX IF NOT EXISTS idx_exp_istihdam     ON candidate_experiences(istihdam_tipi);

-- Education
CREATE INDEX IF NOT EXISTS idx_edu_candidate    ON candidate_education(candidate_id);
CREATE INDEX IF NOT EXISTS idx_edu_seviye       ON candidate_education(egitim_seviye);

-- Certificates
CREATE INDEX IF NOT EXISTS idx_cert_candidate   ON candidate_certificates(candidate_id);

-- Languages
CREATE INDEX IF NOT EXISTS idx_lang_candidate   ON candidate_languages(candidate_id);
CREATE INDEX IF NOT EXISTS idx_lang_dil_seviye  ON candidate_languages(dil, seviye);

-- Target roles
CREATE INDEX IF NOT EXISTS idx_roles_candidate  ON candidate_target_roles(candidate_id);
CREATE INDEX IF NOT EXISTS idx_roles_ailesi     ON candidate_target_roles(rol_ailesi);
CREATE INDEX IF NOT EXISTS idx_roles_unvani     ON candidate_target_roles(rol_unvani);

-- Work preferences
CREATE INDEX IF NOT EXISTS idx_wp_candidate     ON candidate_work_preferences(candidate_id);
CREATE INDEX IF NOT EXISTS idx_wp_segmentler    ON candidate_work_preferences USING GIN(segmentler);
CREATE INDEX IF NOT EXISTS idx_wp_calisma       ON candidate_work_preferences USING GIN(calisma_tipleri);
CREATE INDEX IF NOT EXISTS idx_wp_musaitlik     ON candidate_work_preferences(musaitlik);

-- Brand interests
CREATE INDEX IF NOT EXISTS idx_brand_candidate  ON candidate_brand_interests(candidate_id);
CREATE INDEX IF NOT EXISTS idx_brand_marka      ON candidate_brand_interests(marka);

-- Location preferences
CREATE INDEX IF NOT EXISTS idx_loc_candidate    ON candidate_location_preferences(candidate_id);
CREATE INDEX IF NOT EXISTS idx_loc_sehir        ON candidate_location_preferences(sehir);
CREATE INDEX IF NOT EXISTS idx_locd_pref        ON candidate_location_pref_districts(location_pref_id);

-- Candidates: core recruiter filters
CREATE INDEX IF NOT EXISTS idx_cand_active      ON candidates(is_active);
CREATE INDEX IF NOT EXISTS idx_cand_halen       ON candidates(halen_calisiyor);
CREATE INDEX IF NOT EXISTS idx_cand_il          ON candidates(adres_il);
CREATE INDEX IF NOT EXISTS idx_cand_deneyim_ay  ON candidates(toplam_deneyim_ay);

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════

-- Enable RLS on all new tables
ALTER TABLE candidate_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_education ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_target_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_work_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_brand_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_location_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_location_pref_districts ENABLE ROW LEVEL SECURITY;

-- Helper: get candidate.id from auth.uid()
-- Returns bigint to match candidates.id type
CREATE OR REPLACE FUNCTION get_my_candidate_id()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM candidates WHERE user_id = auth.uid() LIMIT 1;
$$;

-- ── RLS POLICIES (DROP + CREATE for idempotency) ─────────────

-- candidate_experiences
DROP POLICY IF EXISTS exp_select ON candidate_experiences;
DROP POLICY IF EXISTS exp_insert ON candidate_experiences;
DROP POLICY IF EXISTS exp_update ON candidate_experiences;
DROP POLICY IF EXISTS exp_delete ON candidate_experiences;
CREATE POLICY exp_select ON candidate_experiences FOR SELECT
  USING (candidate_id = get_my_candidate_id());
CREATE POLICY exp_insert ON candidate_experiences FOR INSERT
  WITH CHECK (candidate_id = get_my_candidate_id());
CREATE POLICY exp_update ON candidate_experiences FOR UPDATE
  USING (candidate_id = get_my_candidate_id());
CREATE POLICY exp_delete ON candidate_experiences FOR DELETE
  USING (candidate_id = get_my_candidate_id());

-- candidate_education
DROP POLICY IF EXISTS edu_select ON candidate_education;
DROP POLICY IF EXISTS edu_insert ON candidate_education;
DROP POLICY IF EXISTS edu_update ON candidate_education;
DROP POLICY IF EXISTS edu_delete ON candidate_education;
CREATE POLICY edu_select ON candidate_education FOR SELECT
  USING (candidate_id = get_my_candidate_id());
CREATE POLICY edu_insert ON candidate_education FOR INSERT
  WITH CHECK (candidate_id = get_my_candidate_id());
CREATE POLICY edu_update ON candidate_education FOR UPDATE
  USING (candidate_id = get_my_candidate_id());
CREATE POLICY edu_delete ON candidate_education FOR DELETE
  USING (candidate_id = get_my_candidate_id());

-- candidate_certificates
DROP POLICY IF EXISTS cert_select ON candidate_certificates;
DROP POLICY IF EXISTS cert_insert ON candidate_certificates;
DROP POLICY IF EXISTS cert_update ON candidate_certificates;
DROP POLICY IF EXISTS cert_delete ON candidate_certificates;
CREATE POLICY cert_select ON candidate_certificates FOR SELECT
  USING (candidate_id = get_my_candidate_id());
CREATE POLICY cert_insert ON candidate_certificates FOR INSERT
  WITH CHECK (candidate_id = get_my_candidate_id());
CREATE POLICY cert_update ON candidate_certificates FOR UPDATE
  USING (candidate_id = get_my_candidate_id());
CREATE POLICY cert_delete ON candidate_certificates FOR DELETE
  USING (candidate_id = get_my_candidate_id());

-- candidate_languages
DROP POLICY IF EXISTS lang_select ON candidate_languages;
DROP POLICY IF EXISTS lang_insert ON candidate_languages;
DROP POLICY IF EXISTS lang_update ON candidate_languages;
DROP POLICY IF EXISTS lang_delete ON candidate_languages;
CREATE POLICY lang_select ON candidate_languages FOR SELECT
  USING (candidate_id = get_my_candidate_id());
CREATE POLICY lang_insert ON candidate_languages FOR INSERT
  WITH CHECK (candidate_id = get_my_candidate_id());
CREATE POLICY lang_update ON candidate_languages FOR UPDATE
  USING (candidate_id = get_my_candidate_id());
CREATE POLICY lang_delete ON candidate_languages FOR DELETE
  USING (candidate_id = get_my_candidate_id());

-- candidate_target_roles
DROP POLICY IF EXISTS roles_select ON candidate_target_roles;
DROP POLICY IF EXISTS roles_insert ON candidate_target_roles;
DROP POLICY IF EXISTS roles_update ON candidate_target_roles;
DROP POLICY IF EXISTS roles_delete ON candidate_target_roles;
CREATE POLICY roles_select ON candidate_target_roles FOR SELECT
  USING (candidate_id = get_my_candidate_id());
CREATE POLICY roles_insert ON candidate_target_roles FOR INSERT
  WITH CHECK (candidate_id = get_my_candidate_id());
CREATE POLICY roles_update ON candidate_target_roles FOR UPDATE
  USING (candidate_id = get_my_candidate_id());
CREATE POLICY roles_delete ON candidate_target_roles FOR DELETE
  USING (candidate_id = get_my_candidate_id());

-- candidate_work_preferences
DROP POLICY IF EXISTS wp_select ON candidate_work_preferences;
DROP POLICY IF EXISTS wp_insert ON candidate_work_preferences;
DROP POLICY IF EXISTS wp_update ON candidate_work_preferences;
DROP POLICY IF EXISTS wp_delete ON candidate_work_preferences;
CREATE POLICY wp_select ON candidate_work_preferences FOR SELECT
  USING (candidate_id = get_my_candidate_id());
CREATE POLICY wp_insert ON candidate_work_preferences FOR INSERT
  WITH CHECK (candidate_id = get_my_candidate_id());
CREATE POLICY wp_update ON candidate_work_preferences FOR UPDATE
  USING (candidate_id = get_my_candidate_id());
CREATE POLICY wp_delete ON candidate_work_preferences FOR DELETE
  USING (candidate_id = get_my_candidate_id());

-- candidate_brand_interests
DROP POLICY IF EXISTS brand_select ON candidate_brand_interests;
DROP POLICY IF EXISTS brand_insert ON candidate_brand_interests;
DROP POLICY IF EXISTS brand_update ON candidate_brand_interests;
DROP POLICY IF EXISTS brand_delete ON candidate_brand_interests;
CREATE POLICY brand_select ON candidate_brand_interests FOR SELECT
  USING (candidate_id = get_my_candidate_id());
CREATE POLICY brand_insert ON candidate_brand_interests FOR INSERT
  WITH CHECK (candidate_id = get_my_candidate_id());
CREATE POLICY brand_update ON candidate_brand_interests FOR UPDATE
  USING (candidate_id = get_my_candidate_id());
CREATE POLICY brand_delete ON candidate_brand_interests FOR DELETE
  USING (candidate_id = get_my_candidate_id());

-- candidate_location_preferences
DROP POLICY IF EXISTS loc_select ON candidate_location_preferences;
DROP POLICY IF EXISTS loc_insert ON candidate_location_preferences;
DROP POLICY IF EXISTS loc_update ON candidate_location_preferences;
DROP POLICY IF EXISTS loc_delete ON candidate_location_preferences;
CREATE POLICY loc_select ON candidate_location_preferences FOR SELECT
  USING (candidate_id = get_my_candidate_id());
CREATE POLICY loc_insert ON candidate_location_preferences FOR INSERT
  WITH CHECK (candidate_id = get_my_candidate_id());
CREATE POLICY loc_update ON candidate_location_preferences FOR UPDATE
  USING (candidate_id = get_my_candidate_id());
CREATE POLICY loc_delete ON candidate_location_preferences FOR DELETE
  USING (candidate_id = get_my_candidate_id());

-- candidate_location_pref_districts (access via parent)
DROP POLICY IF EXISTS locd_select ON candidate_location_pref_districts;
DROP POLICY IF EXISTS locd_insert ON candidate_location_pref_districts;
DROP POLICY IF EXISTS locd_update ON candidate_location_pref_districts;
DROP POLICY IF EXISTS locd_delete ON candidate_location_pref_districts;
CREATE POLICY locd_select ON candidate_location_pref_districts FOR SELECT
  USING (location_pref_id IN (
    SELECT id FROM candidate_location_preferences WHERE candidate_id = get_my_candidate_id()
  ));
CREATE POLICY locd_insert ON candidate_location_pref_districts FOR INSERT
  WITH CHECK (location_pref_id IN (
    SELECT id FROM candidate_location_preferences WHERE candidate_id = get_my_candidate_id()
  ));
CREATE POLICY locd_update ON candidate_location_pref_districts FOR UPDATE
  USING (location_pref_id IN (
    SELECT id FROM candidate_location_preferences WHERE candidate_id = get_my_candidate_id()
  ));
CREATE POLICY locd_delete ON candidate_location_pref_districts FOR DELETE
  USING (location_pref_id IN (
    SELECT id FROM candidate_location_preferences WHERE candidate_id = get_my_candidate_id()
  ));

-- ═══════════════════════════════════════════════════════════════
-- TRANSACTION-SAFE PROFILE SAVE RPC
-- ═══════════════════════════════════════════════════════════════
-- SECURITY: No user_id parameter. auth.uid() derived internally.
-- search_path pinned to public.
-- v_candidate_id is bigint to match candidates.id.
-- dogum_yili kept as text (matches existing column type).
-- Deterministic ordering via WITH ORDINALITY.

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
  -- ── Derive current user from auth context ──
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- ── Get or create candidate record ──
  SELECT id INTO v_candidate_id FROM candidates WHERE user_id = v_user_id;

  IF v_candidate_id IS NULL THEN
    INSERT INTO candidates (user_id, created_at, updated_at)
    VALUES (v_user_id, now(), now())
    RETURNING id INTO v_candidate_id;
  END IF;

  -- ── Update root profile fields ──
  -- NOTE: dogum_yili is text in candidates table, no ::int cast
  UPDATE candidates SET
    full_name         = COALESCE(p_profile->>'full_name', full_name),
    email             = COALESCE(p_profile->>'email', email),
    telefon           = COALESCE(p_profile->>'telefon', telefon),
    cinsiyet          = COALESCE(p_profile->>'cinsiyet', cinsiyet),
    dogum_yili        = COALESCE(p_profile->>'dogum_yili', dogum_yili),
    adres_il          = COALESCE(p_profile->>'adres_il', adres_il),
    adres_ilce        = COALESCE(p_profile->>'adres_ilce', adres_ilce),
    linkedin          = COALESCE(p_profile->>'linkedin', linkedin),
    engel_durumu      = COALESCE(p_profile->>'engel_durumu', engel_durumu),
    askerlik_durumu   = COALESCE(p_profile->>'askerlik_durumu', askerlik_durumu),
    is_active         = COALESCE((p_profile->>'is_active')::boolean, is_active),
    ilk_deneyim       = COALESCE((p_profile->>'ilk_deneyim')::boolean, ilk_deneyim),
    profile_completed = COALESCE((p_profile->>'profile_completed')::boolean, profile_completed),
    updated_at        = now()
  WHERE id = v_candidate_id;

  -- ── Experiences: delete + re-insert ──
  DELETE FROM candidate_experiences WHERE candidate_id = v_candidate_id;

  INSERT INTO candidate_experiences (
    candidate_id, sirket, marka, pozisyon, departman, sektor, segment,
    istihdam_tipi, kidem_seviyesi, lokasyon_tipi, sehir, takim_buyuklugu,
    basari_ozeti, baslangic_ay, baslangic_yil, bitis_ay, bitis_yil,
    devam_ediyor, ayrilma_nedeni, sira
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
    (ord - 1)::int
  FROM jsonb_array_elements(p_experiences) WITH ORDINALITY AS t(e, ord);

  -- ── Compute derived fields from experiences ──
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

  -- ── Education: delete + re-insert ──
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

  -- ── Certificates: delete + re-insert ──
  DELETE FROM candidate_certificates WHERE candidate_id = v_candidate_id;

  INSERT INTO candidate_certificates (
    candidate_id, egitim_adi, kurum, yil, sira
  )
  SELECT
    v_candidate_id,
    e->>'egitim_adi', e->>'kurum', (e->>'yil')::int,
    (ord - 1)::int
  FROM jsonb_array_elements(p_certificates) WITH ORDINALITY AS t(e, ord);

  -- ── Languages: delete + re-insert ──
  DELETE FROM candidate_languages WHERE candidate_id = v_candidate_id;

  INSERT INTO candidate_languages (
    candidate_id, dil, seviye, sira
  )
  SELECT
    v_candidate_id,
    e->>'dil', e->>'seviye',
    (ord - 1)::int
  FROM jsonb_array_elements(p_languages) WITH ORDINALITY AS t(e, ord);

  -- ── Target roles: delete + re-insert ──
  DELETE FROM candidate_target_roles WHERE candidate_id = v_candidate_id;

  INSERT INTO candidate_target_roles (
    candidate_id, rol_ailesi, rol_unvani
  )
  SELECT
    v_candidate_id,
    e->>'rol_ailesi', e->>'rol_unvani'
  FROM jsonb_array_elements(p_target_roles) WITH ORDINALITY AS t(e, ord);

  -- ── Work preferences: upsert (1:1) ──
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

  -- ── Brand interests: delete + re-insert ──
  DELETE FROM candidate_brand_interests WHERE candidate_id = v_candidate_id;

  INSERT INTO candidate_brand_interests (candidate_id, marka)
  SELECT v_candidate_id, e->>'marka'
  FROM jsonb_array_elements(p_brand_interests) WITH ORDINALITY AS t(e, ord);

  -- ── Location preferences + districts: delete + re-insert ──
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

  -- ── Return success ──
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
