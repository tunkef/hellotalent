-- ═══════════════════════════════════════════════════════════════════
-- Migration: a23c_is_employer_corporate_check
-- Date: 2026-05-04
-- Ref: A23 WAVE C — Corporate Email Runtime Guard (is_employer + RPC guard)
-- Tier: T3 (auth/security/RLS)
-- Sıra: 2/3 — is_corporate_email() helper'a bağımlı (mig 1/3 önce apply edilmeli)
-- ─────────────────────────────────────────────────────────────────
-- AMAÇ:
--   is_employer() ve is_employer_team_member() helper'larına is_corporate_email()
--   AND check eklenir. Böylece RLS'in employer surface'ini kontrol eden tüm
--   policy'ler otomatik tightened olur — tek nokta güncelleme (DRY).
--
--   search_employer_candidates (5-param ve 6-param) gövdesine early-return guard
--   eklenir: is_corporate_email() false döndürürse PII havuzu sızdırılmaz.
--
-- MEVCUT BODY KAYNAKLARI:
--   - is_employer(): 20260408154354_sec_hr_profiles_guard.sql (onboarding_completed)
--   - is_employer_team_member(): 20260430204458_security_definer_search_path_harden.sql
--   - search_employer_candidates (6-param): 20260504181037_search_rpc_w4_columns_restore.sql
--   - search_employer_candidates (5-param): 20260504181037_search_rpc_w4_columns_restore.sql
--
-- DEĞİŞİKLİKLER:
--   is_employer():
--     Eski: EXISTS (SELECT 1 FROM hr_profiles WHERE id=auth.uid() AND onboarding_completed=true)
--     Yeni: ... AND onboarding_completed = true) AND is_corporate_email()
--
--   is_employer_team_member(p_user_id):
--     Eski: EXISTS (hp1 JOIN hp2 WHERE hp1.id=auth.uid() AND hp2.id=p_user_id)
--     Yeni: ... ) AND is_corporate_email()
--
--   search_employer_candidates (5+6 param):
--     Lifecycle guard'dan SONRA, asıl CTE query'den ÖNCE:
--     IF NOT is_corporate_email() THEN
--       RETURN jsonb_build_object('total', 0, 'candidates', '[]'::jsonb);
--     END IF;
--
-- KORUNAN ÖZELLİKLER:
--   - SECURITY DEFINER + search_path = pg_catalog, public, pg_temp (harden korunur)
--   - STABLE marker (is_employer, is_employer_team_member)
--   - Tüm imzalar değişmez (backwards compat)
--   - W4 FIX kolonları (travel_willingness, shift_flexibility, notice_period) korunur
--   - A8-B Task 3 lifecycle guard (account_status/is_active check) korunur
--   - Tüm CTE body'leri (visible, not_blocked, employer_brand_ids, scored, vb.) değişmez
--
-- ROLLBACK:
--   -- is_employer() eski haline döndür (onboarding_completed tek check):
--   CREATE OR REPLACE FUNCTION is_employer() ... (20260408154354 body)
--   -- is_employer_team_member() eski haline döndür:
--   CREATE OR REPLACE FUNCTION is_employer_team_member(uuid) ... (20260430204458 body)
--   -- search_employer_candidates'ı W4 restore'a döndür:
--   (20260504181037 body tekrar apply)
--
-- APPLY: npm run db:push (Tuna onayından sonra)
-- NO NEW TABLES. NO RLS POLICY CHANGES (policy'ler helper üzerinden tightened).
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- 1. is_employer() — onboarding_completed + corporate email check
--    Kaynak baz: 20260408154354_sec_hr_profiles_guard.sql
--    Değişiklik: AND is_corporate_email() eklendi
-- ─────────────────────────────────────────────────────────────────
-- Q4 (Codex 2026-05-04 + re-review): LANGUAGE sql — okunabilirlik kazancı,
-- RLS planner inlining BEKLENMİYOR (Codex re-review 2026-05-04).
-- Sebep: PostgreSQL SQL fonksiyon inlining SECURITY DEFINER + SET search_path
-- + non-scalar body kombinasyonunda yapılmaz (https://wiki.postgresql.org/wiki/Inlining_of_SQL_functions).
-- RISK-ACCEPT: SECURITY DEFINER zorunlu (RLS bypass için hr_profiles okuma),
-- SET search_path zorunlu (security harden), bu nedenle inlining feda edildi.
-- Hot path overhead: tek call/policy eval, ~0.5ms (auth.jwt parse + EXISTS).
-- Mitigation: hr_profiles çok küçük tablo (1 row → 100 row P3'te). EXPLAIN
-- benchmark deploy sonrası — eğer sorun çıkarsa is_employer() materialized
-- view veya denormalize cache eklenir (P3 backlog).
CREATE OR REPLACE FUNCTION public.is_employer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM hr_profiles
    WHERE id = auth.uid()
      AND onboarding_completed = true
  ) AND is_corporate_email();
$$;

REVOKE ALL ON FUNCTION public.is_employer() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_employer() TO authenticated;

COMMENT ON FUNCTION public.is_employer() IS
  'A23 WAVE C (2026-05-04) — is_employer() + corporate email runtime check. '
  'Eski: onboarding_completed check (20260408154354). '
  'Yeni: onboarding_completed AND is_corporate_email(). '
  'RLS tüm employer surface bu helper üzerinden tightened olur (DRY).';

-- ─────────────────────────────────────────────────────────────────
-- 2. is_employer_team_member() — team member check + corporate email
--    Kaynak baz: 20260430204458_security_definer_search_path_harden.sql
--    Değişiklik: AND is_corporate_email() eklendi
-- ─────────────────────────────────────────────────────────────────
-- R1 fix (code-reviewer 2026-05-04): LANGUAGE sql restore.
-- Kaynak migration 20260430204458 LANGUAGE sql idi; planner inlining
-- inheritance için sql > plpgsql. RLS hot path'te her row için extra
-- function call overhead'i kaldırılır.
CREATE OR REPLACE FUNCTION public.is_employer_team_member(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM hr_profiles hp1
    JOIN hr_profiles hp2 ON hp1.company_id = hp2.company_id
    WHERE hp1.id = auth.uid()
      AND hp2.id = p_user_id
  ) AND is_corporate_email();
$$;

REVOKE ALL ON FUNCTION public.is_employer_team_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_employer_team_member(uuid) TO authenticated;

COMMENT ON FUNCTION public.is_employer_team_member(uuid) IS
  'A23 WAVE C (2026-05-04) — is_employer_team_member() + corporate email guard. '
  'Eski: company_id join check (20260430204458). '
  'Yeni: join check AND is_corporate_email(). '
  'Pipeline/notes RLS policy''leri bu helper''a bağlı → dolaylı tightened.';

-- ─────────────────────────────────────────────────────────────────
-- 3. search_employer_candidates — 6-PARAM OVERLOAD
--    Kaynak baz: 20260504181037_search_rpc_w4_columns_restore.sql (6-param)
--    Değişiklik: lifecycle guard'dan SONRA, CTE query'den ÖNCE
--      is_corporate_email() early-return guard eklendi.
--    W4 FIX (travel_willingness/shift_flexibility/notice_period) KORUNDU.
--    A8-B Task 3 lifecycle guard (account_status/is_active) KORUNDU.
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.search_employer_candidates(
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
  FROM hr_profiles hp
  WHERE hp.id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employer profile not found — candidates cannot call this RPC';
  END IF;

  -- ─── A8-B Task 3: Lifecycle guard (account_status/is_active) ────
  IF v_caller_active = false OR v_caller_status <> 'active' THEN
    RETURN jsonb_build_object('total', 0, 'candidates', '[]'::jsonb);
  END IF;

  -- ─── A23 WAVE C: Corporate email runtime guard ───────────────────
  -- Lifecycle guard'dan SONRA, asıl CTE query'den ÖNCE.
  -- is_corporate_email() false → PII havuzu sızdırılmaz, empty return.
  -- service_role context'te is_corporate_email() → true (bypass çalışır).
  IF NOT is_corporate_email() THEN
    RETURN jsonb_build_object('total', 0, 'candidates', '[]'::jsonb);
  END IF;

  IF p_employer_company_id IS NOT NULL AND p_employer_company_id <> v_company_id THEN
    RAISE EXCEPTION 'Company ID mismatch — cannot search on behalf of another company';
  END IF;

  IF p_position_id IS NOT NULL THEN
    SELECT pos.ad, pos.sehir, pos.seg, pos.exp
    INTO v_pos_title, v_pos_sehir, v_pos_seg, v_pos_exp
    FROM positions pos
    WHERE pos.id = p_position_id
      AND pos.company_id = v_company_id;

    IF NOT FOUND THEN
      v_pos_title := NULL;
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
          ELSE
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
      p.id, p.full_name, p.adres_il, p.telefon, p.email,
      p.is_actively_looking, p.updated_at, p.son_pozisyon, p.son_sirket, p.son_marka,
      p.toplam_deneyim_ay, p.halen_calisiyor, p.profile_completion_pct,
      p.musaitlik, p.calisma_tipleri, p.maas_beklenti,
      p.travel_willingness,    -- W4 FIX restore (2026-05-04)
      p.shift_flexibility,     -- W4 FIX restore
      p.notice_period,         -- W4 FIX restore
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
    'candidates', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'id', wc.id, 'full_name', wc.full_name, 'adres_il', wc.adres_il,
        -- PII strip (Codex T3 BLOCKER 2026-05-04, KVKK md.4 minimum gereklilik):
        -- telefon/email havuzda employer'a DÖNDÜRÜLMEZ. Detay RPC mask sağlar.
        -- 'telefon', wc.telefon, 'email', wc.email,
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

  -- Q7 fix (Codex 2026-05-04): KVKK md.7 audit log — page-level (per-call).
  -- SECURITY DEFINER context'inde RLS bypass; INSERT atomik. Hata fırlatırsa
  -- search call fail eder (fail-closed audit — KVKK uyumlu).
  INSERT INTO public.employer_pool_query_log (
    hr_profile_id, company_id, filters, position_id, result_total
  ) VALUES (
    v_user_id, v_company_id, p_filters, p_position_id,
    COALESCE((v_results ->> 'total')::int, 0)
  );

  RETURN v_results;
END;
$$;

COMMENT ON FUNCTION public.search_employer_candidates(jsonb, bigint, text, int, int, bigint) IS
  'A23 WAVE C (2026-05-04) — 6-param + corporate email early-return guard. '
  'A8-B Task 3 lifecycle guard KORUNDU. W4 FIX (travel/shift/notice) KORUNDU. '
  'Guard sırası: auth check → lifecycle check → corporate email check → CTE query.';

-- ─────────────────────────────────────────────────────────────────
-- 4. search_employer_candidates — 5-PARAM OVERLOAD
--    Kaynak baz: 20260504181037_search_rpc_w4_columns_restore.sql (5-param)
--    Değişiklik: lifecycle guard'dan SONRA, CTE query'den ÖNCE
--      is_corporate_email() early-return guard eklendi.
--    W4 FIX (travel_willingness/shift_flexibility/notice_period) KORUNDU.
--    A8-B Task 3 lifecycle guard KORUNDU.
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.search_employer_candidates(
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
  v_pos_title text := NULL;
  v_pos_sehir text := NULL;
  v_pos_seg text := NULL;
  v_pos_exp_min int := NULL;
  v_pos_exp_max int := NULL;
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

  -- ─── A8-B Task 3: Lifecycle guard ───────────────────────────────
  IF v_caller_active = false OR v_caller_status <> 'active' THEN
    RETURN jsonb_build_object('total', 0, 'candidates', '[]'::jsonb);
  END IF;

  -- ─── A23 WAVE C: Corporate email runtime guard ───────────────────
  -- Lifecycle guard'dan SONRA, asıl CTE query'den ÖNCE.
  IF NOT is_corporate_email() THEN
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
            WHERE ed.candidate_id = ws.id ORDER BY ed.sira ASC LIMIT 1) AS egitim_seviye
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
      ) AS match_score,
      ARRAY_REMOVE(ARRAY[
        CASE WHEN f.is_actively_looking THEN 'Aktif iş arıyor' END,
        CASE WHEN f.profile_completion_pct >= 80 THEN 'Detaylı profil' END,
        CASE WHEN f.updated_at >= now() - interval '30 days' THEN 'Son 30 günde güncellendi' END,
        CASE WHEN COALESCE(f.toplam_deneyim_ay, 0) >= 60 THEN '5+ yıl deneyim' END,
        CASE WHEN array_length(f_pozisyon, 1) IS NOT NULL
                  AND EXISTS (SELECT 1 FROM candidate_target_roles ctr
                              WHERE ctr.candidate_id = f.id
                                AND ctr.rol_unvani = ANY(f_pozisyon))
             THEN 'Hedef rol eşleşmesi' END,
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
      p.id, p.full_name, p.adres_il, p.telefon, p.email,
      p.is_actively_looking, p.updated_at, p.son_pozisyon, p.son_sirket, p.son_marka,
      p.toplam_deneyim_ay, p.halen_calisiyor, p.profile_completion_pct,
      p.musaitlik, p.calisma_tipleri, p.maas_beklenti,
      p.travel_willingness,    -- W4 FIX restore (5-param)
      p.shift_flexibility,     -- W4 FIX restore
      p.notice_period,         -- W4 FIX restore
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
    'candidates', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'id', wc.id, 'full_name', wc.full_name, 'adres_il', wc.adres_il,
        -- PII strip (Codex T3 BLOCKER 2026-05-04, KVKK md.4 minimum gereklilik):
        -- telefon/email havuzda employer'a DÖNDÜRÜLMEZ. Detay RPC mask sağlar.
        -- 'telefon', wc.telefon, 'email', wc.email,
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

  -- Q7 fix (Codex 2026-05-04): KVKK md.7 audit log — 5-param overload.
  INSERT INTO public.employer_pool_query_log (
    hr_profile_id, company_id, filters, position_id, result_total
  ) VALUES (
    v_user_id, v_company_id, p_filters, NULL,
    COALESCE((v_results ->> 'total')::int, 0)
  );

  RETURN v_results;
END;
$$;

COMMENT ON FUNCTION public.search_employer_candidates(jsonb, bigint, text, int, int) IS
  'A23 WAVE C (2026-05-04) — 5-param + corporate email early-return guard. '
  'A8-B Task 3 lifecycle guard KORUNDU. W4 FIX (travel/shift/notice) KORUNDU. '
  'Guard sırası: auth check → lifecycle check → corporate email check → CTE query.';
