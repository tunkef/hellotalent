-- ═══════════════════════════════════════════════════════════════════
-- A8: KVKK retention + cron purge — employer_candidate_notes
-- Tarih: 2026-05-05 12:50
-- Tier: T2-T3 (yeni kolon + cron job — orta etki)
--
-- ÖZET:
-- Auditor Wave 2 L1 finding: employer_candidate_notes retention süresi
-- tanımsız + cron purge yok → KVKK md.7 (saklama amaca uygun süreyle
-- sınırlı) compliance gap.
--
-- ÇÖZÜM:
-- 1. retention_until timestamptz kolon (default now() + 2 year)
-- 2. Mevcut satırlar için backfill (created_at + 2 year)
-- 3. purge_old_employer_notes() function — retention_until <= now() siler
-- 4. cron.schedule — günlük 02:00 UTC
--
-- NOT: Aday self-view/silme RPC (KVKK md.11 right of access) — legal-reviewer
-- feedback'i sonrası ayrı migration. Bu migration sadece retention+purge.
--
-- KAYNAK: pending-approvals A8 (26 Nisan 2026), Wave 2 auditor L1 finding.
--
-- ROLLBACK:
-- DO $$ BEGIN PERFORM cron.unschedule('purge-employer-notes'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
-- DROP FUNCTION IF EXISTS public.purge_old_employer_notes();
-- ALTER TABLE public.employer_candidate_notes DROP COLUMN IF EXISTS retention_until;
-- ═══════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════
-- 1. retention_until kolon
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE public.employer_candidate_notes
  ADD COLUMN IF NOT EXISTS retention_until timestamptz NOT NULL DEFAULT (now() + interval '2 years');

COMMENT ON COLUMN public.employer_candidate_notes.retention_until IS
  'A8 (5 May 2026): Notun otomatik silineceği zaman. Default: created_at + 2 yıl. '
  'KVKK md.7 — amaca uygun süreyle sınırlı saklama. Cron job '
  'purge_old_employer_notes günlük çalışır, retention_until <= now() satırları siler.';

-- Mevcut satırlar (eğer varsa): created_at + 2 yıl backfill
-- DEFAULT now() + 2 yıl yerine created_at temelli — eski notlar daha kısa kalır.
UPDATE public.employer_candidate_notes
SET retention_until = created_at + interval '2 years'
WHERE retention_until > created_at + interval '2 years' + interval '1 day';
-- "1 day" tolerance: yeni eklenen satırların DEFAULT'unu etkilemez.

-- Index — cron purge query hızlansın
CREATE INDEX IF NOT EXISTS idx_notes_retention_until
  ON public.employer_candidate_notes (retention_until);

-- ═══════════════════════════════════════════════════════════════════
-- 2. purge_old_employer_notes() — cron job target
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.purge_old_employer_notes()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_deleted_count int;
BEGIN
  DELETE FROM public.employer_candidate_notes
  WHERE retention_until <= now();
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- Audit log (opsiyonel) — silinen sayıyı kayıt
  RAISE NOTICE 'purge_old_employer_notes: deleted % rows', v_deleted_count;

  RETURN jsonb_build_object(
    'ok', true,
    'deleted_count', v_deleted_count,
    'purged_at', now()
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.purge_old_employer_notes() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.purge_old_employer_notes() FROM authenticated;
-- Sadece service_role + cron tetikler.

COMMENT ON FUNCTION public.purge_old_employer_notes IS
  'A8 (5 May 2026): KVKK retention purge job. Günlük cron 02:00 UTC. '
  'retention_until <= now() satırları siler. SECURITY DEFINER + service_role only.';

-- ═══════════════════════════════════════════════════════════════════
-- 3. cron.schedule — günlük 02:00 UTC (05:00 TRT)
-- Unschedule-first pattern (mig 20260503200000 convention).
-- 02:00 UTC seçildi: hr-purge-lifecycle 00:00 UTC'de — overlap yok.
-- ═══════════════════════════════════════════════════════════════════
DO $$
BEGIN
  PERFORM cron.unschedule('purge-employer-notes');
EXCEPTION WHEN OTHERS THEN
  NULL;
END
$$;

SELECT cron.schedule(
  'purge-employer-notes',
  '0 2 * * *',
  $$SELECT public.purge_old_employer_notes();$$
);

-- ═══════════════════════════════════════════════════════════════════
-- VERIFY (manuel)
-- ═══════════════════════════════════════════════════════════════════
-- 1. Kolon eklendi:
--    SELECT column_name, data_type, column_default FROM information_schema.columns
--    WHERE table_name='employer_candidate_notes' AND column_name='retention_until';
--
-- 2. Cron schedule:
--    SELECT jobname, schedule, command FROM cron.job WHERE jobname = 'purge-employer-notes';
--
-- 3. Manuel test (service_role context):
--    SELECT public.purge_old_employer_notes();
--    -- Hiç eski not yoksa: { ok:true, deleted_count: 0, purged_at: ... }
--
-- 4. Backfill kontrolü:
--    SELECT created_at, retention_until, retention_until - created_at AS lifespan
--    FROM employer_candidate_notes;
--    -- Tüm satırlar lifespan ~ 2 yıl olmalı.
