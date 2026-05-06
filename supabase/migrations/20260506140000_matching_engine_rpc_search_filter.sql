-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  M-RPC-1 — search_employer_candidates güncelleme                    ║
-- ║  Tarih: 2026-05-06                                                  ║
-- ║  Tier: T3 (RPC update, SECURITY DEFINER)                           ║
-- ║  Codex: ZORUNLU                                                      ║
-- ║                                                                      ║
-- ║  KAPSAM:                                                             ║
-- ║   1. 6-param overload güncelleme (canonical, backwards compat)      ║
-- ║   2. Yeni filter alanları p_filters JSONB içinde:                   ║
-- ║      calisma_tipi[], musaitlik, egitim_seviye, diller[],            ║
-- ║      tercih_segmentler[]                                             ║
-- ║   3. NULL-safe: alan p_filters'ta yoksa filter atlanır              ║
-- ║   4. Position-aware: p_position_id verilince yeni kriter kolonları  ║
-- ║      da auto-fetch edilir (M2'de eklenen alanlar)                   ║
-- ║   5. search_path harden (A14 pattern)                               ║
-- ║                                                                      ║
-- ║  BACKWARD COMPAT: 6-param signature korunur. Yeni filterlar        ║
-- ║  p_filters JSONB içinde — mevcut caller'lar NULL geçerse no-op.     ║
-- ║                                                                      ║
-- ║  5-param overload DEĞİŞTİRİLMEZ — mevcut halini korur.             ║
-- ║  (5-param zaten lifecycle guard + W4 FIX restore — 20260504181037) ║
-- ║                                                                      ║
-- ║  ROLLBACK: docs/rollback/matching-engine-rollback.sql               ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════
-- 6-PARAM OVERLOAD — position-aware + yeni filter alanları
-- Mevcut W4 FIX restore + A8-B lifecycle guard KORUNUR
-- ═══════════════════════════════════════════════════════════════
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
  v_user_id uuid;
  v_company_id bigint;
  v_results jsonb;

  v_caller_active boolean;
  v_caller_status account_status_enum;

  -- Position-aware scoring değişkenleri
  v_pos_title text;
  v_pos_sehir text;
  v_pos_seg text;
  v_pos_exp text;
  v_pos_exp_min int;
  v_pos_exp_max int;
  -- M2 yeni kriter alanları (positions tablosundan)
  v_pos_calisma_tipi text[];
  v_pos_musaitlik text;
  v_pos_egitim_seviye text;
  v_pos_diller text[];
  v_pos_tercih_segmentler text[];
  v_pos_threshold int;

  -- Filter değişkenleri (mevcut)
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
  f_search text;
  v_search_escaped text;
  f_candidate_id bigint;

  -- M2 yeni filter değişkenleri (p_filters'tan)
  f_musaitlik_pozisyon text;
  f_tercih_segmentler text[];
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT hp.company_id, hp.is_active, hp.account_status
    INTO v_company_id, v_caller_active, v_caller_status
  FROM hr_profiles hp
  WHERE hp.id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employer profile not found — candidates cannot call this RPC';
  END IF;

  IF v_caller_active = false OR v_caller_status <> 'active' THEN
    -- E3 Codex iter-3 fix: lifecycle reject audit (önceki migration 20260504195122 pattern restore)
    INSERT INTO public.employer_pool_query_log (
      hr_profile_id, company_id, filters, position_id, result_total
    ) VALUES (
      v_user_id, v_company_id,
      p_filters || jsonb_build_object('_rejected', 'lifecycle'),
      p_position_id, 0
    );
    RETURN jsonb_build_object('total', 0, 'candidates', '[]'::jsonb);
  END IF;

  -- C3 Codex fix: corporate-email gate restore (A5 audit trail önceki migration 20260504195122'den)
  -- Gmail/Hotmail HR hesapları employer pool'a erişemez. Reject log'a yazılır.
  IF NOT public.is_corporate_email() THEN
    INSERT INTO public.employer_pool_query_log (
      hr_profile_id, company_id, filters, position_id, result_total
    ) VALUES (
      v_user_id, v_company_id,
      p_filters || jsonb_build_object('_rejected', 'non_corporate_email'),
      p_position_id, 0
    );
    RETURN jsonb_build_object('total', 0, 'candidates', '[]'::jsonb);
  END IF;

  IF p_employer_company_id IS NOT NULL AND p_employer_company_id <> v_company_id THEN
    RAISE EXCEPTION 'Company ID mismatch — cannot search on behalf of another company';
  END IF;

  -- ─── Position-aware: position kriterleri auto-fetch ───────────────
  IF p_position_id IS NOT NULL THEN
    SELECT
      pos.ad,
      pos.sehir,
      pos.seg,
      pos.exp,
      pos.calisma_tipi,
      pos.musaitlik_pozisyon,
      pos.egitim_seviye,
      pos.diller,
      pos.tercih_segmentler,
      COALESCE((pos.metadata->>'auto_match_threshold')::int, 50)
    INTO
      v_pos_title, v_pos_sehir, v_pos_seg, v_pos_exp,
      v_pos_calisma_tipi, v_pos_musaitlik, v_pos_egitim_seviye,
      v_pos_diller, v_pos_tercih_segmentler, v_pos_threshold
    FROM positions pos
    WHERE pos.id = p_position_id
      AND pos.company_id = v_company_id;

    IF NOT FOUND THEN
      v_pos_title := NULL;
      v_pos_threshold := 50;
    END IF;

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

  -- ─── Filter parse (mevcut + yeni M2 alanları) ────────────────────
  f_aktif_arayanlar := COALESCE((p_filters->>'aktifArayanlar')::boolean, false);
  f_sehir           := NULLIF(trim(p_filters->>'sehir'), '');
  f_exp_min         := COALESCE((p_filters->>'expMin')::int, 0);
  f_exp_max         := COALESCE((p_filters->>'expMax')::int, 99);
  f_search          := NULLIF(trim(p_filters->>'search'), '');
  f_candidate_id    := NULLIF(p_filters->>'candidate_id', '')::bigint;
  -- M2 yeni alanlar (NULL-safe: JSONB key yoksa NULL → filter atlanır)
  f_musaitlik_pozisyon := NULLIF(trim(p_filters->>'musaitlik'), '');

  IF f_search IS NOT NULL THEN
    v_search_escaped := replace(replace(replace(f_search, '\', '\\'), '%', '\%'), '_', '\_');
  END IF;

  SELECT COALESCE(array_agg(x), '{}') INTO f_pozisyon
    FROM jsonb_array_elements_text(COALESCE(p_filters->'pozisyon', '[]'::jsonb)) x;
  SELECT COALESCE(array_agg(x), '{}') INTO f_segment
    FROM jsonb_array_elements_text(COALESCE(p_filters->'segment', '[]'::jsonb)) x;
  SELECT COALESCE(array_agg(x), '{}') INTO f_musait
    FROM jsonb_array_elements_text(COALESCE(p_filters->'musait', '[]'::jsonb)) x;
  SELECT COALESCE(array_agg(x), '{}') INTO f_calisma
    FROM jsonb_array_elements_text(COALESCE(p_filters->'calisma', '[]'::jsonb)) x;
  SELECT COALESCE(array_agg(x), '{}') INTO f_egitim
    FROM jsonb_array_elements_text(COALESCE(p_filters->'egitim', '[]'::jsonb)) x;
  SELECT COALESCE(array_agg(x), '{}') INTO f_dil
    FROM jsonb_array_elements_text(COALESCE(p_filters->'dil', '[]'::jsonb)) x;
  -- M2 yeni array filterlar
  SELECT COALESCE(array_agg(x), '{}') INTO f_tercih_segmentler
    FROM jsonb_array_elements_text(COALESCE(p_filters->'tercih_segmentler', '[]'::jsonb)) x;

  WITH
  visible AS (
    -- F3 Codex iter-4 fix: telefon + email PII kaldırıldı (önceki 20260504195122 A2 hotfix pattern restore)
    -- Data minimization: bu RPC contact PII döndürmüyor, working set'te tutmak gereksiz risk.
    SELECT c.id, c.full_name, c.adres_il,
           c.is_actively_looking, c.updated_at, c.son_pozisyon,
           c.son_sirket, c.son_marka, c.toplam_deneyim_ay,
           c.halen_calisiyor, c.hide_from_current_employer,
           COALESCE(c.profile_completion_pct, 0) AS profile_completion_pct
    FROM candidates c
    WHERE c.is_active = true
      AND (c.profile_completed = true OR COALESCE(c.profile_completion_pct, 0) >= 45)
      AND c.account_status = 'active'
      AND (f_candidate_id IS NULL OR c.id = f_candidate_id)
  ),
  not_blocked AS (
    SELECT v.* FROM visible v
    WHERE NOT EXISTS (
      SELECT 1 FROM candidate_blocked_companies cbc
      WHERE cbc.candidate_id = v.id AND cbc.company_id = v_company_id
    )
    OR v_company_id IS NULL
  ),
  employer_brand_ids AS (
    SELECT b.id AS brand_id FROM brands b WHERE b.company_id = v_company_id
  ),
  employer_names AS (
    SELECT lower(trim(b.brand_name)) AS n FROM brands b WHERE b.company_id = v_company_id
    UNION
    SELECT lower(trim(co.company_name)) FROM companies co WHERE co.id = v_company_id
  ),
  not_hidden AS (
    SELECT nb.* FROM not_blocked nb
    WHERE nb.hide_from_current_employer IS NOT TRUE
       OR v_company_id IS NULL
       OR NOT EXISTS (
         SELECT 1 FROM candidate_experiences ce
         WHERE ce.candidate_id = nb.id AND ce.devam_ediyor = true
           AND (ce.company_id = v_company_id
                OR ce.brand_id IN (SELECT brand_id FROM employer_brand_ids)
                OR (ce.company_id IS NULL AND ce.brand_id IS NULL AND (
                  lower(trim(ce.sirket)) IN (SELECT n FROM employer_names)
                  OR lower(trim(ce.marka)) IN (SELECT n FROM employer_names)
                )))
       )
  ),
  with_prefs AS (
    SELECT nh.*,
           wp.musaitlik, wp.calisma_tipleri, wp.maas_beklenti,
           wp.travel_willingness, wp.shift_flexibility, wp.notice_period
    FROM not_hidden nh
    LEFT JOIN candidate_work_preferences wp ON wp.candidate_id = nh.id
  ),
  with_segment AS (
    SELECT wp.*,
           (SELECT ce.segment FROM candidate_experiences ce
            WHERE ce.candidate_id = wp.id
            ORDER BY ce.devam_ediyor DESC, ce.baslangic_yil DESC NULLS LAST, COALESCE(ce.baslangic_ay, 1) DESC
            LIMIT 1) AS segment
    FROM with_prefs wp
  ),
  with_edu AS (
    SELECT ws.*,
           (SELECT ed.egitim_seviye FROM candidate_education ed
            WHERE ed.candidate_id = ws.id
            ORDER BY ed.sira ASC LIMIT 1) AS egitim_seviye
    FROM with_segment ws
  ),
  with_langs AS (
    SELECT we.*,
           COALESCE(
             (SELECT array_agg(cl.dil) FROM candidate_languages cl
              WHERE cl.candidate_id = we.id AND cl.dil IS NOT NULL),
             '{}'
           ) AS dil_array
    FROM with_edu we
  ),
  filtered AS (
    SELECT wl.* FROM with_langs wl
    WHERE
      -- Mevcut filterlar (korunur)
      (f_search IS NULL
        OR wl.full_name    ILIKE '%' || v_search_escaped || '%' ESCAPE '\'
        OR wl.son_pozisyon ILIKE '%' || v_search_escaped || '%' ESCAPE '\'
        OR wl.adres_il     ILIKE '%' || v_search_escaped || '%' ESCAPE '\')
      AND (NOT f_aktif_arayanlar OR wl.is_actively_looking = true)
      AND (array_length(f_pozisyon, 1) IS NULL OR wl.son_pozisyon = ANY(f_pozisyon))
      AND (f_sehir IS NULL OR wl.adres_il = f_sehir
           OR EXISTS (SELECT 1 FROM candidate_location_preferences clp
                      WHERE clp.candidate_id = wl.id AND clp.sehir = f_sehir))
      AND (COALESCE(wl.toplam_deneyim_ay, 0) / 12 >= f_exp_min)
      AND (COALESCE(wl.toplam_deneyim_ay, 0) / 12 <= f_exp_max)
      AND (array_length(f_segment, 1) IS NULL OR wl.segment = ANY(f_segment))
      AND (array_length(f_musait, 1) IS NULL OR wl.musaitlik = ANY(f_musait))
      AND (array_length(f_calisma, 1) IS NULL OR wl.calisma_tipleri && f_calisma)
      AND (array_length(f_egitim, 1) IS NULL OR wl.egitim_seviye = ANY(f_egitim))
      AND (array_length(f_dil, 1) IS NULL OR wl.dil_array && f_dil)
      -- M2 yeni filterlar (NULL-safe: alan yoksa atlanır)
      -- A4 FIX (2026-05-06): exact match kullan — value set'ler artık aligned (her ikisi Türkçe text)
      AND (f_musaitlik_pozisyon IS NULL OR wl.musaitlik = f_musaitlik_pozisyon)
      AND (array_length(f_tercih_segmentler, 1) IS NULL OR wl.segment = ANY(f_tercih_segmentler))
      -- E4 Codex iter-3 fix: strict exact match — aday eksik kriter NULL ise pozisyon kriteri varsa DIŞLA.
      -- "exact match" semantik için NULL pass-through niyeti ihlal eder (silently widening).
      -- Position-aware filter: positions.calisma_tipi (v_pos_calisma_tipi)
      AND (v_pos_calisma_tipi IS NULL
           OR wl.calisma_tipleri && v_pos_calisma_tipi)  -- NULL aday dışlanır (NULL && [...] = NULL = FALSE)
      -- H3 Codex iter-6 fix: positions.diller "ALL required" semantic (superset).
      -- Eski `&&` (overlap = any match) yanlış: pozisyon ['İngilizce','Arapça'] → aday sadece İngilizce eşleşmemeli.
      -- `@>` (contains all): aday array'i pozisyon array'ini içermeli (aday tüm gerekli dilleri biliyor).
      AND (v_pos_diller IS NULL
           OR array_length(v_pos_diller, 1) IS NULL
           OR wl.dil_array @> v_pos_diller)  -- NULL aday dışlanır + tüm gerekli diller olmalı
      -- H1 Codex iter-6 fix: musaitlik_pozisyon MINIMUM requirement (sooner is better).
      -- aday_level <= pozisyon_level → aday daha erken başlayabilir VE eşit kabul.
      -- Helper: musaitlik_level (20260506115000_matching_engine_ordinal_helpers.sql)
      AND (v_pos_musaitlik IS NULL
           OR (public.musaitlik_level(wl.musaitlik) IS NOT NULL
               AND public.musaitlik_level(wl.musaitlik) <= public.musaitlik_level(v_pos_musaitlik)))
      -- H2 Codex iter-6 fix: egitim_seviye MINIMUM requirement (more is better).
      -- aday_level >= pozisyon_level → aday minimum eğitimi karşılar VEYA aşar.
      AND (v_pos_egitim_seviye IS NULL
           OR (public.egitim_level(wl.egitim_seviye) IS NOT NULL
               AND public.egitim_level(wl.egitim_seviye) >= public.egitim_level(v_pos_egitim_seviye)))
  ),
  scored AS (
    SELECT f.*,
      LEAST(100,
        CASE
          WHEN v_pos_title IS NOT NULL THEN
            -- Position-aware scoring (mevcut, genişletilmiş)
            (CASE WHEN EXISTS (SELECT 1 FROM candidate_target_roles ctr
                               WHERE ctr.candidate_id = f.id
                                 AND lower(trim(ctr.rol_unvani)) = lower(trim(v_pos_title)))
                  THEN 18 ELSE 0 END)
            + (CASE WHEN EXISTS (SELECT 1 FROM candidate_experiences ce
                                 WHERE ce.candidate_id = f.id
                                   AND lower(trim(ce.pozisyon)) = lower(trim(v_pos_title)))
                    THEN 12 ELSE 0 END)
            + (CASE WHEN v_pos_seg IS NOT NULL AND f.segment IS NOT NULL
                         AND lower(trim(f.segment)) = lower(trim(v_pos_seg))
                    THEN 10 ELSE 0 END)
            + (CASE WHEN v_pos_sehir IS NOT NULL AND (
                (f.adres_il IS NOT NULL AND lower(trim(f.adres_il)) = lower(trim(v_pos_sehir)))
                OR EXISTS (SELECT 1 FROM candidate_location_preferences clp
                           WHERE clp.candidate_id = f.id
                             AND lower(trim(clp.sehir)) = lower(trim(v_pos_sehir))))
                    THEN 10 ELSE 0 END)
            + (CASE WHEN v_pos_exp_min IS NOT NULL THEN
                  CASE WHEN COALESCE(f.toplam_deneyim_ay, 0) / 12 BETWEEN v_pos_exp_min AND v_pos_exp_max THEN 8
                       WHEN COALESCE(f.toplam_deneyim_ay, 0) / 12 BETWEEN v_pos_exp_min - 1 AND v_pos_exp_max + 2 THEN 4
                       ELSE 0 END
                ELSE 0 END)
            + (CASE WHEN f.musaitlik = 'Hemen' THEN 8
                    WHEN f.musaitlik = '2 Hafta İçinde' THEN 6
                    WHEN f.musaitlik = '1 Ay İçinde' THEN 3 ELSE 0 END)
            + (CASE WHEN v_company_id IS NOT NULL AND EXISTS (
                  SELECT 1 FROM candidate_experiences ce
                  WHERE ce.candidate_id = f.id
                    AND (ce.company_id = v_company_id
                         OR ce.brand_id IN (SELECT brand_id FROM employer_brand_ids)))
                  THEN 6 ELSE 0 END)
            + (CASE WHEN f.is_actively_looking THEN 6 ELSE 0 END)
            + (CASE WHEN f.updated_at >= now() - interval '30 days' THEN 5
                    WHEN f.updated_at >= now() - interval '90 days' THEN 2 ELSE 0 END)
            + LEAST(ROUND(f.profile_completion_pct * 0.04)::int, 4)
            -- M2 bonus scoring: yeni kriter eşleşmeleri
            + (CASE WHEN v_pos_calisma_tipi IS NOT NULL
                         AND f.calisma_tipleri IS NOT NULL
                         AND f.calisma_tipleri && v_pos_calisma_tipi THEN 5 ELSE 0 END)
            + (CASE WHEN v_pos_diller IS NOT NULL
                         AND array_length(v_pos_diller, 1) IS NOT NULL
                         AND f.dil_array && v_pos_diller THEN 5 ELSE 0 END)
            + (CASE WHEN v_pos_tercih_segmentler IS NOT NULL
                         AND array_length(v_pos_tercih_segmentler, 1) IS NOT NULL
                         AND f.segment = ANY(v_pos_tercih_segmentler) THEN 4 ELSE 0 END)
          ELSE
            -- Generic scoring (pozisyon yok)
            (CASE WHEN f.is_actively_looking THEN 20 ELSE 0 END)
            + LEAST(ROUND(f.profile_completion_pct * 0.15)::int, 15)
            + (CASE WHEN f.updated_at >= now() - interval '30 days' THEN 20
                    WHEN f.updated_at >= now() - interval '90 days' THEN 10 ELSE 0 END)
            + LEAST(ROUND(COALESCE(f.toplam_deneyim_ay, 0)::numeric / 12)::int, 10)
            + (CASE WHEN array_length(f_pozisyon, 1) IS NOT NULL
                         AND EXISTS (SELECT 1 FROM candidate_target_roles ctr
                                     WHERE ctr.candidate_id = f.id
                                       AND ctr.rol_unvani = ANY(f_pozisyon))
                    THEN 15 ELSE 0 END)
            + (CASE WHEN f.musaitlik = 'Hemen' THEN 10
                    WHEN f.musaitlik = '2 Hafta İçinde' THEN 7
                    WHEN f.musaitlik = '1 Ay İçinde' THEN 3 ELSE 0 END)
            + (CASE WHEN array_length(f_dil, 1) IS NOT NULL AND f.dil_array && f_dil THEN 10 ELSE 0 END)
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
          OR EXISTS (SELECT 1 FROM candidate_location_preferences clp
                     WHERE clp.candidate_id = f.id
                       AND lower(trim(clp.sehir)) = lower(trim(v_pos_sehir)))
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
                  AND EXISTS (SELECT 1 FROM candidate_target_roles ctr
                              WHERE ctr.candidate_id = f.id
                                AND ctr.rol_unvani = ANY(f_pozisyon))
             THEN 'Hedef rol eşleşmesi' END,
        CASE WHEN f.musaitlik IN ('Hemen', '2 Hafta İçinde') THEN 'Kısa sürede başlayabilir' END,
        CASE WHEN array_length(f_dil, 1) IS NOT NULL AND f.dil_array && f_dil THEN 'Dil eşleşmesi' END,
        -- M2 yeni match reasons
        CASE WHEN v_pos_calisma_tipi IS NOT NULL AND f.calisma_tipleri IS NOT NULL
                  AND f.calisma_tipleri && v_pos_calisma_tipi THEN 'Çalışma tipi eşleşmesi' END,
        CASE WHEN v_pos_diller IS NOT NULL AND array_length(v_pos_diller,1) IS NOT NULL
                  AND f.dil_array && v_pos_diller THEN 'Dil eşleşmesi (pozisyon)' END,
        CASE WHEN v_pos_tercih_segmentler IS NOT NULL
                  AND array_length(v_pos_tercih_segmentler,1) IS NOT NULL
                  AND f.segment = ANY(v_pos_tercih_segmentler) THEN 'Tercih segment eşleşmesi' END
      ], NULL) AS match_reasons
    FROM filtered f
  ),
  sorted AS (
    SELECT s.* FROM scored s
    ORDER BY
      CASE WHEN p_sort = 'relevance' THEN s.match_score END DESC NULLS LAST,
      CASE WHEN p_sort = 'newest'    THEN s.updated_at END DESC NULLS LAST,
      CASE WHEN p_sort = 'exp_asc'   THEN s.toplam_deneyim_ay END ASC NULLS LAST,
      CASE WHEN p_sort = 'exp_desc'  THEN s.toplam_deneyim_ay END DESC NULLS LAST,
      CASE WHEN p_sort = 'name'      THEN s.full_name END ASC NULLS LAST,
      s.match_score DESC NULLS LAST,
      s.updated_at DESC NULLS LAST
  ),
  total_count AS (SELECT count(*) AS cnt FROM scored),
  page AS (SELECT * FROM sorted LIMIT p_limit OFFSET p_offset),
  with_children AS (
    SELECT
      -- G2 Codex iter-5 fix: F3 strip eksik kalmış — with_children CTE'de telefon+email referansı kaldırıldı.
      -- visible CTE'den artık gelmiyor, downstream "column p.telefon does not exist" runtime error'u önle.
      p.id, p.full_name, p.adres_il,
      p.is_actively_looking, p.updated_at, p.son_pozisyon, p.son_sirket, p.son_marka,
      p.toplam_deneyim_ay, p.halen_calisiyor, p.profile_completion_pct,
      p.musaitlik, p.calisma_tipleri, p.maas_beklenti,
      p.travel_willingness,
      p.shift_flexibility,
      p.notice_period,
      p.segment, p.egitim_seviye, p.dil_array,
      p.match_score, p.match_reasons,
      COALESCE(
        (SELECT jsonb_agg(jsonb_build_object(
           'sirket', ce.sirket, 'marka', ce.marka, 'pozisyon', ce.pozisyon,
           'sektor', ce.sektor, 'segment', ce.segment, 'departman', ce.departman,
           'istihdam_tipi', ce.istihdam_tipi, 'kidem_seviyesi', ce.kidem_seviyesi,
           'baslangic_ay', ce.baslangic_ay, 'baslangic_yil', ce.baslangic_yil,
           'bitis_ay', ce.bitis_ay, 'bitis_yil', ce.bitis_yil,
           'devam_ediyor', ce.devam_ediyor, 'sehir', ce.sehir,
           'rol_ailesi', ce.rol_ailesi, 'rol_unvani', ce.rol_unvani,
           'company_id', ce.company_id, 'brand_id', ce.brand_id,
           'description', ce.description, 'takim_buyuklugu', ce.takim_buyuklugu
         ) ORDER BY ce.devam_ediyor DESC, ce.baslangic_yil DESC NULLS LAST)
         FROM candidate_experiences ce WHERE ce.candidate_id = p.id), '[]'::jsonb
      ) AS experiences,
      COALESCE(
        (SELECT jsonb_agg(jsonb_build_object(
           'egitim_seviye', ed.egitim_seviye, 'okul', ed.okul,
           'bolum', ed.bolum, 'mezun_yil', ed.mezun_yil
         ) ORDER BY ed.sira ASC)
         FROM candidate_education ed WHERE ed.candidate_id = p.id), '[]'::jsonb
      ) AS education,
      COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('dil', cl.dil, 'seviye', cl.seviye)
           ORDER BY cl.sira ASC)
         FROM candidate_languages cl WHERE cl.candidate_id = p.id), '[]'::jsonb
      ) AS diller_objects
    FROM page p
  )
  SELECT jsonb_build_object(
    'total', (SELECT cnt FROM total_count),
    'threshold', v_pos_threshold,  -- position_id verilince threshold döner (auto-match UI için)
    'candidates', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'id', wc.id, 'full_name', wc.full_name, 'adres_il', wc.adres_il,
        -- PII strip (Codex T3 BLOCKER 2026-05-04, KVKK md.4):
        'is_actively_looking', wc.is_actively_looking,
        'updated_at', wc.updated_at, 'son_pozisyon', wc.son_pozisyon,
        'son_sirket', wc.son_sirket, 'son_marka', wc.son_marka,
        'toplam_deneyim_ay', wc.toplam_deneyim_ay,
        'halen_calisiyor', wc.halen_calisiyor,
        'profile_completion_pct', wc.profile_completion_pct,
        'musaitlik', wc.musaitlik, 'calisma_tipleri', wc.calisma_tipleri,
        'maas_beklenti', wc.maas_beklenti,
        'travel_willingness', wc.travel_willingness,
        'shift_flexibility', wc.shift_flexibility,
        'notice_period', wc.notice_period,
        'segment', wc.segment, 'egitim_seviye', wc.egitim_seviye,
        'match_score', wc.match_score, 'match_reasons', wc.match_reasons,
        'experiences', wc.experiences, 'education', wc.education,
        'diller', to_jsonb(wc.dil_array), 'languages', wc.diller_objects
      )) FROM with_children wc),
      '[]'::jsonb
    )
  ) INTO v_results;

  -- F2 Codex iter-4 fix: success-path audit logging restore (önceki 20260504195122 pattern)
  -- KVKK Q7 + access audit trail: tüm başarılı search'ler employer_pool_query_log'a yazılır
  INSERT INTO public.employer_pool_query_log (
    hr_profile_id, company_id, filters, position_id, result_total
  ) VALUES (
    v_user_id, v_company_id, p_filters, p_position_id,
    COALESCE((v_results ->> 'total')::int, 0)
  );

  RETURN v_results;
END;
$$;

COMMENT ON FUNCTION search_employer_candidates(jsonb, bigint, text, int, int, bigint) IS
  'Matching Engine M-RPC-1 (2026-05-06): M2 yeni kriter filterları + position-aware scoring genişletme. '
  '6-param canonical, backwards compat. search_path pg_catalog,public,pg_temp (A14).';

-- ═══════════════════════════════════════════════════════════════
-- DRY RUN VERIFY BLOCK
-- ═══════════════════════════════════════════════════════════════

-- VERIFY 1: RPC çağrısı — 6-param signature çalışıyor
-- SELECT search_employer_candidates('{}', NULL, 'relevance', 10, 0, NULL);
-- Beklenen: {total: N, threshold: null, candidates: [...]}

-- VERIFY 2: position_id verilince threshold döner
-- SELECT search_employer_candidates('{}', NULL, 'relevance', 10, 0, VALID_POS_ID);
-- Beklenen: {total: N, threshold: 50 (default), candidates: [...]}

-- VERIFY 3: Yeni filter — dil filter çalışıyor
-- SELECT search_employer_candidates('{"dil":["İngilizce"]}', NULL, 'relevance', 10, 0, NULL);
-- Beklenen: Sadece İngilizce bilen adaylar

-- VERIFY 4: Yeni filter — tercih_segmentler
-- SELECT search_employer_candidates('{"tercih_segmentler":["Luxury"]}', NULL, 'relevance', 10, 0, NULL);
-- Beklenen: Luxury segment adaylar
