-- ═══════════════════════════════════════════════════════════════════
-- Migration: a23q7_employer_pool_query_audit_log
-- Date: 2026-05-04
-- Ref: A23 Q7 fix (Codex T3) — KVKK md.7 recipient control + audit
-- Tier: T3 (security/PII audit)
-- ─────────────────────────────────────────────────────────────────
-- AMAÇ:
--   KVKK md.7 (veri sorumlusunun yükümlülükleri) ve md.11 (data subject
--   rights — kim PII'ye eriştti) için minimum audit log. Codex T3
--   review (2026-05-04) Q7'da: "PII strip ile minimization %80 kapandı,
--   recipient control + audit log eksik" → bu migration eksik %20'yi
--   kapatır.
--
-- TASARIM:
--   Page-level log (her search RPC çağrısı = 1 satır), per-candidate
--   değil. 50 aday × call → 1 satır audit (volume kontrol altında).
--   Insert RPC içinde (search_employer_candidates revize) ya da ayrı
--   trigger (volatile DEFINER → STABLE marker bozar). Bu sprint:
--   ek ad-hoc INSERT lazım olduğunda kullanılır; RPC entegrasyonu
--   ayrı (sonraki migration veya backlog).
--
-- TABLO:
--   employer_pool_query_log
--     id              bigserial PK
--     hr_profile_id   uuid NOT NULL  (FK auth.users(id) gevşek)
--     company_id      bigint
--     filters         jsonb
--     position_id     bigint
--     result_total    int
--     accessed_at     timestamptz NOT NULL DEFAULT now()
--   PARTITION ile değil, basit tablo. Volume düşük (employer < 100,
--   günlük ~1000 query MVP).
--
-- RLS:
--   - INSERT: service_role + SECURITY DEFINER RPC'ler.
--   - SELECT: sadece admin (hr_profiles.feature_flags->>'is_internal_admin').
--             Aday self-erişim değil (KVKK ayrı endpoint).
--
-- RETENTION:
--   90 gün otomatik purge (KVKK md.11 makul süre).
--   Cron: pg_cron job (sonraki migration).
--
-- ETKİLİ NOKTALAR:
--   Bu migration sadece tablo + RLS + index oluşturur.
--   search_employer_candidates RPC'sine INSERT entegrasyonu ayrı
--   migration (a23q7b_search_rpc_audit_insert) ile yapılır — bu
--   sprint scope: tablo hazır, RPC entegrasyonu Codex re-review sonrası.
--
-- ROLLBACK:
--   DROP TABLE public.employer_pool_query_log CASCADE;
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- 1. TABLO
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.employer_pool_query_log (
  id            bigserial PRIMARY KEY,
  hr_profile_id uuid NOT NULL,
  company_id    bigint,
  filters       jsonb DEFAULT '{}'::jsonb,
  position_id   bigint,
  result_total  int,
  accessed_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emp_pool_log_hr_profile
  ON public.employer_pool_query_log(hr_profile_id, accessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_emp_pool_log_company
  ON public.employer_pool_query_log(company_id, accessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_emp_pool_log_accessed
  ON public.employer_pool_query_log(accessed_at);

-- ─────────────────────────────────────────────────────────────────
-- 2. RLS
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE public.employer_pool_query_log ENABLE ROW LEVEL SECURITY;

-- INSERT: hiçbir authenticated user. Sadece SECURITY DEFINER RPC'ler
-- service_role bypass ile insert eder. Policy yok → RLS reject default.
-- (search_employer_candidates SECURITY DEFINER bu tabloya INSERT yapar
-- ileride; SECURITY DEFINER context'inde RLS bypass.)

-- SELECT: sadece admin (Tuna ve gelecek admin'ler)
CREATE POLICY "employer_pool_log_admin_select"
  ON public.employer_pool_query_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM hr_profiles hp
      WHERE hp.id = auth.uid()
        AND COALESCE((hp.feature_flags ->> 'is_internal_admin')::boolean, false) = true
    )
  );

-- DELETE: sadece service_role (cron purge). Policy yok → reject default.

-- ─────────────────────────────────────────────────────────────────
-- 3. GRANT
-- ─────────────────────────────────────────────────────────────────
GRANT SELECT ON public.employer_pool_query_log TO authenticated;
-- INSERT/UPDATE/DELETE: yalnızca service_role (default) + SECURITY DEFINER RPC.

-- ─────────────────────────────────────────────────────────────────
-- 4. COMMENT
-- ─────────────────────────────────────────────────────────────────
COMMENT ON TABLE public.employer_pool_query_log IS
  'A23 Q7 (2026-05-04) — KVKK md.7 audit log: employer havuz query erişimleri. '
  'Per-call (page-level) log; per-candidate değil (volume kontrol). '
  'Retention: 90 gün cron purge (sonraki migration). '
  'Read: sadece admin. Write: SECURITY DEFINER RPC (search_employer_candidates) — '
  'RPC entegrasyonu ayrı migration (a23q7b).';

COMMENT ON COLUMN public.employer_pool_query_log.filters IS
  'Search filter snapshot (no PII — sadece filter shape). KVKK md.4 minimum.';

COMMENT ON COLUMN public.employer_pool_query_log.result_total IS
  'Aday count (PII yok). Forensic için yeterli.';
