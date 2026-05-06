-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  PR-7 — Pozisyon Yaşam Döngüsü Backend RPC'leri                    ║
-- ║  Tarih: 2026-05-07                                                  ║
-- ║  Tier: T2 (RPC ekleme — tablo/RLS değişikliği yok)                 ║
-- ║  Codex: ZORUNLU (SECURITY DEFINER + pipeline cascade)              ║
-- ║                                                                      ║
-- ║  KAPSAM:                                                             ║
-- ║   1. update_position(p_position_id, p_payload jsonb)               ║
-- ║      — Recruiter pozisyon kriter/başlık günceller.                  ║
-- ║      — criteria_changed flag: match-affecting alan değişti mi?      ║
-- ║   2. hr_close_position(p_position_id)                               ║
-- ║      — Pozisyon kapat + tüm pipeline_state → archive cascade.       ║
-- ║   3. hr_reopen_position(p_position_id)                              ║
-- ║      — Kapalı pozisyon yeniden aç + hr_auto_match_position retrigger║
-- ║   4. positions.durum CHECK constraint — SKIP                        ║
-- ║      Mevcut: 'active'|'draft'|'closed'|'archived'                  ║
-- ║      (20260430162936 SCHEMA VERİFY notu satır 59 teyit etti)        ║
-- ║                                                                      ║
-- ║  GÜVENLIK (tüm RPC'ler):                                            ║
-- ║   - auth.uid() not null check                                       ║
-- ║   - hr_profiles company_id + employer_role verify                   ║
-- ║   - positions.company_id = caller company_id (cross-tenant guard)   ║
-- ║   - employer_role IN ('admin', 'recruiter') zorunlu                 ║
-- ║   - SECURITY DEFINER + search_path pg_catalog, public, pg_temp (A14)║
-- ║   - REVOKE ALL FROM PUBLIC + GRANT EXECUTE TO authenticated         ║
-- ║   - auth.users direkt SELECT YASAK — auth.uid() yeterli            ║
-- ║                                                                      ║
-- ║  AUDIT LOG:                                                          ║
-- ║   positions tablosu için dedicated audit log YOK (sadece hr_profiles ║
-- ║   ve kvkk_md11_access_log mevcut). close/reopen operasyonları      ║
-- ║   positions.durum + updated_at üzerinden izlenir (P3: audit table).  ║
-- ║                                                                      ║
-- ║  ROLLBACK:                                                           ║
-- ║   DROP FUNCTION IF EXISTS public.update_position(bigint, jsonb);    ║
-- ║   DROP FUNCTION IF EXISTS public.hr_close_position(bigint);         ║
-- ║   DROP FUNCTION IF EXISTS public.hr_reopen_position(bigint);        ║
-- ║   (Tablo/RLS değişikliği yok — fonksiyon drop yeterli)              ║
-- ╚══════════════════════════════════════════════════════════════════════╝

SET search_path = public, pg_catalog;

-- ═══════════════════════════════════════════════════════════════════════
-- 1. update_position(p_position_id bigint, p_payload jsonb)
--
--    Güncellenebilir alanlar (p_payload key'leri):
--      ad, sehir, seg, exp, aciklama          ← kriter/meta
--      calisma_tipi[], musaitlik_pozisyon      ← match-affecting
--      egitim_seviye, diller[], tercih_segmentler[]
--    maas kasıtlı hariç (PR-2 kalıcı kaldırma, CLAUDE.md)
--
--    criteria_changed flag (frontend soft refresh için):
--      true  → sehir/seg/exp/calisma_tipi/musaitlik_pozisyon/
--               egitim_seviye/diller/tercih_segmentler değişti
--      false → sadece ad/aciklama değişti
--
--    Validation:
--      - positions_min_one_criteria CHECK DB-side enforce eder (PR-2)
--      - musaitlik_pozisyon CHECK DB-side enforce eder (PR-1/M2)
--      - egitim_seviye: serbest text (DB-side CHECK yok, PR-1 yok)
--      - Bilinmeyen payload key'leri sessizce yok sayılır (güvenli)
--
--    Return: jsonb {id, criteria_changed}
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.update_position(
  p_position_id bigint,
  p_payload     jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_user_id          uuid;
  v_company_id       bigint;
  v_role             text;
  v_pos_company_id   bigint;
  v_pos_durum        text;
  v_updated_id       bigint;

  -- Mevcut değerler — criteria_changed hesabı için
  v_old_sehir        text;
  v_old_seg          text;
  v_old_exp          text;
  v_old_calisma_tipi text[];
  v_old_musaitlik    text;
  v_old_egitim       text;
  v_old_diller       text[];
  v_old_tercih_seg   text[];

  -- Yeni değerler (payload'dan)
  v_new_sehir        text;
  v_new_seg          text;
  v_new_exp          text;
  v_new_calisma_tipi text[];
  v_new_musaitlik    text;
  v_new_egitim       text;
  v_new_diller       text[];
  v_new_tercih_seg   text[];

  v_criteria_changed boolean := false;
BEGIN
  -- ─── 1. Auth verify ───────────────────────────────────────────────
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'P0001';
  END IF;

  -- ─── 2. Employer profile + role verify ────────────────────────────
  SELECT hp.company_id, hp.employer_role
    INTO v_company_id, v_role
  FROM public.hr_profiles hp
  WHERE hp.id = v_user_id;

  IF NOT FOUND OR v_company_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized: employer profile not found' USING ERRCODE = 'P0001';
  END IF;

  IF v_role NOT IN ('admin', 'recruiter') THEN
    RAISE EXCEPTION 'forbidden: admin veya recruiter rolü gerekli' USING ERRCODE = 'P0001';
  END IF;

  -- ─── 3. Pozisyon ownership + durum verify ─────────────────────────
  SELECT pos.company_id, pos.durum,
         pos.sehir, pos.seg, pos.exp,
         pos.calisma_tipi, pos.musaitlik_pozisyon, pos.egitim_seviye,
         pos.diller, pos.tercih_segmentler
    INTO v_pos_company_id, v_pos_durum,
         v_old_sehir, v_old_seg, v_old_exp,
         v_old_calisma_tipi, v_old_musaitlik, v_old_egitim,
         v_old_diller, v_old_tercih_seg
  FROM public.positions pos
  WHERE pos.id = p_position_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found: pozisyon % bulunamadı', p_position_id USING ERRCODE = 'P0002';
  END IF;

  IF v_pos_company_id != v_company_id THEN
    RAISE EXCEPTION 'forbidden: pozisyon bu şirkete ait değil' USING ERRCODE = 'P0003';
  END IF;

  -- Kapalı/arşivli pozisyon güncellenemez
  IF v_pos_durum IN ('closed', 'archived') THEN
    RAISE EXCEPTION 'forbidden: kapalı veya arşivli pozisyon güncellenemez' USING ERRCODE = 'P0005';
  END IF;

  -- ─── 4. Payload'dan yeni değerleri çek (COALESCE → mevcut değer koru)
  v_new_sehir        := COALESCE(p_payload->>'sehir',             v_old_sehir);
  v_new_seg          := COALESCE(p_payload->>'seg',               v_old_seg);
  v_new_exp          := COALESCE(p_payload->>'exp',               v_old_exp);
  v_new_musaitlik    := COALESCE(p_payload->>'musaitlik_pozisyon', v_old_musaitlik);
  v_new_egitim       := COALESCE(p_payload->>'egitim_seviye',     v_old_egitim);

  -- Array alanlar: jsonb array → text[] cast
  IF p_payload ? 'calisma_tipi' AND p_payload->'calisma_tipi' != 'null'::jsonb THEN
    SELECT array_agg(elem::text)
      INTO v_new_calisma_tipi
    FROM jsonb_array_elements_text(p_payload->'calisma_tipi') AS elem;
  ELSE
    v_new_calisma_tipi := v_old_calisma_tipi;
  END IF;

  IF p_payload ? 'diller' AND p_payload->'diller' != 'null'::jsonb THEN
    SELECT array_agg(elem::text)
      INTO v_new_diller
    FROM jsonb_array_elements_text(p_payload->'diller') AS elem;
  ELSE
    v_new_diller := v_old_diller;
  END IF;

  IF p_payload ? 'tercih_segmentler' AND p_payload->'tercih_segmentler' != 'null'::jsonb THEN
    SELECT array_agg(elem::text)
      INTO v_new_tercih_seg
    FROM jsonb_array_elements_text(p_payload->'tercih_segmentler') AS elem;
  ELSE
    v_new_tercih_seg := v_old_tercih_seg;
  END IF;

  -- ─── 5. criteria_changed flag hesabı ──────────────────────────────
  --    Match-affecting alanlardan herhangi biri değiştiyse true.
  --    IS DISTINCT FROM: NULL karşılaştırmayı doğru handle eder.
  IF (v_new_sehir        IS DISTINCT FROM v_old_sehir)
  OR (v_new_seg          IS DISTINCT FROM v_old_seg)
  OR (v_new_exp          IS DISTINCT FROM v_old_exp)
  OR (v_new_calisma_tipi IS DISTINCT FROM v_old_calisma_tipi)
  OR (v_new_musaitlik    IS DISTINCT FROM v_old_musaitlik)
  OR (v_new_egitim       IS DISTINCT FROM v_old_egitim)
  OR (v_new_diller       IS DISTINCT FROM v_old_diller)
  OR (v_new_tercih_seg   IS DISTINCT FROM v_old_tercih_seg)
  THEN
    v_criteria_changed := true;
  END IF;

  -- ─── 6. UPDATE — sadece payload'da gelen alanlar güncellenir ──────
  --    COALESCE pattern: payload key yoksa mevcut DB değeri korunur.
  --    CHECK constraint'ler (positions_min_one_criteria, musaitlik_check)
  --    DB tarafından enforce edilir — burada tekrar validate edilmez.
  UPDATE public.positions
  SET
    ad                 = COALESCE(p_payload->>'ad',               ad),
    sehir              = v_new_sehir,
    seg                = v_new_seg,
    exp                = v_new_exp,
    aciklama           = COALESCE(p_payload->>'aciklama',         aciklama),
    calisma_tipi       = v_new_calisma_tipi,
    musaitlik_pozisyon = v_new_musaitlik,
    egitim_seviye      = v_new_egitim,
    diller             = v_new_diller,
    tercih_segmentler  = v_new_tercih_seg,
    updated_at         = now()
  WHERE id = p_position_id
    AND company_id = v_company_id   -- double guard (RLS + explicit)
  RETURNING id INTO v_updated_id;

  IF v_updated_id IS NULL THEN
    RAISE EXCEPTION 'not_found: güncelleme başarısız (pozisyon bulunamadı veya şirket uyuşmazlığı)' USING ERRCODE = 'P0002';
  END IF;

  RETURN jsonb_build_object(
    'id',               v_updated_id,
    'criteria_changed', v_criteria_changed
  );
END;
$$;

-- REVOKE → GRANT pattern (defense in depth, A14)
REVOKE ALL ON FUNCTION public.update_position(bigint, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_position(bigint, jsonb) TO authenticated;

COMMENT ON FUNCTION public.update_position(bigint, jsonb) IS
  'PR-7 (2026-05-07): Pozisyon güncelleme RPC. '
  'Güncellenebilir: ad, sehir, seg, exp, aciklama, calisma_tipi, musaitlik_pozisyon, egitim_seviye, diller, tercih_segmentler. '
  'maas kasıtlı hariç (PR-2 kalıcı kaldırma). '
  'criteria_changed=true → match-affecting alan değişti, frontend soft refresh tetikler. '
  'employer_role IN (admin, recruiter) zorunlu. cross-tenant guard: company_id eşleşme. '
  'SECURITY DEFINER + A14 search_path. Return: {id, criteria_changed}.';


-- ═══════════════════════════════════════════════════════════════════════
-- 2. hr_close_position(p_position_id bigint)
--
--    Lifecycle:
--      1. positions.durum → 'closed', closed_at = now()
--      2. Cascade: tüm pipeline_state stage_v2 → 'archive'
--         (kisa_liste + iletisime_gecildi dahil — pozisyon tamamen kapandı)
--         legacy stage → 'kapandi_win' (M3 öncesi sync)
--
--    FARK hr_refresh_position_pipeline'dan:
--      - refresh sadece uzun_liste'yi etkiler, close TÜMÜNÜ etkiler
--      - refresh durum 'active' bırakır, close 'closed' yapar
--
--    Return: jsonb {id, archived_count}
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.hr_close_position(
  p_position_id bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_user_id          uuid;
  v_company_id       bigint;
  v_role             text;
  v_pos_company_id   bigint;
  v_pos_durum        text;
  v_closed_id        bigint;
  v_archived_count   int;
BEGIN
  -- ─── 1. Auth verify ───────────────────────────────────────────────
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'P0001';
  END IF;

  -- ─── 2. Employer profile + role verify ────────────────────────────
  SELECT hp.company_id, hp.employer_role
    INTO v_company_id, v_role
  FROM public.hr_profiles hp
  WHERE hp.id = v_user_id;

  IF NOT FOUND OR v_company_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized: employer profile not found' USING ERRCODE = 'P0001';
  END IF;

  IF v_role NOT IN ('admin', 'recruiter') THEN
    RAISE EXCEPTION 'forbidden: admin veya recruiter rolü gerekli' USING ERRCODE = 'P0001';
  END IF;

  -- ─── 3. Pozisyon ownership + durum verify ─────────────────────────
  SELECT pos.company_id, pos.durum
    INTO v_pos_company_id, v_pos_durum
  FROM public.positions pos
  WHERE pos.id = p_position_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found: pozisyon % bulunamadı', p_position_id USING ERRCODE = 'P0002';
  END IF;

  IF v_pos_company_id != v_company_id THEN
    RAISE EXCEPTION 'forbidden: pozisyon bu şirkete ait değil' USING ERRCODE = 'P0003';
  END IF;

  -- Zaten kapalı/arşivli → idempotent no-op
  IF v_pos_durum IN ('closed', 'archived') THEN
    -- Mevcut archive count ile döndür (idempotent)
    SELECT count(*) INTO v_archived_count
    FROM public.candidate_pipeline_state
    WHERE position_id = p_position_id
      AND stage_v2 = 'archive'::pipeline_stage_v2;

    RETURN jsonb_build_object(
      'id',             p_position_id,
      'archived_count', v_archived_count,
      'note',           'already_closed'
    );
  END IF;

  -- ─── 4. Pozisyon kapat ─────────────────────────────────────────────
  UPDATE public.positions
  SET
    durum      = 'closed',
    closed_at  = now(),
    updated_at = now()
  WHERE id         = p_position_id
    AND company_id = v_company_id
  RETURNING id INTO v_closed_id;

  IF v_closed_id IS NULL THEN
    RAISE EXCEPTION 'not_found: pozisyon kapatma başarısız' USING ERRCODE = 'P0002';
  END IF;

  -- ─── 5. Pipeline cascade → archive ────────────────────────────────
  --    Tüm stage_v2 değerleri archive'e taşınır (uzun_liste + kisa_liste + iletisime_gecildi)
  --    Pozisyon kapandığında tüm pipeline sonlanır.
  --    legacy stage → 'kapandi_win' (M3 öncesi sync, ADR uyumu)
  UPDATE public.candidate_pipeline_state
  SET
    stage_v2   = 'archive'::pipeline_stage_v2,
    stage      = 'kapandi_win'::pipeline_stage,
    updated_at = now()
  WHERE position_id = p_position_id
    AND stage_v2 != 'archive'::pipeline_stage_v2;  -- idempotent: zaten archive olanları atla

  GET DIAGNOSTICS v_archived_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'id',             v_closed_id,
    'archived_count', v_archived_count
  );
END;
$$;

-- REVOKE → GRANT pattern (defense in depth, A14)
REVOKE ALL ON FUNCTION public.hr_close_position(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hr_close_position(bigint) TO authenticated;

COMMENT ON FUNCTION public.hr_close_position(bigint) IS
  'PR-7 (2026-05-07): Pozisyon kapatma RPC. '
  'positions.durum → closed, closed_at = now(). '
  'Cascade: tüm candidate_pipeline_state stage_v2 → archive (tüm stage''ler dahil). '
  'Idempotent: zaten closed/archived ise no-op, mevcut archive count döner. '
  'employer_role IN (admin, recruiter) zorunlu. SECURITY DEFINER + A14 search_path. '
  'Return: {id, archived_count}.';


-- ═══════════════════════════════════════════════════════════════════════
-- 3. hr_reopen_position(p_position_id bigint)
--
--    Lifecycle:
--      1. Pre-check: durum = 'closed' veya 'archived' ise reopen
--                   durum = 'active' ise no-op (idempotent)
--      2. positions.durum → 'active', closed_at = NULL, updated_at = now()
--      3. Auto-match retrigger: hr_auto_match_position(p_position_id)
--         → yeni eşleşmeler uzun_liste'ye eklenir
--         → archive'deki eski adaylar (J2 DO UPDATE fix) geri döner
--
--    NOT: closed_at NULL set etmek idempotent reopen anlamına gelir.
--    Pozisyon tekrar kapanınca closed_at yeniden yazılır.
--
--    Return: jsonb {id, auto_match_result}
--    auto_match_result = hr_auto_match_position çıktısı:
--      {added, skipped, total_matched, threshold}
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.hr_reopen_position(
  p_position_id bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_user_id          uuid;
  v_company_id       bigint;
  v_role             text;
  v_pos_company_id   bigint;
  v_pos_durum        text;
  v_reopened_id      bigint;
  v_auto_match_result jsonb;
BEGIN
  -- ─── 1. Auth verify ───────────────────────────────────────────────
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'P0001';
  END IF;

  -- ─── 2. Employer profile + role verify ────────────────────────────
  SELECT hp.company_id, hp.employer_role
    INTO v_company_id, v_role
  FROM public.hr_profiles hp
  WHERE hp.id = v_user_id;

  IF NOT FOUND OR v_company_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized: employer profile not found' USING ERRCODE = 'P0001';
  END IF;

  IF v_role NOT IN ('admin', 'recruiter') THEN
    RAISE EXCEPTION 'forbidden: admin veya recruiter rolü gerekli' USING ERRCODE = 'P0001';
  END IF;

  -- ─── 3. Pozisyon ownership + durum verify ─────────────────────────
  SELECT pos.company_id, pos.durum
    INTO v_pos_company_id, v_pos_durum
  FROM public.positions pos
  WHERE pos.id = p_position_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found: pozisyon % bulunamadı', p_position_id USING ERRCODE = 'P0002';
  END IF;

  IF v_pos_company_id != v_company_id THEN
    RAISE EXCEPTION 'forbidden: pozisyon bu şirkete ait değil' USING ERRCODE = 'P0003';
  END IF;

  -- ─── 4. Zaten aktif → idempotent no-op ────────────────────────────
  IF v_pos_durum = 'active' THEN
    RETURN jsonb_build_object(
      'id',                p_position_id,
      'auto_match_result', '{}'::jsonb,
      'note',              'already_active'
    );
  END IF;

  -- Draft pozisyonlar reopen'dan geçmez — önce kriter eklenmeli
  IF v_pos_durum = 'draft' THEN
    RAISE EXCEPTION 'forbidden: draft pozisyon reopen edilemez (önce aktifleştir)' USING ERRCODE = 'P0004';
  END IF;

  -- closed veya archived → reopen
  -- ─── 5. Pozisyon yeniden aç ───────────────────────────────────────
  UPDATE public.positions
  SET
    durum      = 'active',
    closed_at  = NULL,   -- reopen: closed_at sıfırla
    updated_at = now()
  WHERE id         = p_position_id
    AND company_id = v_company_id
  RETURNING id INTO v_reopened_id;

  IF v_reopened_id IS NULL THEN
    RAISE EXCEPTION 'not_found: reopen başarısız' USING ERRCODE = 'P0002';
  END IF;

  -- ─── 6. Auto-match retrigger ──────────────────────────────────────
  --    hr_auto_match_position: SECURITY DEFINER, aynı authenticated context.
  --    J2 fix: archive'deki adaylar DO UPDATE WHERE stage_v2='archive' ile
  --    uzun_liste'ye geri döner. Yeni eşleşenler eklenir, skipped = idempotent.
  --    NOT: hr_auto_match_position durum='active' check yapar — yukarıda
  --    UPDATE sonrası durum artık 'active', guard geçer.
  SELECT public.hr_auto_match_position(p_position_id)
    INTO v_auto_match_result;

  RETURN jsonb_build_object(
    'id',                v_reopened_id,
    'auto_match_result', v_auto_match_result
  );
END;
$$;

-- REVOKE → GRANT pattern (defense in depth, A14)
REVOKE ALL ON FUNCTION public.hr_reopen_position(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hr_reopen_position(bigint) TO authenticated;

COMMENT ON FUNCTION public.hr_reopen_position(bigint) IS
  'PR-7 (2026-05-07): Pozisyon yeniden açma RPC. '
  'positions.durum → active, closed_at = NULL. '
  'Auto-match retrigger: hr_auto_match_position (archive recovery + yeni eşleşmeler). '
  'Idempotent: zaten active ise no-op, auto_match_result boş döner. '
  'draft pozisyonlar reddedilir (önce aktifleştirme gerekir). '
  'employer_role IN (admin, recruiter) zorunlu. SECURITY DEFINER + A14 search_path. '
  'Return: {id, auto_match_result}.';


-- ═══════════════════════════════════════════════════════════════════════
-- 4. positions.durum CHECK constraint — SKIP
--    Mevcut durum: 20260430162936 satır 59 schema verify notu:
--      "positions.durum → text NOT NULL, CHECK: 'active'|'draft'|'closed'|'archived'"
--    Constraint zaten production'da mevcut. Bu migration dokunmaz.
--    Yeni değer gerekmez — 'archived' zaten listede.
-- ═══════════════════════════════════════════════════════════════════════
-- (NO-OP — constraint mevcut)


-- ═══════════════════════════════════════════════════════════════════════
-- DRY RUN VERIFY BLOCK
-- ═══════════════════════════════════════════════════════════════════════

-- VERIFY 1: 3 RPC var
-- SELECT proname FROM pg_proc
--   JOIN pg_namespace n ON n.oid = pg_proc.pronamespace
--   WHERE n.nspname = 'public'
--     AND proname IN ('update_position', 'hr_close_position', 'hr_reopen_position');
-- Beklenen: 3 satır

-- VERIFY 2: update_position kriter değişim flag — sehir değiştiyse criteria_changed=true
-- SELECT update_position(
--   VALID_POS_ID,
--   '{"sehir":"Ankara"}'::jsonb
-- );
-- Beklenen: {"id": VALID_POS_ID, "criteria_changed": true}

-- VERIFY 3: update_position sadece ad değişti — criteria_changed=false
-- SELECT update_position(
--   VALID_POS_ID,
--   '{"ad":"Yeni Pozisyon Başlığı"}'::jsonb
-- );
-- Beklenen: {"id": VALID_POS_ID, "criteria_changed": false}

-- VERIFY 4: hr_close_position cascade
-- SELECT hr_close_position(VALID_POS_ID);
-- Beklenen: {"id": VALID_POS_ID, "archived_count": N}
-- Sonra kontrol:
-- SELECT count(*) FROM candidate_pipeline_state
--   WHERE position_id = VALID_POS_ID AND stage_v2 != 'archive';
-- Beklenen: 0 (tüm stage'ler archive'e geçti)
-- SELECT durum, closed_at FROM positions WHERE id = VALID_POS_ID;
-- Beklenen: durum='closed', closed_at IS NOT NULL

-- VERIFY 5: hr_reopen_position auto-match retrigger
-- SELECT hr_reopen_position(CLOSED_POS_ID);
-- Beklenen: {"id": CLOSED_POS_ID, "auto_match_result": {"added": N, "skipped": M, ...}}
-- Sonra kontrol:
-- SELECT count(*) FROM candidate_pipeline_state
--   WHERE position_id = CLOSED_POS_ID AND stage_v2 = 'uzun_liste';
-- Beklenen: auto_match added sayısı kadar uzun_liste satırı
-- SELECT durum, closed_at FROM positions WHERE id = CLOSED_POS_ID;
-- Beklenen: durum='active', closed_at IS NULL

-- VERIFY 6: Idempotent testler
-- -- hr_close_position tekrar çağrı (zaten closed):
-- SELECT hr_close_position(CLOSED_POS_ID);
-- Beklenen: {"id": ID, "archived_count": N, "note": "already_closed"}
-- -- hr_reopen_position tekrar çağrı (zaten active):
-- SELECT hr_reopen_position(ACTIVE_POS_ID);
-- Beklenen: {"id": ID, "auto_match_result": {}, "note": "already_active"}

-- VERIFY 7: Cross-tenant guard
-- -- Başka şirkete ait pozisyon ID ile çağrı:
-- SELECT update_position(OTHER_COMPANY_POS_ID, '{"ad":"hack"}'::jsonb);
-- Beklenen: EXCEPTION "pozisyon bu şirkete ait değil"

-- VERIFY 8: SECURITY DEFINER + search_path harden
-- SELECT proname, proconfig, prosecdef
-- FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public'
--   AND proname IN ('update_position', 'hr_close_position', 'hr_reopen_position');
-- Beklenen: prosecdef=true, proconfig içinde 'search_path=pg_catalog,public,pg_temp'
