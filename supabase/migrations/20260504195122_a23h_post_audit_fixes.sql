-- ═══════════════════════════════════════════════════════════════════
-- Migration: a23h_post_audit_fixes (post-deploy audit hotfix)
-- Date: 2026-05-04
-- Ref: A23 post-deploy auditor (A1-A8) + data-analyst (F1-F3)
-- Tier: T3 (PII / KVKK / RLS comment)
-- ─────────────────────────────────────────────────────────────────
-- KAPSAM:
--   A2 — visible CTE'den telefon/email kolonları kaldırıldı
--        (PostgreSQL working set'inde PII bellekte kalmasın). Hem 5+6 param.
--   A5 — Rejected corporate access path'i audit log INSERT (KVKK md.7).
--   A3 — employer_pool_query_log tablosu comment'ine RLS exception notu.
--   F3 — "Istanbul" → "İstanbul" data quality fix (1 row, K032 test seed).
--
-- A1+A6 — Edge Function (notify-hr-lead) — ayrı deploy.
-- A8 — regex `\.` escape: PostgreSQL karakter sınıfında `.` zaten literal,
--      teknik fix gerekmiyor (auditor LOW finding nominal).
--
-- ROLLBACK:
--   20260504181530 dosyasındaki RPC body'yi tekrar uygula.
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- A3 fix: Migration kuralı — RLS exception notu
-- ─────────────────────────────────────────────────────────────────
COMMENT ON TABLE public.employer_pool_query_log IS
  'A23 Q7 (2026-05-04) — KVKK md.7 audit log: employer havuz query erişimleri. '
  'Per-call (page-level) log; per-candidate değil (volume kontrol). '
  'Retention: 90 gün cron purge. '
  'RLS EXCEPTION: INSERT policy yok — sadece SECURITY DEFINER RPC '
  '(search_employer_candidates) içinden context bypass ile yazılır. '
  'email_outbox pattern (architecture-decisions.md#rls-exceptions) ile aynı. '
  'SELECT: sadece is_internal_admin (feature_flags). DELETE: sadece cron service_role.';

-- ─────────────────────────────────────────────────────────────────
-- F3 fix: data quality — "Istanbul" → "İstanbul"
-- (data-analyst finding: K032 seed test user, sehir filtresi bypass)
-- ─────────────────────────────────────────────────────────────────
UPDATE public.candidates
   SET adres_il = 'İstanbul'
 WHERE adres_il = 'Istanbul';

-- ─────────────────────────────────────────────────────────────────
-- A2 + A5 fix: search_employer_candidates 6-param overload
--   - visible CTE'den telefon/email kolonlar TAMAMEN kaldırıldı
--     (auditor A2: PostgreSQL working set'te PII bellekte kalmasın)
--   - Corporate guard early-return path'inde audit INSERT
--     (auditor A5: KVKK md.7 rejected access audit)
-- ─────────────────────────────────────────────────────────────────
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
  v_pos_title text;
  v_pos_sehir text;
  v_pos_seg text;
  v_pos_exp text;
  v_pos_exp_min int;
  v_pos_exp_max int;
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
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT hp.company_id, hp.is_active, hp.account_status
    INTO v_company_id, v_caller_active, v_caller_status
  FROM hr_profiles hp WHERE hp.id = v_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employer profile not found — candidates cannot call this RPC';
  END IF;

  IF v_caller_active = false OR v_caller_status <> 'active' THEN
    -- A5: lifecycle reject de audit'lensin (rejected_lifecycle marker filters'a)
    INSERT INTO public.employer_pool_query_log (
      hr_profile_id, company_id, filters, position_id, result_total
    ) VALUES (
      v_user_id, v_company_id,
      p_filters || jsonb_build_object('_rejected', 'lifecycle'),
      p_position_id, 0
    );
    RETURN jsonb_build_object('total', 0, 'candidates', '[]'::jsonb);
  END IF;

  -- A5: corporate guard reject audit
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

  IF p_position_id IS NOT NULL THEN
    SELECT pos.ad, pos.sehir, pos.seg, pos.exp
    INTO v_pos_title, v_pos_sehir, v_pos_seg, v_pos_exp
    FROM positions pos
    WHERE pos.id = p_position_id AND pos.company_id = v_company_id;
    IF NOT FOUND THEN v_pos_title := NULL; END IF;
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
      END IF;
    END IF;
  END IF;

  f_aktif_arayanlar := COALESCE((p_filters->>'aktifArayanlar')::boolean, false);
  f_sehir           := NULLIF(trim(p_filters->>'sehir'), '');
  f_exp_min         := COALESCE((p_filters->>'expMin')::int, 0);
  f_exp_max         := COALESCE((p_filters->>'expMax')::int, 99);
  f_search          := NULLIF(trim(p_filters->>'search'), '');
  f_candidate_id    := NULLIF(p_filters->>'candidate_id', '')::bigint;
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

  WITH
  -- A2 fix: visible CTE'den telefon ve email kolonları kaldırıldı (PII bellek minimization)
  visible AS (
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
    ) OR v_company_id IS NULL
  ),
  employer_brand_ids AS (SELECT b.id AS brand_id FROM brands b WHERE b.company_id = v_company_id),
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
    SELECT nh.*, wp.musaitlik, wp.calisma_tipleri, wp.maas_beklenti,
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
            WHERE ed.candidate_id = ws.id ORDER BY ed.sira ASC LIMIT 1) AS egitim_seviye
    FROM with_segment ws
  ),
  with_langs AS (
    SELECT we.*,
           COALESCE((SELECT array_agg(cl.dil) FROM candidate_languages cl
                     WHERE cl.candidate_id = we.id AND cl.dil IS NOT NULL),
                    '{}') AS dil_array
    FROM with_edu we
  ),
  filtered AS (
    SELECT wl.* FROM with_langs wl
    WHERE
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
  ),
  scored AS (
    SELECT f.*,
      LEAST(100,
        CASE
          WHEN v_pos_title IS NOT NULL THEN
            (CASE WHEN EXISTS (SELECT 1 FROM candidate_target_roles ctr WHERE ctr.candidate_id = f.id AND lower(trim(ctr.rol_unvani)) = lower(trim(v_pos_title))) THEN 18 ELSE 0 END)
            + (CASE WHEN EXISTS (SELECT 1 FROM candidate_experiences ce WHERE ce.candidate_id = f.id AND lower(trim(ce.pozisyon)) = lower(trim(v_pos_title))) THEN 12 ELSE 0 END)
            + (CASE WHEN v_pos_seg IS NOT NULL AND f.segment IS NOT NULL AND lower(trim(f.segment)) = lower(trim(v_pos_seg)) THEN 10 ELSE 0 END)
            + (CASE WHEN v_pos_sehir IS NOT NULL AND ((f.adres_il IS NOT NULL AND lower(trim(f.adres_il)) = lower(trim(v_pos_sehir))) OR EXISTS (SELECT 1 FROM candidate_location_preferences clp WHERE clp.candidate_id = f.id AND lower(trim(clp.sehir)) = lower(trim(v_pos_sehir)))) THEN 10 ELSE 0 END)
            + (CASE WHEN v_pos_exp_min IS NOT NULL THEN CASE WHEN COALESCE(f.toplam_deneyim_ay, 0) / 12 BETWEEN v_pos_exp_min AND v_pos_exp_max THEN 8 WHEN COALESCE(f.toplam_deneyim_ay, 0) / 12 BETWEEN v_pos_exp_min - 1 AND v_pos_exp_max + 2 THEN 4 ELSE 0 END ELSE 0 END)
            + (CASE WHEN f.musaitlik = 'Hemen' THEN 8 WHEN f.musaitlik = '2 Hafta İçinde' THEN 6 WHEN f.musaitlik = '1 Ay İçinde' THEN 3 ELSE 0 END)
            + (CASE WHEN v_company_id IS NOT NULL AND EXISTS (SELECT 1 FROM candidate_experiences ce WHERE ce.candidate_id = f.id AND (ce.company_id = v_company_id OR ce.brand_id IN (SELECT brand_id FROM employer_brand_ids))) THEN 6 ELSE 0 END)
            + (CASE WHEN f.is_actively_looking THEN 6 ELSE 0 END)
            + (CASE WHEN f.updated_at >= now() - interval '30 days' THEN 5 WHEN f.updated_at >= now() - interval '90 days' THEN 2 ELSE 0 END)
            + LEAST(ROUND(f.profile_completion_pct * 0.04)::int, 4)
          ELSE
            (CASE WHEN f.is_actively_looking THEN 20 ELSE 0 END)
            + LEAST(ROUND(f.profile_completion_pct * 0.15)::int, 15)
            + (CASE WHEN f.updated_at >= now() - interval '30 days' THEN 20 WHEN f.updated_at >= now() - interval '90 days' THEN 10 ELSE 0 END)
            + LEAST(ROUND(COALESCE(f.toplam_deneyim_ay, 0)::numeric / 12)::int, 10)
            + (CASE WHEN array_length(f_pozisyon, 1) IS NOT NULL AND EXISTS (SELECT 1 FROM candidate_target_roles ctr WHERE ctr.candidate_id = f.id AND ctr.rol_unvani = ANY(f_pozisyon)) THEN 15 ELSE 0 END)
            + (CASE WHEN f.musaitlik = 'Hemen' THEN 10 WHEN f.musaitlik = '2 Hafta İçinde' THEN 7 WHEN f.musaitlik = '1 Ay İçinde' THEN 3 ELSE 0 END)
            + (CASE WHEN array_length(f_dil, 1) IS NOT NULL AND f.dil_array && f_dil THEN 10 ELSE 0 END)
        END
      ) AS match_score,
      ARRAY_REMOVE(ARRAY[
        CASE WHEN v_pos_title IS NOT NULL AND EXISTS (SELECT 1 FROM candidate_target_roles ctr WHERE ctr.candidate_id = f.id AND lower(trim(ctr.rol_unvani)) = lower(trim(v_pos_title))) THEN 'Hedef rol: tam eşleşme' END,
        CASE WHEN v_pos_title IS NOT NULL AND EXISTS (SELECT 1 FROM candidate_experiences ce WHERE ce.candidate_id = f.id AND lower(trim(ce.pozisyon)) = lower(trim(v_pos_title))) THEN 'Deneyim: aynı pozisyon' END,
        CASE WHEN v_pos_seg IS NOT NULL AND f.segment IS NOT NULL AND lower(trim(f.segment)) = lower(trim(v_pos_seg)) THEN 'Segment eşleşmesi' END,
        CASE WHEN v_pos_sehir IS NOT NULL AND ((f.adres_il IS NOT NULL AND lower(trim(f.adres_il)) = lower(trim(v_pos_sehir))) OR EXISTS (SELECT 1 FROM candidate_location_preferences clp WHERE clp.candidate_id = f.id AND lower(trim(clp.sehir)) = lower(trim(v_pos_sehir)))) THEN 'Şehir eşleşmesi' END,
        CASE WHEN v_pos_exp_min IS NOT NULL AND COALESCE(f.toplam_deneyim_ay, 0) / 12 BETWEEN v_pos_exp_min AND v_pos_exp_max THEN 'Deneyim: uygun aralık' END,
        CASE WHEN v_company_id IS NOT NULL AND EXISTS (SELECT 1 FROM candidate_experiences ce WHERE ce.candidate_id = f.id AND (ce.company_id = v_company_id OR ce.brand_id IN (SELECT brand_id FROM employer_brand_ids))) THEN 'Sektör deneyimi: tanıdık ekosistem' END,
        CASE WHEN f.is_actively_looking THEN 'Aktif iş arıyor' END,
        CASE WHEN f.profile_completion_pct >= 80 THEN 'Detaylı profil' END,
        CASE WHEN f.updated_at >= now() - interval '30 days' THEN 'Son 30 günde güncellendi' END,
        CASE WHEN COALESCE(f.toplam_deneyim_ay, 0) >= 60 THEN '5+ yıl deneyim' END,
        CASE WHEN v_pos_title IS NULL AND array_length(f_pozisyon, 1) IS NOT NULL AND EXISTS (SELECT 1 FROM candidate_target_roles ctr WHERE ctr.candidate_id = f.id AND ctr.rol_unvani = ANY(f_pozisyon)) THEN 'Hedef rol eşleşmesi' END,
        CASE WHEN f.musaitlik IN ('Hemen', '2 Hafta İçinde') THEN 'Kısa sürede başlayabilir' END,
        CASE WHEN array_length(f_dil, 1) IS NOT NULL AND f.dil_array && f_dil THEN 'Dil eşleşmesi' END
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
      p.id, p.full_name, p.adres_il,
      p.is_actively_looking, p.updated_at, p.son_pozisyon, p.son_sirket, p.son_marka,
      p.toplam_deneyim_ay, p.halen_calisiyor, p.profile_completion_pct,
      p.musaitlik, p.calisma_tipleri, p.maas_beklenti,
      p.travel_willingness, p.shift_flexibility, p.notice_period,
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
        (SELECT jsonb_agg(jsonb_build_object('egitim_seviye', ed.egitim_seviye, 'okul', ed.okul, 'bolum', ed.bolum, 'mezun_yil', ed.mezun_yil) ORDER BY ed.sira ASC)
         FROM candidate_education ed WHERE ed.candidate_id = p.id), '[]'::jsonb
      ) AS education,
      COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('dil', cl.dil, 'seviye', cl.seviye) ORDER BY cl.sira ASC)
         FROM candidate_languages cl WHERE cl.candidate_id = p.id), '[]'::jsonb
      ) AS diller_objects
    FROM page p
  )
  SELECT jsonb_build_object(
    'total', (SELECT cnt FROM total_count),
    'candidates', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'id', wc.id, 'full_name', wc.full_name, 'adres_il', wc.adres_il,
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

  -- Q7 audit log (page-level success path)
  INSERT INTO public.employer_pool_query_log (
    hr_profile_id, company_id, filters, position_id, result_total
  ) VALUES (
    v_user_id, v_company_id, p_filters, p_position_id,
    COALESCE((v_results ->> 'total')::int, 0)
  );

  RETURN v_results;
END;
$$;

-- ─────────────────────────────────────────────────────────────────
-- A2 + A5 fix: 5-param overload (aynı pattern, position_id yok)
-- ─────────────────────────────────────────────────────────────────
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
  v_caller_active boolean;
  v_caller_status account_status_enum;
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
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT hp.company_id, hp.is_active, hp.account_status
    INTO v_company_id, v_caller_active, v_caller_status
  FROM hr_profiles hp WHERE hp.id = v_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employer profile not found — candidates cannot call this RPC';
  END IF;

  IF v_caller_active = false OR v_caller_status <> 'active' THEN
    INSERT INTO public.employer_pool_query_log (
      hr_profile_id, company_id, filters, position_id, result_total
    ) VALUES (
      v_user_id, v_company_id,
      p_filters || jsonb_build_object('_rejected', 'lifecycle'),
      NULL, 0
    );
    RETURN jsonb_build_object('total', 0, 'candidates', '[]'::jsonb);
  END IF;

  IF NOT public.is_corporate_email() THEN
    INSERT INTO public.employer_pool_query_log (
      hr_profile_id, company_id, filters, position_id, result_total
    ) VALUES (
      v_user_id, v_company_id,
      p_filters || jsonb_build_object('_rejected', 'non_corporate_email'),
      NULL, 0
    );
    RETURN jsonb_build_object('total', 0, 'candidates', '[]'::jsonb);
  END IF;

  IF p_employer_company_id IS NOT NULL AND p_employer_company_id <> v_company_id THEN
    RAISE EXCEPTION 'Company ID mismatch — cannot search on behalf of another company';
  END IF;

  f_aktif_arayanlar := COALESCE((p_filters->>'aktifArayanlar')::boolean, false);
  f_sehir           := NULLIF(trim(p_filters->>'sehir'), '');
  f_exp_min         := COALESCE((p_filters->>'expMin')::int, 0);
  f_exp_max         := COALESCE((p_filters->>'expMax')::int, 99);
  f_search          := NULLIF(trim(p_filters->>'search'), '');
  IF f_search IS NOT NULL THEN
    v_search_escaped := replace(replace(replace(f_search, '\', '\\'), '%', '\%'), '_', '\_');
  END IF;
  SELECT COALESCE(array_agg(x), '{}') INTO f_pozisyon FROM jsonb_array_elements_text(COALESCE(p_filters->'pozisyon', '[]'::jsonb)) x;
  SELECT COALESCE(array_agg(x), '{}') INTO f_segment FROM jsonb_array_elements_text(COALESCE(p_filters->'segment', '[]'::jsonb)) x;
  SELECT COALESCE(array_agg(x), '{}') INTO f_musait FROM jsonb_array_elements_text(COALESCE(p_filters->'musait', '[]'::jsonb)) x;
  SELECT COALESCE(array_agg(x), '{}') INTO f_calisma FROM jsonb_array_elements_text(COALESCE(p_filters->'calisma', '[]'::jsonb)) x;
  SELECT COALESCE(array_agg(x), '{}') INTO f_egitim FROM jsonb_array_elements_text(COALESCE(p_filters->'egitim', '[]'::jsonb)) x;
  SELECT COALESCE(array_agg(x), '{}') INTO f_dil FROM jsonb_array_elements_text(COALESCE(p_filters->'dil', '[]'::jsonb)) x;

  WITH
  -- A2 fix: visible CTE'den telefon ve email tamamen çıkarıldı
  visible AS (
    SELECT c.id, c.full_name, c.adres_il,
           c.is_actively_looking, c.updated_at, c.son_pozisyon,
           c.son_sirket, c.son_marka, c.toplam_deneyim_ay,
           c.halen_calisiyor, c.hide_from_current_employer,
           COALESCE(c.profile_completion_pct, 0) AS profile_completion_pct
    FROM candidates c
    WHERE c.is_active = true
      AND (c.profile_completed = true OR COALESCE(c.profile_completion_pct, 0) >= 45)
      AND c.account_status = 'active'
  ),
  not_blocked AS (
    SELECT v.* FROM visible v
    WHERE NOT EXISTS (
      SELECT 1 FROM candidate_blocked_companies cbc
      WHERE cbc.candidate_id = v.id AND cbc.company_id = v_company_id
    ) OR v_company_id IS NULL
  ),
  employer_brand_ids AS (SELECT b.id AS brand_id FROM brands b WHERE b.company_id = v_company_id),
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
    SELECT nh.*, wp.musaitlik, wp.calisma_tipleri, wp.maas_beklenti,
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
            WHERE ed.candidate_id = ws.id ORDER BY ed.sira ASC LIMIT 1) AS egitim_seviye
    FROM with_segment ws
  ),
  with_langs AS (
    SELECT we.*,
           COALESCE((SELECT array_agg(cl.dil) FROM candidate_languages cl
                     WHERE cl.candidate_id = we.id AND cl.dil IS NOT NULL),
                    '{}') AS dil_array
    FROM with_edu we
  ),
  filtered AS (
    SELECT wl.* FROM with_langs wl
    WHERE
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
  ),
  scored AS (
    SELECT f.*,
      LEAST(100,
        (CASE WHEN f.is_actively_looking THEN 20 ELSE 0 END)
        + LEAST(ROUND(f.profile_completion_pct * 0.15)::int, 15)
        + (CASE WHEN f.updated_at >= now() - interval '30 days' THEN 20 WHEN f.updated_at >= now() - interval '90 days' THEN 10 ELSE 0 END)
        + LEAST(ROUND(COALESCE(f.toplam_deneyim_ay, 0)::numeric / 12)::int, 10)
        + (CASE WHEN array_length(f_pozisyon, 1) IS NOT NULL AND EXISTS (SELECT 1 FROM candidate_target_roles ctr WHERE ctr.candidate_id = f.id AND ctr.rol_unvani = ANY(f_pozisyon)) THEN 15 ELSE 0 END)
        + (CASE WHEN f.musaitlik = 'Hemen' THEN 10 WHEN f.musaitlik = '2 Hafta İçinde' THEN 7 WHEN f.musaitlik = '1 Ay İçinde' THEN 3 ELSE 0 END)
        + (CASE WHEN array_length(f_dil, 1) IS NOT NULL AND f.dil_array && f_dil THEN 10 ELSE 0 END)
      ) AS match_score,
      ARRAY_REMOVE(ARRAY[
        CASE WHEN f.is_actively_looking THEN 'Aktif iş arıyor' END,
        CASE WHEN f.profile_completion_pct >= 80 THEN 'Detaylı profil' END,
        CASE WHEN f.updated_at >= now() - interval '30 days' THEN 'Son 30 günde güncellendi' END,
        CASE WHEN COALESCE(f.toplam_deneyim_ay, 0) >= 60 THEN '5+ yıl deneyim' END,
        CASE WHEN array_length(f_pozisyon, 1) IS NOT NULL AND EXISTS (SELECT 1 FROM candidate_target_roles ctr WHERE ctr.candidate_id = f.id AND ctr.rol_unvani = ANY(f_pozisyon)) THEN 'Hedef rol eşleşmesi' END,
        CASE WHEN f.musaitlik IN ('Hemen', '2 Hafta İçinde') THEN 'Kısa sürede başlayabilir' END,
        CASE WHEN array_length(f_dil, 1) IS NOT NULL AND f.dil_array && f_dil THEN 'Dil eşleşmesi' END
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
      p.id, p.full_name, p.adres_il,
      p.is_actively_looking, p.updated_at, p.son_pozisyon, p.son_sirket, p.son_marka,
      p.toplam_deneyim_ay, p.halen_calisiyor, p.profile_completion_pct,
      p.musaitlik, p.calisma_tipleri, p.maas_beklenti,
      p.travel_willingness, p.shift_flexibility, p.notice_period,
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
        (SELECT jsonb_agg(jsonb_build_object('egitim_seviye', ed.egitim_seviye, 'okul', ed.okul, 'bolum', ed.bolum, 'mezun_yil', ed.mezun_yil) ORDER BY ed.sira ASC)
         FROM candidate_education ed WHERE ed.candidate_id = p.id), '[]'::jsonb
      ) AS education,
      COALESCE(
        (SELECT jsonb_agg(jsonb_build_object('dil', cl.dil, 'seviye', cl.seviye) ORDER BY cl.sira ASC)
         FROM candidate_languages cl WHERE cl.candidate_id = p.id), '[]'::jsonb
      ) AS diller_objects
    FROM page p
  )
  SELECT jsonb_build_object(
    'total', (SELECT cnt FROM total_count),
    'candidates', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'id', wc.id, 'full_name', wc.full_name, 'adres_il', wc.adres_il,
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

  -- Q7 audit log (5-param success path)
  INSERT INTO public.employer_pool_query_log (
    hr_profile_id, company_id, filters, position_id, result_total
  ) VALUES (
    v_user_id, v_company_id, p_filters, NULL,
    COALESCE((v_results ->> 'total')::int, 0)
  );

  RETURN v_results;
END;
$$;

COMMENT ON FUNCTION search_employer_candidates(jsonb, bigint, text, int, int, bigint) IS
  'A23 hotfix (2026-05-04 post-deploy): A2 PII strip CTE-level + A5 rejected access audit + Q7 success audit. 6-param canonical.';
COMMENT ON FUNCTION search_employer_candidates(jsonb, bigint, text, int, int) IS
  'A23 hotfix (2026-05-04 post-deploy): A2 + A5 + Q7. 5-param compat.';
