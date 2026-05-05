-- ═══════════════════════════════════════════════════════════════════
-- A10: hr_profiles granular notification toggles
-- Tarih: 2026-05-05
-- Tier: T3 (mini migration — yeni kolon, RLS değişmez)
--
-- ÖZET:
-- Settings UI Phase D demo'da 3 granular toggle var (notify_msg,
-- notify_pipeline, notify_weekly). Backend'de sadece notify_email_newsletter
-- (newsletter Phase 1 mig 20260423000000). Bu migration eksik 2 kolonu ekler:
-- - notify_email_messages: yeni aday mesajı email bildirim
-- - notify_email_pipeline: pipeline aşama değişikliği email bildirim
--
-- KAYNAK: pending-approvals.md A10 (26 Nisan 2026)
--
-- RLS:
-- hr_profiles_update_own policy mevcut (mig 20260503180000) — yeni kolonlar
-- otomatik dahil. WITH CHECK account_status guard etkilenmez (yeni kolon
-- account_status değil). User kendi notify tercihini değiştirebilir.
-- Sensitive trigger hr_profiles_freeze_sensitive_fields notify_* kolonlarına
-- dokunmuyor — change allowed.
--
-- ROLLBACK:
-- ALTER TABLE public.hr_profiles
--   DROP COLUMN IF EXISTS notify_email_messages,
--   DROP COLUMN IF EXISTS notify_email_pipeline;
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.hr_profiles
  ADD COLUMN IF NOT EXISTS notify_email_messages BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_email_pipeline BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.hr_profiles.notify_email_messages IS
  'Yeni aday mesajı geldiğinde employer email bildirim alır. Default true. A10 (5 May 2026).';

COMMENT ON COLUMN public.hr_profiles.notify_email_pipeline IS
  'Pipeline aşama değişikliği (yeni→inceleme, mülakat, vb) employer email bildirim alır. Default true. A10 (5 May 2026).';

-- Defansif: Mevcut hr_profile satırları default true alır (NOT NULL DEFAULT).
-- Yeni signup user'ları da default opt-in (KVKK md.5 meşru menfaat — kendi pipeline'ları).
--
-- NOT: update_hr_notify_settings RPC ayrı migration'da (20260505110000_a10b_notify_rpc.sql).
-- hr_profiles UPDATE privilege authenticated rol için revoke edilmiş (mig 20260503190000 H1)
-- → SECURITY DEFINER RPC zorunlu.

-- Verify (manuel):
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'hr_profiles'
--   AND column_name IN ('notify_email_messages', 'notify_email_pipeline');
