-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ A1 BLOCKER fix — pve_employer_insert policy company_id guard         ║
-- ║                                                                      ║
-- ║ Origin: PR-1 audit (2026-05-06) — auditor finding A1                 ║
-- ║ Risk:   Cross-company pipeline_added INSERT vektörü                  ║
-- ║                                                                      ║
-- ║ Mevcut policy (docs/migrations/040_profile_view_tracking.sql:82-86)  ║
-- ║ sadece "authenticated HR profile var" kontrolü yapıyordu. Authenti-  ║
-- ║ cated bir HR kullanıcısı PostgREST üzerinden başka bir şirketin      ║
-- ║ company_id'si ile pipeline_added event INSERT edebiliyordu. M4 ile   ║
-- ║ event_type genişlemesi bu vektörü pratik exploit'e açıyor.           ║
-- ║                                                                      ║
-- ║ SECURITY DEFINER RPC'ler (hr_auto_match_position, hr_refresh_*) bu   ║
-- ║ riski kendi içinde kapatıyor — ama doğrudan tablo INSERT için policy ║
-- ║ guard zorunlu. Defense in depth.                                     ║
-- ║                                                                      ║
-- ║ Helper: current_employer_company_id() STABLE SECURITY DEFINER        ║
-- ║         (20260503164427_hr_profile_audit_log.sql:32 emsal)           ║
-- ║                                                                      ║
-- ║ KVKK md.7 — kişisel veri işleme şartları (yetkisiz veri ekleme       ║
-- ║              cross-company exploit ile gerçekleşmemeli)              ║
-- ║                                                                      ║
-- ║ ROLLBACK: docs/rollback/matching-engine-rollback.sql                 ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════
-- 1. Eski policy DROP (idempotent — IF EXISTS)
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS pve_employer_insert ON public.profile_view_events;

-- ═══════════════════════════════════════════════════════════════
-- 2. Yeni policy — company_id guard ile
-- ═══════════════════════════════════════════════════════════════
CREATE POLICY pve_employer_insert ON public.profile_view_events
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Mevcut authenticated HR profile kontrolü korunur
    EXISTS (SELECT 1 FROM hr_profiles WHERE id = auth.uid())
    -- D4 Codex iter-2 fix: NULL company_id YALNIZCA legacy 'view' event'leri için kabul.
    -- pipeline_added / message_sent için company_id ZORUNLU + recruiter'ın kendi şirketi.
    -- Eski exploit vektörü: NULL company_id ile fake pipeline_added INSERT → trigger interaction++.
    AND (
      (company_id IS NULL AND COALESCE(event_type, 'view') = 'view')
      OR company_id = public.current_employer_company_id()
    )
  );

COMMENT ON POLICY pve_employer_insert ON public.profile_view_events IS
  'Authenticated HR sadece kendi company_id ile event INSERT edebilir. NULL company_id sadece legacy view event icin. A1 + D4 audit fix 2026-05-06.';

-- ═══════════════════════════════════════════════════════════════
-- 3. DRY RUN VERIFY BLOCK (apply sonrası lokal kontrol)
-- ═══════════════════════════════════════════════════════════════
-- Policy doğrulama:
-- SELECT pol.polname, pg_get_expr(pol.polwithcheck, pol.polrelid) AS check_expr
--   FROM pg_policy pol
--   JOIN pg_class cls ON cls.oid = pol.polrelid
--   WHERE cls.relname = 'profile_view_events'
--     AND pol.polname = 'pve_employer_insert';
--
-- Beklenen: check_expr içinde "current_employer_company_id()" geçmeli
--
-- Cross-company exploit testi (negatif test, kabul edilmeli ki INSERT REJECT olsun):
--   SET ROLE authenticated;
--   SET request.jwt.claim.sub = '<hr_user_a_uuid>';
--   INSERT INTO profile_view_events (candidate_id, hr_profile_id, company_id, event_type)
--     VALUES (1, '<hr_user_a_uuid>', <other_company_id>, 'pipeline_added');
--   -- ERROR bekleniyor: new row violates row-level security policy
