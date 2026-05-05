-- ═══════════════════════════════════════════════════════════════════
-- A8c: candidate_notes_about_me HIGH fix — A1 TOCTOU + A2 audit log
-- Tarih: 2026-05-05 14:00
-- Tier: T3 (post-apply audit fix)
--
-- ÖZET:
-- A8b RPC (mig 20260505135000) auditor T3 review:
-- - A1 HIGH: count(*) + jsonb_agg iki ayrı SELECT — TOCTOU tutarsızlığı
-- - A2 HIGH: KVKK md.11 erişim audit log eksik (ISO27001 A.18.1 gap)
--
-- ÇÖZÜM:
-- 1. kvkk_md11_access_log tablosu (dedicated audit trail aday self-access için)
-- 2. RPC tek CTE ile count + items (atomic snapshot)
-- 3. RAISE EXCEPTION mesajı Türkçe (A6 LOW)
--
-- KAYNAK: auditor T3 audit (5 May 2026) A8b RPC review.
--
-- ROLLBACK:
-- DROP TABLE IF EXISTS public.kvkk_md11_access_log;
-- (RPC önceki versiyonu mig 20260505135000'da)
-- ═══════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════
-- 1. kvkk_md11_access_log tablosu (A2 fix)
-- KVKK md.11 başvurularında ilgili kişinin erişim log'u.
-- Append-only, 2 yıl retention (md.7 + denetim için yeterli).
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.kvkk_md11_access_log (
  id              bigserial PRIMARY KEY,
  candidate_id    bigint      NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  rpc_name        text        NOT NULL,
  result_count    int         NOT NULL DEFAULT 0,
  accessed_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.kvkk_md11_access_log IS
  'A8c (5 May 2026): KVKK md.11 ilgili kişi erişim hakkı audit trail. '
  'ISO27001 A.18.1 — kişisel veri erişim kaydı. '
  'Append-only: aday/employer/admin INSERT yapamaz, RPC SECURITY DEFINER bağlamında postgres role yazar.';

CREATE INDEX IF NOT EXISTS idx_kvkk_md11_candidate
  ON public.kvkk_md11_access_log (candidate_id, accessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_kvkk_md11_rpc
  ON public.kvkk_md11_access_log (rpc_name, accessed_at DESC);

ALTER TABLE public.kvkk_md11_access_log ENABLE ROW LEVEL SECURITY;

-- Aday kendi log'unu okuyabilir (md.11/c "amaca uygun kullanım" görme)
DROP POLICY IF EXISTS kvkk_md11_log_select_own ON public.kvkk_md11_access_log;
CREATE POLICY kvkk_md11_log_select_own ON public.kvkk_md11_access_log
  FOR SELECT TO authenticated
  USING (candidate_id = public.get_my_candidate_id());

-- Admin denetim için okuyabilir (KVKK Kurulu denetim hazırlığı)
DROP POLICY IF EXISTS kvkk_md11_log_admin_read ON public.kvkk_md11_access_log;
CREATE POLICY kvkk_md11_log_admin_read ON public.kvkk_md11_access_log
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- INSERT yalnızca service_role (RPC SECURITY DEFINER context)
DROP POLICY IF EXISTS kvkk_md11_log_service_insert ON public.kvkk_md11_access_log;
CREATE POLICY kvkk_md11_log_service_insert ON public.kvkk_md11_access_log
  FOR INSERT TO service_role
  WITH CHECK (true);

-- UPDATE/DELETE yok (immutable audit — KVKK md.28/d denetim hukuken zorunlu)
GRANT SELECT ON public.kvkk_md11_access_log TO authenticated;
GRANT SELECT, INSERT ON public.kvkk_md11_access_log TO service_role;

-- ═══════════════════════════════════════════════════════════════════
-- 2. candidate_notes_about_me — REPLACE (A1 + A2 + A6 fix)
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.candidate_notes_about_me()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_candidate_id bigint;
  v_uid          uuid;
  v_total        int;
  v_items        jsonb;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    -- A6 fix: Türkçe hata mesajı
    RAISE EXCEPTION 'Kimlik doğrulaması gerekli';
  END IF;

  v_candidate_id := public.get_my_candidate_id();
  IF v_candidate_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok',     true,
      'total',  0,
      'items',  '[]'::jsonb,
      'reason', 'not_a_candidate',
      'note',   'Bu özellik sadece aday hesapları için.'
    );
  END IF;

  -- A1 fix: tek CTE ile atomic snapshot — count + items tutarlılığı
  WITH base AS (
    SELECT n.id,
           n.created_at,
           COALESCE(co.company_name, 'Şirket bilgisi mevcut değil') AS company_name,
           COALESCE(pos.ad,          'Pozisyon bilgisi mevcut değil') AS position_title
    FROM public.employer_candidate_notes n
    LEFT JOIN public.hr_profiles hp  ON hp.id = n.author_id
    LEFT JOIN public.companies   co  ON co.id = hp.company_id
    LEFT JOIN public.positions   pos ON pos.id = n.position_id
    WHERE n.candidate_id = v_candidate_id
    ORDER BY n.created_at DESC
    LIMIT 500  -- A5 fix: pagination guardrail
  )
  SELECT count(*),
         COALESCE(
           jsonb_agg(jsonb_build_object(
             'note_id',        id,
             'created_at',     created_at,
             'company_name',   company_name,
             'position_title', position_title
           )),
           '[]'::jsonb
         )
    INTO v_total, v_items
  FROM base;

  -- A2 fix: KVKK md.11 erişim audit log
  INSERT INTO public.kvkk_md11_access_log (candidate_id, rpc_name, result_count)
  VALUES (v_candidate_id, 'candidate_notes_about_me', v_total);

  RETURN jsonb_build_object(
    'ok',         true,
    'total',      v_total,
    'items',      v_items,
    'kvkk_note',  'KVKK md.11/c kapsamında hakkınızda tutulan notların metadata bilgisi. İçerik için info@hellotalent.ai adresine başvurabilirsiniz (md.13 — 30 gün yanıt süresi).',
    'has_more',   v_total > 500
  );
END;
$$;

REVOKE ALL ON FUNCTION public.candidate_notes_about_me() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.candidate_notes_about_me() TO authenticated;

COMMENT ON FUNCTION public.candidate_notes_about_me IS
  'A8c (5 May 2026): A1 TOCTOU + A2 audit log + A4 NULL coalesce + A5 LIMIT 500 + A6 Türkçe hata fix. '
  'KVKK md.11/c — aday hakkındaki notların metadata erişimi.';

-- ═══════════════════════════════════════════════════════════════════
-- VERIFY (manuel)
-- ═══════════════════════════════════════════════════════════════════
-- 1. Audit log tablosu:
--    SELECT count(*) FROM kvkk_md11_access_log;
--
-- 2. RPC çağrısı (aday context'te):
--    SELECT candidate_notes_about_me();
--    → result + audit log entry oluşur.
--
-- 3. Audit log self-access:
--    SELECT * FROM kvkk_md11_access_log WHERE candidate_id = get_my_candidate_id();
--
-- 4. Admin policy:
--    SELECT count(*) FROM kvkk_md11_access_log; -- admin user → tüm satırlar
