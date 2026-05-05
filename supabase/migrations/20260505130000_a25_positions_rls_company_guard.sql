-- ═══════════════════════════════════════════════════════════════════
-- A25: positions RLS company_id guard (defense-in-depth)
-- Tarih: 2026-05-05 13:00
-- Tier: T3 (RLS policy migration + orphan backfill)
--
-- ÖZET:
-- P0 pipefix code-reviewer R3 finding: positions tablosu RLS sadece
-- `hr_profile_id = auth.uid()` filter, `company_id` match yok. User şirket
-- değiştirdiyse eski şirketin pozisyonları DB-side'da hâlâ görünür.
-- Client-side filter (P0 fix js/ik-data.js) tek savunma hattı.
--
-- ÇÖZÜM (defense-in-depth):
-- 1. SELECT/UPDATE/DELETE policy'lere company_id eşleşmesi eklenir
-- 2. INSERT WITH CHECK aynı şekilde — yeni orphan üretmez
-- 3. Backfill: mevcut orphan positions (hr_profile.company_id != positions.company_id)
--    `durum='closed'` set edilir — listede görünmez ama tarihçe korunur
--
-- HELPER: current_employer_company_id() STABLE SECURITY DEFINER zaten var
-- (mig 20260503164427) — TOCTOU race window kapalı.
--
-- KAYNAK: pending-approvals A25 (5 May 2026), code-reviewer R3 P0 pipefix.
--
-- ROLLBACK:
-- Önceki policy'leri geri yükle (sadece hr_profile_id = auth.uid()).
-- ═══════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════
-- 1. SELECT policy — own + company match
-- ═══════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS positions_select_own ON public.positions;
CREATE POLICY positions_select_own ON public.positions
  FOR SELECT TO authenticated
  USING (
    hr_profile_id = auth.uid()
    AND company_id IS NOT NULL
    AND company_id = public.current_employer_company_id()
  );

COMMENT ON POLICY positions_select_own ON public.positions IS
  'A25 (5 May 2026): defense-in-depth — pozisyon sahibi + mevcut şirket eşleşme. '
  'Orphan pozisyonlar (eski şirket) DB-side gizlenir.';

-- ═══════════════════════════════════════════════════════════════════
-- 2. INSERT policy — yeni orphan üretmez
-- ═══════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS positions_insert_own ON public.positions;
CREATE POLICY positions_insert_own ON public.positions
  FOR INSERT TO authenticated
  WITH CHECK (
    hr_profile_id = auth.uid()
    AND company_id IS NOT NULL
    AND company_id = public.current_employer_company_id()
  );

-- ═══════════════════════════════════════════════════════════════════
-- 3. UPDATE policy
-- ═══════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS positions_update_own ON public.positions;
CREATE POLICY positions_update_own ON public.positions
  FOR UPDATE TO authenticated
  USING (
    hr_profile_id = auth.uid()
    AND company_id IS NOT NULL
    AND company_id = public.current_employer_company_id()
  )
  WITH CHECK (
    hr_profile_id = auth.uid()
    AND company_id IS NOT NULL
    AND company_id = public.current_employer_company_id()
  );

-- ═══════════════════════════════════════════════════════════════════
-- 4. DELETE policy
-- ═══════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS positions_delete_own ON public.positions;
CREATE POLICY positions_delete_own ON public.positions
  FOR DELETE TO authenticated
  USING (
    hr_profile_id = auth.uid()
    AND company_id IS NOT NULL
    AND company_id = public.current_employer_company_id()
  );

-- ═══════════════════════════════════════════════════════════════════
-- 5. Admin read policy korunur (mevcut positions_admin_read is_admin()
-- üzerinden). Orphan'a admin erişimi sürer (KVKK denetim).
-- Mevcut DROP'a gerek yok.
-- ═══════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════
-- 6. Orphan backfill — durum='closed' set
-- Mevcut orphan'lar listede görünmesin. Tarihçe korunur (DELETE değil).
-- Service_role context bu UPDATE — RLS bypass.
-- ═══════════════════════════════════════════════════════════════════
WITH orphans AS (
  SELECT p.id
  FROM public.positions p
  LEFT JOIN public.hr_profiles hp ON hp.id = p.hr_profile_id
  WHERE p.durum = 'active'
    AND (p.company_id IS NULL
         OR hp.company_id IS NULL
         OR p.company_id <> hp.company_id)
)
UPDATE public.positions
SET durum = 'closed',
    closed_at = COALESCE(closed_at, now())
WHERE id IN (SELECT id FROM orphans);

-- ═══════════════════════════════════════════════════════════════════
-- VERIFY (manuel)
-- ═══════════════════════════════════════════════════════════════════
-- 1. Policy'ler güncellendi:
--    SELECT policyname, qual FROM pg_policies WHERE tablename='positions';
--    Beklenen: select_own/update_own/delete_own → company_id eşleşmesi içerir.
--
-- 2. Orphan backfill:
--    SELECT count(*) FROM positions p
--    LEFT JOIN hr_profiles hp ON hp.id = p.hr_profile_id
--    WHERE p.durum = 'active'
--      AND (p.company_id IS NULL OR p.company_id <> hp.company_id);
--    → 0 olmalı.
--
-- 3. User test (P0 pipefix flow):
--    - getPositions() artık 0 orphan döner (client+DB iki katman)
--    - addToPipeline pos=orphan_id → RLS reject (zaten reject ediyordu)
--    - addToPipeline pos=valid_id → 200 OK
