-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Migration: candidates_test_seed_batch_flag                            ║
-- ║  Tarih: 2026-05-01                                                     ║
-- ║  Yazar: supabase-agent (Phase H.B)                                     ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Amaç:                                                                 ║
-- ║    Test seed adaylarını etiketlemek ve tek DELETE ile toplu silmek     ║
-- ║    için candidates tablosuna test_seed_batch kolonu ekler.             ║
-- ║                                                                        ║
-- ║  RLS Notu:                                                             ║
-- ║    Bu migration CREATE TABLE içermez; mevcut tabloya ALTER TABLE.      ║
-- ║    Yeni RLS policy gerekmez — candidates tablosunun mevcut policy'leri ║
-- ║    bu kolonu otomatik kapsar. candidates_select_own vb. politikaları   ║
-- ║    satır seviyesinde çalışır, kolon ekleme kapsam dışı.                ║
-- ║                                                                        ║
-- ║  CASCADE Doğrulaması (sorgu: confdeltype):                             ║
-- ║    candidate_work_preferences    → ON DELETE CASCADE (c)               ║
-- ║    candidate_experiences         → ON DELETE CASCADE (c)               ║
-- ║    candidate_education           → ON DELETE CASCADE (c)               ║
-- ║    candidate_languages           → ON DELETE CASCADE (c)               ║
-- ║    candidate_location_preferences→ ON DELETE CASCADE (c)               ║
-- ║    Tüm hedef alt tablolar CASCADE — tek DELETE ile purge çalışır.      ║
-- ║                                                                        ║
-- ║  Dikkat: campaign_clicks/impressions/redemptions, email_jobs,          ║
-- ║    inbox_messages → NO ACTION (seed script bu tablolara yazmaz).       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════
-- 1. KOLON EKLE
-- ═══════════════════════════════════════════════════════════
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS test_seed_batch TEXT NULL;

-- ═══════════════════════════════════════════════════════════
-- 2. PARTIAL INDEX (sadece seed satırlar — gerçek adaylar etkilenmez)
-- ═══════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_candidates_test_seed_batch
  ON candidates(test_seed_batch)
  WHERE test_seed_batch IS NOT NULL;

-- ═══════════════════════════════════════════════════════════
-- 3. KOLON AÇIKLAMASI
-- ═══════════════════════════════════════════════════════════
COMMENT ON COLUMN candidates.test_seed_batch IS
  'Test seed batch identifier. NULL = real candidate (production). '
  'Set by scripts/seed-test-candidates.js. '
  'Format: phase-h-{timestamp}. '
  'Bulk purge: DELETE FROM candidates WHERE test_seed_batch = ''<batch_id>''. '
  'Alt tablolar (work_prefs, experiences, education, languages, location_prefs) '
  'ON DELETE CASCADE ile otomatik silinir.';

-- ═══════════════════════════════════════════════════════════
-- ROLLBACK NOTU
-- Bu migration geri alınmak istenirse:
--
--   DROP INDEX IF EXISTS idx_candidates_test_seed_batch;
--   ALTER TABLE candidates DROP COLUMN IF EXISTS test_seed_batch;
--
-- Önce test seed adaylarını purge et:
--   DELETE FROM candidates WHERE test_seed_batch IS NOT NULL;
-- ═══════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- Wave 2 Fix Paketi — H.B convergent FAIL düzeltmeleri
-- Tarih: 2026-05-01
-- ─────────────────────────────────────────────────────────────────────────
-- R2 FIX: candidates.user_id NOT NULL → nullable (seed adaylar için)
--   Real candidate (test_seed_batch IS NULL) → user_id zorunlu (CHECK guard).
--   Seed aday (test_seed_batch IS NOT NULL) → user_id NULL kabul edilir.
--   Neden: Fake UUID auth.users FK'sini ihlal ediyordu (insert reddedilir).
--
-- B2 FIX (auditor): search_employer_candidates her iki overload'ında
--   visible CTE'ye AND c.test_seed_batch IS NULL filtresi eklendi.
--   Seed adaylar employer Pool'da görünmemeli (production safety + KVKK md.4).
--   6-param: _search_employer_candidates_internal olarak refactor edildi (W3).
--   5-param: CREATE OR REPLACE (live prosrc temel alındı — birebir kopya + filter).
--   search_path = pg_catalog, public, pg_temp (A14 pattern)
--   REVOKE PUBLIC + GRANT authenticated (her overload)
--
-- candidates_employer_read RLS POLICY GÜNCELLEMESI:
--   Mevcut policy'ye test_seed_batch IS NULL eklendi (defense in depth).
--   Employer doğrudan candidates tablosuna erişirse seed adayı görmez.
--   SECURITY DEFINER RPC zaten filtreliyor; policy ek katman.
--
-- ROLLBACK (Wave 2):
--   -- R2: DROP CONSTRAINT + ADD NOT NULL geri
--   ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_user_id_required_for_real;
--   ALTER TABLE candidates ALTER COLUMN user_id SET NOT NULL;
--   -- B2 RPC: eski body'ler supabase/migrations/20260430211728_search_rpc_candidate_id_filter.sql
--   -- Policy: DROP + yeniden eski body ile CREATE
-- ═══════════════════════════════════════════════════════════════════════════
-- ═══════════════════════════════════════════════════════════════════════════
-- Wave 3 Fix Paketi — KVKK md.4 PII wrapper restore + _internal refactor
-- Tarih: 2026-05-01
-- ─────────────────────────────────────────────────────────────────────────
-- SORUN (A16 retroaktif): A16 commit b87c779 ile search_employer_candidates
--   6-param doğrudan implementation'a dönüştürüldü — 20260408154040 migration'ında
--   tanımlanan PII strip wrapper'ı override etti. Ek olarak 5-param overload'ında
--   hiç wrapper olmadığı tespit edildi (legacy bug).
--   Sonuç: employer Pool'da real candidate'lar için telefon + email görünür oldu.
--   KVKK md.4 ihlali (30 Nis production apply sonrası aktif).
--
-- W3 FIX — 3 işlem:
--   1. _search_employer_candidates_internal (6-param): W2 body'sini RENAME ederek
--      internal function olarak yarat. REVOKE PUBLIC; sadece SECURITY DEFINER
--      wrapper içinden çağrılır. authenticated direkt GRANT yok.
--      Plus: AND c.test_seed_batch IS NULL (W2 filter korundu).
--
--   2. search_employer_candidates 6-param: WRAPPER RESTORE.
--      20260408154040 pattern geri yüklendi. _internal'ı çağırır, dönen
--      candidates array'inden telefon + email'i jsonb subtraction ile siler.
--      (v_item - 'telefon' - 'email')
--      REVOKE PUBLIC + GRANT authenticated.
--
--   3. search_employer_candidates 5-param: INLINE PII STRIP.
--      _internal yoktu, yaratılmadı (5-param zaten nadir caller; wrapper overhead
--      karmaşıklık kazandırmaz). Bunun yerine with_children SELECT listesinden
--      ve final jsonb_build_object'ten telefon + email kolonu kaldırıldı.
--      Sonuç: 5-param hiçbir zaman telefon/email dönmez.
--      Plus: AND c.test_seed_batch IS NULL (W2 filter korundu).
--
-- ROLLBACK (Wave 3):
--   DROP FUNCTION IF EXISTS _search_employer_candidates_internal(jsonb,bigint,text,int,int,bigint);
--   -- 6-param: W2 body'yi geri yükle (bu dosyanın W2 satırları 131-670)
--   -- 5-param: W2 body'yi geri yükle (bu dosyanın W2 satırları 680-1049)
--   -- NOT: Rollback = PII leak'e dönüş — sadece acil durum
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- R2 FIX: user_id nullable + real candidate guard
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE candidates
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE candidates
  ADD CONSTRAINT candidates_user_id_required_for_real
  CHECK (test_seed_batch IS NOT NULL OR user_id IS NOT NULL);

COMMENT ON CONSTRAINT candidates_user_id_required_for_real ON candidates IS
  'Real candidate (test_seed_batch=NULL) için user_id NOT NULL zorunlu. '
  'Seed aday (test_seed_batch=batch_id) için user_id NULL kabul edilir. '
  'Wave 2 fix: fake UUID auth.users FK ihlali engellendi.';

-- ─────────────────────────────────────────────────────────────────────────
-- B2 FIX: candidates_employer_read policy — test_seed_batch IS NULL guard
-- Defense in depth: RPC zaten filtreler, policy ek katman.
-- ─────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS candidates_employer_read ON candidates;
DROP POLICY IF EXISTS employer_read_candidates ON candidates;

CREATE POLICY candidates_employer_read ON candidates
  FOR SELECT
  TO authenticated
  USING (
    is_employer()
    AND is_active = true
    AND (profile_completed = true OR profile_completion_pct >= 45)
    AND test_seed_batch IS NULL
  );

-- ─────────────────────────────────────────────────────────────────────────
-- W3 FIX: _search_employer_candidates_internal (6-param)
-- Temel: W2 search_employer_candidates 6-param body (birebir kopya)
-- Değişiklik:
--   - Function adı _search_employer_candidates_internal olarak rename
--   - REVOKE PUBLIC; authenticated direkt GRANT yok (wrapper-only erişim)
--   - Önceden visible CTE'de AND c.test_seed_batch IS NULL zaten vardı (W2 korundu)
-- Bu function sadece search_employer_candidates 6-param wrapper'ından çağrılır.
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION _search_employer_candidates_internal(
  p_filters jsonb DEFAULT '{}'::jsonb,
  p_employer_company_id bigint DEFAULT NULL,
  p_sort text DEFAULT 'relevance',
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0,
  p_position_id bigint DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_company_id bigint;
  v_results jsonb;

  -- Position fields (loaded when p_position_id provided)
  v_pos_title text;
  v_pos_sehir text;
  v_pos_seg text;
  v_pos_exp text;
  v_pos_exp_min int;
  v_pos_exp_max int;

  -- Filter extraction
  f_aktif_arayanlar boolean;
  f_pozisyon text[];
  f_sehir text;
  f_exp_min int;
  f_exp_max int;
  f_segment text[];
  f_musait text[];
  f_calisma text[];
  f_egitim text[];
  f_dil text[];
  f_search text;          -- text search filter (full_name + son_pozisyon + adres_il)
  v_search_escaped text;  -- WAVE 3: wildcard-escaped version of f_search (\ % _ literal)
  f_candidate_id bigint;  -- A16: single candidate lookup filter (NULL = no-op)
BEGIN
  -- Auth guard
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT hp.company_id INTO v_company_id
  FROM hr_profiles hp
  WHERE hp.id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employer profile not found — candidates cannot call this RPC';
  END IF;

  IF p_employer_company_id IS NOT NULL AND p_employer_company_id <> v_company_id THEN
    RAISE EXCEPTION 'Company ID mismatch — cannot search on behalf of another company';
  END IF;

  -- Load position details if provided
  IF p_position_id IS NOT NULL THEN
    SELECT pos.ad, pos.sehir, pos.seg, pos.exp
    INTO v_pos_title, v_pos_sehir, v_pos_seg, v_pos_exp
    FROM positions pos
    WHERE pos.id = p_position_id
      AND pos.company_id = v_company_id;

    IF NOT FOUND THEN
      v_pos_title := NULL;
    END IF;

    -- Parse exp range: "3-5 yil" min=3, max=5; "5+ yil" min=5, max=99
    IF v_pos_exp IS NOT NULL THEN
      IF v_pos_exp ~ '^\d+\s*-\s*\d+' THEN
        v_pos_exp_min := (regexp_match(v_pos_exp, '^(\d+)'))[1]::int;
        v_pos_exp_max := (regexp_match(v_pos_exp, '-\s*(\d+)'))[1]::int;
      ELSIF v_pos_exp ~ '^\d+\+' THEN
        v_pos_exp_min := (regexp_match(v_pos_exp, '^(\d+)'))[1]::int;
        v_pos_exp_max := 99;
      ELSIF v_pos_exp ~ '^\d+' THEN
        v_pos_exp_min := (regexp_match(v_pos_exp, '^(\d+)'))[1]::int;
        v_pos_exp_max := v_pos_exp_min + 2;
      ELSE
        v_pos_exp_min := NULL;
        v_pos_exp_max := NULL;
      END IF;
    END IF;
  END IF;

  -- Extract filters from JSONB
  f_aktif_arayanlar := COALESCE((p_filters->>'aktifArayanlar')::boolean, false);
  f_sehir           := NULLIF(trim(p_filters->>'sehir'), '');
  f_exp_min         := COALESCE((p_filters->>'expMin')::int, 0);
  f_exp_max         := COALESCE((p_filters->>'expMax')::int, 99);
  f_search          := NULLIF(trim(p_filters->>'search'), '');
  f_candidate_id    := NULLIF(p_filters->>'candidate_id', '')::bigint;

  -- WAVE 3: escape wildcard chars so ILIKE treats them as literals
  IF f_search IS NOT NULL THEN
    v_search_escaped := replace(replace(replace(f_search, '\', '\\'), '%', '\%'), '_', '\_');
  END IF;

  SELECT COALESCE(array_agg(x), '{}')
    INTO f_pozisyon
    FROM jsonb_array_elements_text(COALESCE(p_filters->'pozisyon', '[]'::jsonb)) x;

  SELECT COALESCE(array_agg(x), '{}')
    INTO f_segment
    FROM jsonb_array_elements_text(COALESCE(p_filters->'segment', '[]'::jsonb)) x;

  SELECT COALESCE(array_agg(x), '{}')
    INTO f_musait
    FROM jsonb_array_elements_text(COALESCE(p_filters->'musait', '[]'::jsonb)) x;

  SELECT COALESCE(array_agg(x), '{}')
    INTO f_calisma
    FROM jsonb_array_elements_text(COALESCE(p_filters->'calisma', '[]'::jsonb)) x;

  SELECT COALESCE(array_agg(x), '{}')
    INTO f_egitim
    FROM jsonb_array_elements_text(COALESCE(p_filters->'egitim', '[]'::jsonb)) x;

  SELECT COALESCE(array_agg(x), '{}')
    INTO f_dil
    FROM jsonb_array_elements_text(COALESCE(p_filters->'dil', '[]'::jsonb)) x;

  -- Main query
  WITH
  visible AS (
    SELECT c.id, c.full_name, c.adres_il, c.telefon, c.email,
           c.is_actively_looking, c.updated_at, c.son_pozisyon,
           c.son_sirket, c.son_marka, c.toplam_deneyim_ay,
           c.halen_calisiyor, c.hide_from_current_employer,
           COALESCE(c.profile_completion_pct, 0) AS profile_completion_pct
    FROM candidates c
    WHERE c.is_active = true
      AND (c.profile_completed = true OR COALESCE(c.profile_completion_pct, 0) >= 45)
      AND c.account_status = 'active'
      AND c.test_seed_batch IS NULL                         -- B2: seed adaylar görünmez
      AND (f_candidate_id IS NULL OR c.id = f_candidate_id)
  ),

  not_blocked AS (
    SELECT v.*
    FROM visible v
    WHERE NOT EXISTS (
      SELECT 1 FROM candidate_blocked_companies cbc
      WHERE cbc.candidate_id = v.id
        AND cbc.company_id = v_company_id
    )
    OR v_company_id IS NULL
  ),

  employer_brand_ids AS (
    SELECT b.id AS brand_id
    FROM brands b WHERE b.company_id = v_company_id
  ),
  employer_names AS (
    SELECT lower(trim(b.brand_name)) AS n
    FROM brands b WHERE b.company_id = v_company_id
    UNION
    SELECT lower(trim(co.company_name))
    FROM companies co WHERE co.id = v_company_id
  ),
  not_hidden AS (
    SELECT nb.*
    FROM not_blocked nb
    WHERE nb.hide_from_current_employer IS NOT TRUE
       OR v_company_id IS NULL
       OR NOT EXISTS (
         SELECT 1 FROM candidate_experiences ce
         WHERE ce.candidate_id = nb.id
           AND ce.devam_ediyor = true
           AND (
             ce.company_id = v_company_id
             OR ce.brand_id IN (SELECT brand_id FROM employer_brand_ids)
             OR (ce.company_id IS NULL AND ce.brand_id IS NULL AND (
               lower(trim(ce.sirket)) IN (SELECT n FROM employer_names)
               OR lower(trim(ce.marka)) IN (SELECT n FROM employer_names)
             ))
           )
       )
  ),

  with_prefs AS (
    SELECT nh.*,
           wp.musaitlik,
           wp.calisma_tipleri,
           wp.maas_beklenti,
           wp.travel_willingness,
           wp.shift_flexibility,
           wp.notice_period
    FROM not_hidden nh
    LEFT JOIN candidate_work_preferences wp ON wp.candidate_id = nh.id
  ),

  with_segment AS (
    SELECT wp.*,
           (SELECT ce.segment
            FROM candidate_experiences ce
            WHERE ce.candidate_id = wp.id
            ORDER BY ce.devam_ediyor DESC, ce.baslangic_yil DESC NULLS LAST, COALESCE(ce.baslangic_ay, 1) DESC
            LIMIT 1
           ) AS segment
    FROM with_prefs wp
  ),

  with_edu AS (
    SELECT ws.*,
           (SELECT ed.egitim_seviye
            FROM candidate_education ed
            WHERE ed.candidate_id = ws.id
            ORDER BY ed.sira ASC
            LIMIT 1
           ) AS egitim_seviye
    FROM with_segment ws
  ),

  with_langs AS (
    SELECT we.*,
           COALESCE(
             (SELECT array_agg(cl.dil)
              FROM candidate_languages cl
              WHERE cl.candidate_id = we.id AND cl.dil IS NOT NULL),
             '{}'
           ) AS dil_array
    FROM with_edu we
  ),

  filtered AS (
    SELECT wl.*
    FROM with_langs wl
    WHERE
      (f_search IS NULL
        OR wl.full_name    ILIKE '%' || v_search_escaped || '%' ESCAPE '\'
        OR wl.son_pozisyon ILIKE '%' || v_search_escaped || '%' ESCAPE '\'
        OR wl.adres_il     ILIKE '%' || v_search_escaped || '%' ESCAPE '\')
      AND (NOT f_aktif_arayanlar OR wl.is_actively_looking = true)
      AND (array_length(f_pozisyon, 1) IS NULL OR wl.son_pozisyon = ANY(f_pozisyon))
      AND (f_sehir IS NULL OR wl.adres_il = f_sehir
           OR EXISTS (
             SELECT 1 FROM candidate_location_preferences clp
             WHERE clp.candidate_id = wl.id AND clp.sehir = f_sehir
           ))
      AND (COALESCE(wl.toplam_deneyim_ay, 0) / 12 >= f_exp_min)
      AND (COALESCE(wl.toplam_deneyim_ay, 0) / 12 <= f_exp_max)
      AND (array_length(f_segment, 1) IS NULL OR wl.segment = ANY(f_segment))
      AND (array_length(f_musait, 1) IS NULL OR wl.musaitlik = ANY(f_musait))
      AND (array_length(f_calisma, 1) IS NULL OR wl.calisma_tipleri && f_calisma)
      AND (array_length(f_egitim, 1) IS NULL OR wl.egitim_seviye = ANY(f_egitim))
      AND (array_length(f_dil, 1) IS NULL OR wl.dil_array && f_dil)
  ),

  scored AS (
    SELECT f.*,
      LEAST(100,
        CASE
          WHEN v_pos_title IS NOT NULL THEN
            (CASE
              WHEN EXISTS (
                SELECT 1 FROM candidate_target_roles ctr
                WHERE ctr.candidate_id = f.id
                  AND lower(trim(ctr.rol_unvani)) = lower(trim(v_pos_title))
              ) THEN 18
              ELSE 0
            END)
            + (CASE
              WHEN EXISTS (
                SELECT 1 FROM candidate_experiences ce
                WHERE ce.candidate_id = f.id
                  AND lower(trim(ce.pozisyon)) = lower(trim(v_pos_title))
              ) THEN 12
              ELSE 0
            END)
            + (CASE
              WHEN v_pos_seg IS NOT NULL AND f.segment IS NOT NULL
                   AND lower(trim(f.segment)) = lower(trim(v_pos_seg))
              THEN 10 ELSE 0
            END)
            + (CASE
              WHEN v_pos_sehir IS NOT NULL AND (
                (f.adres_il IS NOT NULL AND lower(trim(f.adres_il)) = lower(trim(v_pos_sehir)))
                OR EXISTS (
                  SELECT 1 FROM candidate_location_preferences clp
                  WHERE clp.candidate_id = f.id
                    AND lower(trim(clp.sehir)) = lower(trim(v_pos_sehir))
                )
              )
              THEN 10 ELSE 0
            END)
            + (CASE
              WHEN v_pos_exp_min IS NOT NULL THEN
                CASE
                  WHEN COALESCE(f.toplam_deneyim_ay, 0) / 12 BETWEEN v_pos_exp_min AND v_pos_exp_max THEN 8
                  WHEN COALESCE(f.toplam_deneyim_ay, 0) / 12 BETWEEN v_pos_exp_min - 1 AND v_pos_exp_max + 2 THEN 4
                  ELSE 0
                END
              ELSE 0
            END)
            + (CASE
              WHEN f.musaitlik = 'Hemen' THEN 8
              WHEN f.musaitlik = '2 Hafta İçinde' THEN 6
              WHEN f.musaitlik = '1 Ay İçinde' THEN 3
              ELSE 0
            END)
            + (CASE
              WHEN v_company_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM candidate_experiences ce
                WHERE ce.candidate_id = f.id
                  AND (ce.company_id = v_company_id
                       OR ce.brand_id IN (SELECT brand_id FROM employer_brand_ids))
              ) THEN 6 ELSE 0
            END)
            + (CASE WHEN f.is_actively_looking THEN 6 ELSE 0 END)
            + (CASE
              WHEN f.updated_at >= now() - interval '30 days' THEN 5
              WHEN f.updated_at >= now() - interval '90 days' THEN 2
              ELSE 0
            END)
            + LEAST(ROUND(f.profile_completion_pct * 0.04)::int, 4)
            + 0

          ELSE
            (CASE WHEN f.is_actively_looking THEN 20 ELSE 0 END)
            + LEAST(ROUND(f.profile_completion_pct * 0.15)::int, 15)
            + (CASE
                WHEN f.updated_at >= now() - interval '30 days' THEN 20
                WHEN f.updated_at >= now() - interval '90 days' THEN 10
                ELSE 0
              END)
            + LEAST(ROUND(COALESCE(f.toplam_deneyim_ay, 0)::numeric / 12)::int, 10)
            + (CASE
                WHEN array_length(f_pozisyon, 1) IS NOT NULL
                     AND EXISTS (
                       SELECT 1 FROM candidate_target_roles ctr
                       WHERE ctr.candidate_id = f.id
                         AND ctr.rol_unvani = ANY(f_pozisyon)
                     )
                THEN 15
                ELSE 0
              END)
            + (CASE
                WHEN f.musaitlik = 'Hemen' THEN 10
                WHEN f.musaitlik = '2 Hafta İçinde' THEN 7
                WHEN f.musaitlik = '1 Ay İçinde' THEN 3
                ELSE 0
              END)
            + (CASE
                WHEN array_length(f_dil, 1) IS NOT NULL AND f.dil_array && f_dil THEN 10
                ELSE 0
              END)
        END
      ) AS match_score,

      ARRAY_REMOVE(ARRAY[
        CASE WHEN v_pos_title IS NOT NULL AND EXISTS (
          SELECT 1 FROM candidate_target_roles ctr
          WHERE ctr.candidate_id = f.id
            AND lower(trim(ctr.rol_unvani)) = lower(trim(v_pos_title))
        ) THEN 'Hedef rol: tam eşleşme' END,

        CASE WHEN v_pos_title IS NOT NULL AND EXISTS (
          SELECT 1 FROM candidate_experiences ce
          WHERE ce.candidate_id = f.id
            AND lower(trim(ce.pozisyon)) = lower(trim(v_pos_title))
        ) THEN 'Deneyim: aynı pozisyon' END,

        CASE WHEN v_pos_seg IS NOT NULL AND f.segment IS NOT NULL
             AND lower(trim(f.segment)) = lower(trim(v_pos_seg))
        THEN 'Segment eşleşmesi' END,

        CASE WHEN v_pos_sehir IS NOT NULL AND (
          (f.adres_il IS NOT NULL AND lower(trim(f.adres_il)) = lower(trim(v_pos_sehir)))
          OR EXISTS (
            SELECT 1 FROM candidate_location_preferences clp
            WHERE clp.candidate_id = f.id
              AND lower(trim(clp.sehir)) = lower(trim(v_pos_sehir))
          )
        ) THEN 'Şehir eşleşmesi' END,

        CASE WHEN v_pos_exp_min IS NOT NULL
             AND COALESCE(f.toplam_deneyim_ay, 0) / 12 BETWEEN v_pos_exp_min AND v_pos_exp_max
        THEN 'Deneyim: uygun aralık' END,

        CASE WHEN v_company_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM candidate_experiences ce
          WHERE ce.candidate_id = f.id
            AND (ce.company_id = v_company_id
                 OR ce.brand_id IN (SELECT brand_id FROM employer_brand_ids))
        ) THEN 'Sektör deneyimi: tanıdık ekosistem' END,

        CASE WHEN f.is_actively_looking THEN 'Aktif iş arıyor' END,
        CASE WHEN f.profile_completion_pct >= 80 THEN 'Detaylı profil' END,
        CASE WHEN f.updated_at >= now() - interval '30 days' THEN 'Son 30 günde güncellendi' END,
        CASE WHEN COALESCE(f.toplam_deneyim_ay, 0) >= 60 THEN '5+ yıl deneyim' END,
        CASE WHEN v_pos_title IS NULL AND array_length(f_pozisyon, 1) IS NOT NULL
                  AND EXISTS (
                    SELECT 1 FROM candidate_target_roles ctr
                    WHERE ctr.candidate_id = f.id
                      AND ctr.rol_unvani = ANY(f_pozisyon)
                  )
             THEN 'Hedef rol eşleşmesi' END,
        CASE WHEN f.musaitlik IN ('Hemen', '2 Hafta İçinde') THEN 'Kısa sürede başlayabilir' END,
        CASE WHEN array_length(f_dil, 1) IS NOT NULL AND f.dil_array && f_dil THEN 'Dil eşleşmesi' END
      ], NULL) AS match_reasons

    FROM filtered f
  ),

  sorted AS (
    SELECT s.*
    FROM scored s
    ORDER BY
      CASE WHEN p_sort = 'relevance'    THEN s.match_score END DESC NULLS LAST,
      CASE WHEN p_sort = 'newest'       THEN s.updated_at END DESC NULLS LAST,
      CASE WHEN p_sort = 'exp_asc'      THEN s.toplam_deneyim_ay END ASC NULLS LAST,
      CASE WHEN p_sort = 'exp_desc'     THEN s.toplam_deneyim_ay END DESC NULLS LAST,
      CASE WHEN p_sort = 'name'         THEN s.full_name END ASC NULLS LAST,
      s.match_score DESC NULLS LAST,
      s.updated_at DESC NULLS LAST
  ),

  total_count AS (
    SELECT count(*) AS cnt FROM scored
  ),

  page AS (
    SELECT * FROM sorted
    LIMIT p_limit OFFSET p_offset
  ),

  with_children AS (
    SELECT
      p.id,
      p.full_name,
      p.adres_il,
      p.telefon,
      p.email,
      p.is_actively_looking,
      p.updated_at,
      p.son_pozisyon,
      p.son_sirket,
      p.son_marka,
      p.toplam_deneyim_ay,
      p.halen_calisiyor,
      p.profile_completion_pct,
      p.musaitlik,
      p.calisma_tipleri,
      p.maas_beklenti,
      p.travel_willingness,         -- W4 FIX: with_prefs'ten gelen field, with_children'a eksik ekleniyordu
      p.shift_flexibility,          -- W4 FIX
      p.notice_period,              -- W4 FIX
      p.segment,
      p.egitim_seviye,
      p.dil_array,
      p.match_score,
      p.match_reasons,

      COALESCE(
        (SELECT jsonb_agg(
           jsonb_build_object(
             'sirket', ce.sirket, 'marka', ce.marka, 'pozisyon', ce.pozisyon,
             'sektor', ce.sektor, 'segment', ce.segment, 'departman', ce.departman,
             'istihdam_tipi', ce.istihdam_tipi, 'kidem_seviyesi', ce.kidem_seviyesi,
             'baslangic_ay', ce.baslangic_ay, 'baslangic_yil', ce.baslangic_yil,
             'bitis_ay', ce.bitis_ay, 'bitis_yil', ce.bitis_yil,
             'devam_ediyor', ce.devam_ediyor, 'sehir', ce.sehir,
             'rol_ailesi', ce.rol_ailesi, 'rol_unvani', ce.rol_unvani,
             'company_id', ce.company_id, 'brand_id', ce.brand_id,
             'description', ce.description, 'takim_buyuklugu', ce.takim_buyuklugu
           ) ORDER BY ce.devam_ediyor DESC, ce.baslangic_yil DESC NULLS LAST
         )
         FROM candidate_experiences ce WHERE ce.candidate_id = p.id
        ), '[]'::jsonb
      ) AS experiences,

      COALESCE(
        (SELECT jsonb_agg(
           jsonb_build_object(
             'egitim_seviye', ed.egitim_seviye, 'okul', ed.okul,
             'bolum', ed.bolum, 'mezun_yil', ed.mezun_yil
           ) ORDER BY ed.sira ASC
         )
         FROM candidate_education ed WHERE ed.candidate_id = p.id
        ), '[]'::jsonb
      ) AS education,

      COALESCE(
        (SELECT jsonb_agg(
           jsonb_build_object('dil', cl.dil, 'seviye', cl.seviye)
           ORDER BY cl.sira ASC
         )
         FROM candidate_languages cl WHERE cl.candidate_id = p.id
        ), '[]'::jsonb
      ) AS diller_objects

    FROM page p
  )

  SELECT jsonb_build_object(
    'total', (SELECT cnt FROM total_count),
    'candidates', COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', wc.id,
          'full_name', wc.full_name,
          'adres_il', wc.adres_il,
          'telefon', wc.telefon,
          'email', wc.email,
          'is_actively_looking', wc.is_actively_looking,
          'updated_at', wc.updated_at,
          'son_pozisyon', wc.son_pozisyon,
          'son_sirket', wc.son_sirket,
          'son_marka', wc.son_marka,
          'toplam_deneyim_ay', wc.toplam_deneyim_ay,
          'halen_calisiyor', wc.halen_calisiyor,
          'profile_completion_pct', wc.profile_completion_pct,
          'musaitlik', wc.musaitlik,
          'calisma_tipleri', wc.calisma_tipleri,
          'maas_beklenti', wc.maas_beklenti,
          'travel_willingness', wc.travel_willingness,
          'shift_flexibility', wc.shift_flexibility,
          'notice_period', wc.notice_period,
          'segment', wc.segment,
          'egitim_seviye', wc.egitim_seviye,
          'match_score', wc.match_score,
          'match_reasons', wc.match_reasons,
          'experiences', wc.experiences,
          'education', wc.education,
          'diller', to_jsonb(wc.dil_array),
          'languages', wc.diller_objects
        )
      ) FROM with_children wc),
      '[]'::jsonb
    )
  ) INTO v_results;

  RETURN v_results;
END;
$$;

-- _internal: sadece wrapper SECURITY DEFINER içinden çağrılır
-- authenticated direkt GRANT yok — isolation sağlanır
REVOKE ALL ON FUNCTION _search_employer_candidates_internal(jsonb, bigint, text, int, int, bigint) FROM PUBLIC;

-- ─────────────────────────────────────────────────────────────────────────
-- W3 FIX: search_employer_candidates 6-param — PII STRIP WRAPPER RESTORE
-- Pattern: 20260408154040 migration wrapper (birebir restore)
-- _internal'ı çağırır; candidates array'inden telefon + email siler.
-- KVKK md.4: employer Pool'da real candidate telefon/email görünmez.
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION search_employer_candidates(
  p_filters jsonb DEFAULT '{}'::jsonb,
  p_employer_company_id bigint DEFAULT NULL,
  p_sort text DEFAULT 'relevance',
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0,
  p_position_id bigint DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_raw jsonb;
  v_candidates jsonb;
  v_stripped jsonb;
  v_item jsonb;
  i int;
BEGIN
  -- Internal fn: real logic + W2 filter (test_seed_batch IS NULL)
  v_raw := _search_employer_candidates_internal(
    p_filters, p_employer_company_id, p_sort, p_limit, p_offset, p_position_id
  );

  -- Strip telefon + email (KVKK md.4 — employer Pool'da PII gizli)
  v_candidates := v_raw -> 'candidates';
  IF v_candidates IS NOT NULL AND jsonb_typeof(v_candidates) = 'array' THEN
    v_stripped := '[]'::jsonb;
    FOR i IN 0 .. jsonb_array_length(v_candidates) - 1 LOOP
      v_item := v_candidates -> i;
      v_item := v_item - 'telefon' - 'email';
      v_stripped := v_stripped || jsonb_build_array(v_item);
    END LOOP;
    v_raw := jsonb_set(v_raw, '{candidates}', v_stripped);
  END IF;

  RETURN v_raw;
END;
$$;

REVOKE ALL ON FUNCTION search_employer_candidates(jsonb, bigint, text, int, int, bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION search_employer_candidates(jsonb, bigint, text, int, int, bigint) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- B2 FIX: search_employer_candidates 5-param — test_seed_batch IS NULL
-- Temel: live prosrc (pg_proc'dan çekildi, 2026-05-01)
-- Değişiklik: visible CTE WHERE'e +1 satır: AND c.test_seed_batch IS NULL
-- 5-param body eski (text search, position scoring yok) — birebir korundu.
-- search_path: pg_catalog, public, pg_temp (20260430211728 ALTER ile vardı,
--   CREATE OR REPLACE body override gerekti — A14 pattern korundu)
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION search_employer_candidates(
  p_filters jsonb DEFAULT '{}'::jsonb,
  p_employer_company_id bigint DEFAULT NULL,
  p_sort text DEFAULT 'relevance',
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_company_id bigint;
  v_results jsonb;

  -- Filter extraction
  f_aktif_arayanlar boolean;
  f_pozisyon text[];
  f_sehir text;
  f_exp_min int;
  f_exp_max int;
  f_segment text[];
  f_musait text[];
  f_calisma text[];
  f_egitim text[];
  f_dil text[];
BEGIN
  -- Auth guard
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT hp.company_id INTO v_company_id
  FROM hr_profiles hp
  WHERE hp.id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employer profile not found — candidates cannot call this RPC';
  END IF;

  IF p_employer_company_id IS NOT NULL AND p_employer_company_id <> v_company_id THEN
    RAISE EXCEPTION 'Company ID mismatch — cannot search on behalf of another company';
  END IF;

  -- Extract filters from JSONB
  f_aktif_arayanlar := COALESCE((p_filters->>'aktifArayanlar')::boolean, false);
  f_sehir           := NULLIF(trim(p_filters->>'sehir'), '');
  f_exp_min         := COALESCE((p_filters->>'expMin')::int, 0);
  f_exp_max         := COALESCE((p_filters->>'expMax')::int, 99);

  SELECT COALESCE(array_agg(x), '{}')
    INTO f_pozisyon
    FROM jsonb_array_elements_text(COALESCE(p_filters->'pozisyon', '[]'::jsonb)) x;

  SELECT COALESCE(array_agg(x), '{}')
    INTO f_segment
    FROM jsonb_array_elements_text(COALESCE(p_filters->'segment', '[]'::jsonb)) x;

  SELECT COALESCE(array_agg(x), '{}')
    INTO f_musait
    FROM jsonb_array_elements_text(COALESCE(p_filters->'musait', '[]'::jsonb)) x;

  SELECT COALESCE(array_agg(x), '{}')
    INTO f_calisma
    FROM jsonb_array_elements_text(COALESCE(p_filters->'calisma', '[]'::jsonb)) x;

  SELECT COALESCE(array_agg(x), '{}')
    INTO f_egitim
    FROM jsonb_array_elements_text(COALESCE(p_filters->'egitim', '[]'::jsonb)) x;

  SELECT COALESCE(array_agg(x), '{}')
    INTO f_dil
    FROM jsonb_array_elements_text(COALESCE(p_filters->'dil', '[]'::jsonb)) x;

  -- Main query
  WITH
  visible AS (
    -- W3 INLINE PII STRIP: telefon + email visible CTE'den de kaldırıldı (KVKK md.4)
    SELECT c.id, c.full_name, c.adres_il,
           c.is_actively_looking, c.updated_at, c.son_pozisyon,
           c.son_sirket, c.son_marka, c.toplam_deneyim_ay,
           c.halen_calisiyor, c.hide_from_current_employer,
           COALESCE(c.profile_completion_pct, 0) AS profile_completion_pct
    FROM candidates c
    WHERE c.is_active = true
      AND (c.profile_completed = true OR COALESCE(c.profile_completion_pct, 0) >= 45)
      AND c.account_status = 'active'
      AND c.test_seed_batch IS NULL                         -- B2: seed adaylar görünmez
  ),

  not_blocked AS (
    SELECT v.*
    FROM visible v
    WHERE NOT EXISTS (
      SELECT 1 FROM candidate_blocked_companies cbc
      WHERE cbc.candidate_id = v.id
        AND cbc.company_id = v_company_id
    )
    OR v_company_id IS NULL
  ),

  employer_brand_ids AS (
    SELECT b.id AS brand_id
    FROM brands b WHERE b.company_id = v_company_id
  ),
  employer_names AS (
    SELECT lower(trim(b.brand_name)) AS n
    FROM brands b WHERE b.company_id = v_company_id
    UNION
    SELECT lower(trim(co.company_name))
    FROM companies co WHERE co.id = v_company_id
  ),
  not_hidden AS (
    SELECT nb.*
    FROM not_blocked nb
    WHERE nb.hide_from_current_employer IS NOT TRUE
       OR v_company_id IS NULL
       OR NOT EXISTS (
         SELECT 1 FROM candidate_experiences ce
         WHERE ce.candidate_id = nb.id
           AND ce.devam_ediyor = true
           AND (
             ce.company_id = v_company_id
             OR ce.brand_id IN (SELECT brand_id FROM employer_brand_ids)
             OR (ce.company_id IS NULL AND ce.brand_id IS NULL AND (
               lower(trim(ce.sirket)) IN (SELECT n FROM employer_names)
               OR lower(trim(ce.marka)) IN (SELECT n FROM employer_names)
             ))
           )
       )
  ),

  with_prefs AS (
    SELECT nh.*,
           wp.musaitlik,
           wp.calisma_tipleri,
           wp.maas_beklenti
    FROM not_hidden nh
    LEFT JOIN candidate_work_preferences wp ON wp.candidate_id = nh.id
  ),

  with_segment AS (
    SELECT wp.*,
           (SELECT ce.segment
            FROM candidate_experiences ce
            WHERE ce.candidate_id = wp.id
            ORDER BY ce.devam_ediyor DESC, ce.baslangic_yil DESC NULLS LAST, COALESCE(ce.baslangic_ay, 1) DESC
            LIMIT 1
           ) AS segment
    FROM with_prefs wp
  ),

  with_edu AS (
    SELECT ws.*,
           (SELECT ed.egitim_seviye
            FROM candidate_education ed
            WHERE ed.candidate_id = ws.id
            ORDER BY ed.sira ASC
            LIMIT 1
           ) AS egitim_seviye
    FROM with_segment ws
  ),

  with_langs AS (
    SELECT we.*,
           COALESCE(
             (SELECT array_agg(cl.dil)
              FROM candidate_languages cl
              WHERE cl.candidate_id = we.id AND cl.dil IS NOT NULL),
             '{}'
           ) AS dil_array
    FROM with_edu we
  ),

  filtered AS (
    SELECT wl.*
    FROM with_langs wl
    WHERE
      (NOT f_aktif_arayanlar OR wl.is_actively_looking = true)
      AND (array_length(f_pozisyon, 1) IS NULL OR wl.son_pozisyon = ANY(f_pozisyon))
      AND (f_sehir IS NULL OR wl.adres_il = f_sehir)
      AND (COALESCE(wl.toplam_deneyim_ay, 0) / 12 >= f_exp_min)
      AND (COALESCE(wl.toplam_deneyim_ay, 0) / 12 <= f_exp_max)
      AND (array_length(f_segment, 1) IS NULL OR wl.segment = ANY(f_segment))
      AND (array_length(f_musait, 1) IS NULL OR wl.musaitlik = ANY(f_musait))
      AND (array_length(f_calisma, 1) IS NULL OR wl.calisma_tipleri && f_calisma)
      AND (array_length(f_egitim, 1) IS NULL OR wl.egitim_seviye = ANY(f_egitim))
      AND (array_length(f_dil, 1) IS NULL OR wl.dil_array && f_dil)
  ),

  scored AS (
    SELECT f.*,
      (
        (CASE WHEN f.is_actively_looking THEN 20 ELSE 0 END)
        + LEAST(ROUND(f.profile_completion_pct * 0.15)::int, 15)
        + (CASE
            WHEN f.updated_at >= now() - interval '30 days' THEN 20
            WHEN f.updated_at >= now() - interval '90 days' THEN 10
            ELSE 0
          END)
        + LEAST(ROUND(COALESCE(f.toplam_deneyim_ay, 0)::numeric / 12)::int, 10)
        + (CASE
            WHEN array_length(f_pozisyon, 1) IS NOT NULL
                 AND EXISTS (
                   SELECT 1 FROM candidate_target_roles ctr
                   WHERE ctr.candidate_id = f.id
                     AND ctr.rol_unvani = ANY(f_pozisyon)
                 )
            THEN 15
            ELSE 0
          END)
        + (CASE
            WHEN f.musaitlik = 'Hemen' THEN 10
            WHEN f.musaitlik = '2 Hafta İçinde' THEN 7
            WHEN f.musaitlik = '1 Ay İçinde' THEN 3
            ELSE 0
          END)
        + (CASE
            WHEN array_length(f_dil, 1) IS NOT NULL AND f.dil_array && f_dil THEN 10
            ELSE 0
          END)
      ) AS match_score,

      ARRAY_REMOVE(ARRAY[
        CASE WHEN f.is_actively_looking THEN 'Aktif iş arıyor' END,
        CASE WHEN f.profile_completion_pct >= 80 THEN 'Detaylı profil' END,
        CASE WHEN f.updated_at >= now() - interval '30 days' THEN 'Son 30 günde güncellendi' END,
        CASE WHEN COALESCE(f.toplam_deneyim_ay, 0) >= 60 THEN '5+ yıl deneyim' END,
        CASE WHEN array_length(f_pozisyon, 1) IS NOT NULL
                  AND EXISTS (
                    SELECT 1 FROM candidate_target_roles ctr
                    WHERE ctr.candidate_id = f.id
                      AND ctr.rol_unvani = ANY(f_pozisyon)
                  )
             THEN 'Hedef rol eşleşmesi' END,
        CASE WHEN f.musaitlik IN ('Hemen', '2 Hafta İçinde') THEN 'Kısa sürede başlayabilir' END,
        CASE WHEN array_length(f_dil, 1) IS NOT NULL AND f.dil_array && f_dil THEN 'Dil eşleşmesi' END
      ], NULL) AS match_reasons

    FROM filtered f
  ),

  sorted AS (
    SELECT s.*
    FROM scored s
    ORDER BY
      CASE WHEN p_sort = 'relevance'    THEN s.match_score END DESC NULLS LAST,
      CASE WHEN p_sort = 'newest'       THEN s.updated_at END DESC NULLS LAST,
      CASE WHEN p_sort = 'exp_asc'      THEN s.toplam_deneyim_ay END ASC NULLS LAST,
      CASE WHEN p_sort = 'exp_desc'     THEN s.toplam_deneyim_ay END DESC NULLS LAST,
      s.match_score DESC NULLS LAST,
      s.updated_at DESC NULLS LAST
  ),

  total_count AS (
    SELECT count(*) AS cnt FROM scored
  ),

  page AS (
    SELECT * FROM sorted
    LIMIT p_limit OFFSET p_offset
  ),

  with_children AS (
    SELECT
      p.id,
      p.full_name,
      p.adres_il,
      -- W3 INLINE PII STRIP: telefon + email kaldırıldı (KVKK md.4)
      -- 5-param overload'da _internal yoktur; doğrudan body'den çıkarıldı.
      p.is_actively_looking,
      p.updated_at,
      p.son_pozisyon,
      p.son_sirket,
      p.son_marka,
      p.toplam_deneyim_ay,
      p.halen_calisiyor,
      p.profile_completion_pct,
      p.musaitlik,
      p.calisma_tipleri,
      p.maas_beklenti,
      p.segment,
      p.egitim_seviye,
      p.dil_array,
      p.match_score,
      p.match_reasons,

      COALESCE(
        (SELECT jsonb_agg(
           jsonb_build_object(
             'sirket', ce.sirket, 'marka', ce.marka, 'pozisyon', ce.pozisyon,
             'sektor', ce.sektor, 'segment', ce.segment, 'departman', ce.departman,
             'istihdam_tipi', ce.istihdam_tipi, 'kidem_seviyesi', ce.kidem_seviyesi,
             'baslangic_ay', ce.baslangic_ay, 'baslangic_yil', ce.baslangic_yil,
             'bitis_ay', ce.bitis_ay, 'bitis_yil', ce.bitis_yil,
             'devam_ediyor', ce.devam_ediyor, 'sehir', ce.sehir,
             'rol_ailesi', ce.rol_ailesi, 'rol_unvani', ce.rol_unvani,
             'company_id', ce.company_id, 'brand_id', ce.brand_id
           ) ORDER BY ce.devam_ediyor DESC, ce.baslangic_yil DESC NULLS LAST
         )
         FROM candidate_experiences ce WHERE ce.candidate_id = p.id
        ), '[]'::jsonb
      ) AS experiences,

      COALESCE(
        (SELECT jsonb_agg(
           jsonb_build_object(
             'egitim_seviye', ed.egitim_seviye, 'okul', ed.okul,
             'bolum', ed.bolum, 'mezun_yil', ed.mezun_yil
           ) ORDER BY ed.sira ASC
         )
         FROM candidate_education ed WHERE ed.candidate_id = p.id
        ), '[]'::jsonb
      ) AS education,

      COALESCE(
        (SELECT jsonb_agg(
           jsonb_build_object('dil', cl.dil, 'seviye', cl.seviye)
           ORDER BY cl.sira ASC
         )
         FROM candidate_languages cl WHERE cl.candidate_id = p.id
        ), '[]'::jsonb
      ) AS diller_objects

    FROM page p
  )

  SELECT jsonb_build_object(
    'total', (SELECT cnt FROM total_count),
    'candidates', COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', wc.id,
          'full_name', wc.full_name,
          'adres_il', wc.adres_il,
          -- W3 INLINE PII STRIP: telefon + email kaldırıldı (KVKK md.4)
          'is_actively_looking', wc.is_actively_looking,
          'updated_at', wc.updated_at,
          'son_pozisyon', wc.son_pozisyon,
          'son_sirket', wc.son_sirket,
          'son_marka', wc.son_marka,
          'toplam_deneyim_ay', wc.toplam_deneyim_ay,
          'halen_calisiyor', wc.halen_calisiyor,
          'profile_completion_pct', wc.profile_completion_pct,
          'musaitlik', wc.musaitlik,
          'calisma_tipleri', wc.calisma_tipleri,
          'maas_beklenti', wc.maas_beklenti,
          'segment', wc.segment,
          'egitim_seviye', wc.egitim_seviye,
          'match_score', wc.match_score,
          'match_reasons', wc.match_reasons,
          'experiences', wc.experiences,
          'education', wc.education,
          'diller', to_jsonb(wc.dil_array),
          'languages', wc.diller_objects
        )
      ) FROM with_children wc),
      '[]'::jsonb
    )
  ) INTO v_results;

  RETURN v_results;
END;
$$;

REVOKE ALL ON FUNCTION search_employer_candidates(jsonb, bigint, text, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION search_employer_candidates(jsonb, bigint, text, int, int) TO authenticated;
