-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  PR-6 M3 — RLS policy helper function inconsistency fix            ║
-- ║  Tarih: 2026-05-07                                                  ║
-- ║  Tier: T3 (RLS pattern consistency — auditor finding M3)           ║
-- ║                                                                      ║
-- ║  SORUN:                                                              ║
-- ║  pve_candidate_select + cvs_candidate_select policy'leri (040       ║
-- ║  profile_view_tracking) subquery kullanıyor:                        ║
-- ║    candidate_id IN (SELECT c.id FROM candidates c                   ║
-- ║                     WHERE c.user_id = auth.uid())                   ║
-- ║  supabase-patterns.md kuralı: get_my_candidate_id() helper kullan.  ║
-- ║  Helper tüm child tablolarda tutarlı — subquery inconsistency       ║
-- ║  query plan farklılığına ve pattern drift'e yol açar.               ║
-- ║                                                                      ║
-- ║  ÇÖZÜM:                                                             ║
-- ║  1. get_my_candidate_id() helper mevcut mu kontrol + CREATE OR      ║
-- ║     REPLACE (idempotent — search_path harden güncelleme dahil)      ║
-- ║  2. pve_candidate_select → DROP + helper ile CREATE                 ║
-- ║  3. cvs_candidate_select → DROP + helper ile CREATE                 ║
-- ║                                                                      ║
-- ║  EMSAL: 20260505140000_a8c_audit_log_consistency_fix.sql (satır 53) ║
-- ║  EMSAL: 20260327020000_streak_foundation.sql (pek çok helper ref)   ║
-- ║                                                                      ║
-- ║  NOT: pve_employer_insert policy (20260506135000_pr1_guard) zaten   ║
-- ║  doğru — current_employer_company_id() helper kullanıyor. Bu        ║
-- ║  migration sadece candidate SELECT policy'lerini hedefler.          ║
-- ║                                                                      ║
-- ║  auth.users KURALI: Policy içinde SELECT...FROM auth.users YASAK.   ║
-- ║  get_my_candidate_id() zaten bunu uygular:                          ║
-- ║    SELECT id FROM candidates WHERE user_id = auth.uid()             ║
-- ║  auth.uid() güvenli, auth.users cross-ref yok.                     ║
-- ║                                                                      ║
-- ║  ROLLBACK:                                                           ║
-- ║  DROP POLICY IF EXISTS pve_candidate_select ON profile_view_events; ║
-- ║  CREATE POLICY pve_candidate_select ON profile_view_events           ║
-- ║    FOR SELECT USING (                                                ║
-- ║      candidate_id IN (                                               ║
-- ║        SELECT c.id FROM public.candidates c WHERE c.user_id = auth.uid()║
-- ║      ));                                                             ║
-- ║  (cvs_candidate_select için aynı pattern)                           ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════════════
-- 1. get_my_candidate_id() helper — CREATE OR REPLACE (idempotent)
--    Tanım docs/migrations/001 + 031'de mevcut (archived).
--    Active migration'da tanımlanmış mı kontrol edildi:
--      grep sonucu: aktif supabase/migrations/ içinde tanım yok,
--      sadece referans var. Baseline (20260322000000) içinde var mı
--      bilinmiyor — CREATE OR REPLACE ile idempotent uygula.
--    search_path: pg_catalog, public, pg_temp (A14 pattern — docs/migrations
--    versiyonunda sadece 'public' var; harden ediyoruz).
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_my_candidate_id()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT id FROM public.candidates WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Authenticated kullanıcılar çağırabilir (RLS policy içinde çağrılır).
GRANT EXECUTE ON FUNCTION public.get_my_candidate_id() TO authenticated;

COMMENT ON FUNCTION public.get_my_candidate_id() IS
  'Mevcut auth.uid() kullanıcısının candidates.id değerini döndürür. '
  'Tüm candidate child table RLS policy''lerinde standart helper. '
  'PR-6 M3 (7 May 2026): search_path pg_catalog,public,pg_temp hardened (A14 pattern). '
  'STABLE + SECURITY DEFINER — auth.users cross-ref YASAK kuralına uygun '
  '(candidates.user_id = auth.uid() — direkt, güvenli).';

-- ═══════════════════════════════════════════════════════════════════════
-- 2. pve_candidate_select — subquery → helper
--    Eski: candidate_id IN (SELECT c.id FROM candidates c WHERE c.user_id = auth.uid())
--    Yeni: candidate_id = public.get_my_candidate_id()
--    Etki: aynı semantik, helper tutarlılığı sağlandı.
-- ═══════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS pve_candidate_select ON public.profile_view_events;

CREATE POLICY pve_candidate_select ON public.profile_view_events
  FOR SELECT
  TO authenticated
  USING (candidate_id = public.get_my_candidate_id());

COMMENT ON POLICY pve_candidate_select ON public.profile_view_events IS
  'Aday kendi profile_view_events satırlarını okuyabilir. '
  'PR-6 M3 (7 May 2026): subquery → get_my_candidate_id() helper ile replace edildi. '
  'Önceki: candidate_id IN (SELECT...) — 040_profile_view_tracking.sql:91.';

-- ═══════════════════════════════════════════════════════════════════════
-- 3. cvs_candidate_select — subquery → helper
--    candidate_view_stats: aday kendi toplam view istatistiklerini görür.
--    Aynı pattern — idempotent DROP + CREATE.
-- ═══════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS cvs_candidate_select ON public.candidate_view_stats;

CREATE POLICY cvs_candidate_select ON public.candidate_view_stats
  FOR SELECT
  TO authenticated
  USING (candidate_id = public.get_my_candidate_id());

COMMENT ON POLICY cvs_candidate_select ON public.candidate_view_stats IS
  'Aday kendi candidate_view_stats satırını okuyabilir. '
  'PR-6 M3 (7 May 2026): subquery → get_my_candidate_id() helper ile replace edildi. '
  'Önceki: candidate_id IN (SELECT...) — 040_profile_view_tracking.sql:103.';

-- ═══════════════════════════════════════════════════════════════════════
-- VERIFY BLOCK
-- ═══════════════════════════════════════════════════════════════════════

-- VERIFY 1: Helper fonksiyon search_path hardened
-- SELECT proname, proconfig
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public' AND p.proname = 'get_my_candidate_id';
-- Beklenen: proconfig = '{search_path=pg_catalog,public,pg_temp}'

-- VERIFY 2: pve_candidate_select policy helper kullanıyor
-- SELECT polname, pg_get_expr(polqual, polrelid) AS using_expr
--   FROM pg_policy pol
--   JOIN pg_class cls ON cls.oid = pol.polrelid
--   WHERE cls.relname = 'profile_view_events'
--     AND pol.polname = 'pve_candidate_select';
-- Beklenen: using_expr içinde 'get_my_candidate_id()' geçmeli

-- VERIFY 3: cvs_candidate_select policy helper kullanıyor
-- SELECT polname, pg_get_expr(polqual, polrelid) AS using_expr
--   FROM pg_policy pol
--   JOIN pg_class cls ON cls.oid = pol.polrelid
--   WHERE cls.relname = 'candidate_view_stats'
--     AND pol.polname = 'cvs_candidate_select';
-- Beklenen: using_expr içinde 'get_my_candidate_id()' geçmeli

-- VERIFY 4: Cross-aday isolation regression test
-- -- HR olarak candidate A için view event INSERT:
-- SET ROLE authenticated;
-- SET request.jwt.claim.sub = '<cand_A_user_uuid>';
-- -- Candidate A kendi event'larını görür:
-- SELECT count(*) FROM public.profile_view_events;
-- -- Candidate B context'te Candidate A event'larını göremez:
-- SET request.jwt.claim.sub = '<cand_B_user_uuid>';
-- SELECT count(*) FROM public.profile_view_events;
-- -- Beklenen: Candidate B kendi event'larını görür, A'nınkileri görmez

-- VERIFY 5: Query plan helper fonksiyonunu kullanıyor (EXPLAIN kontrol)
-- EXPLAIN (FORMAT TEXT)
--   SELECT * FROM public.profile_view_events;
-- Beklenen: Filter içinde 'get_my_candidate_id()' görünür
-- (authenticated context gerekli — psql meta komutu ile test edilebilir)

-- VERIFY 6: Mevcut diğer policy'ler etkilenmedi
-- SELECT polname FROM pg_policy pol
--   JOIN pg_class cls ON cls.oid = pol.polrelid
--   WHERE cls.relname IN ('profile_view_events', 'candidate_view_stats');
-- Beklenen satırlar:
--   profile_view_events:  pve_employer_insert, pve_candidate_select
--   candidate_view_stats: cvs_candidate_select
-- (pve_employer_insert değişmedi — PR-6 M3 kapsamı dışı)
