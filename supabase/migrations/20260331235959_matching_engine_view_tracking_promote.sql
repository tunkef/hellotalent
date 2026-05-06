-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ D1 (Codex iter-2 P1) — Promote profile_view_events tracking           ║
-- ║                                                                       ║
-- ║ ORIGIN: docs/migrations/040_profile_view_tracking.sql                 ║
-- ║         (legacy doc-only, not in supabase/migrations/)                ║
-- ║                                                                       ║
-- ║ NEDEN: Production'da iki tablo da MEVCUT (manuel apply geçmiş), ama   ║
-- ║        supabase/migrations/'da CREATE TABLE yok. Fresh dev/staging    ║
-- ║        DB'de migration replay sırasında M4 ALTER TABLE FAIL eder      ║
-- ║        — "relation profile_view_events does not exist".               ║
-- ║                                                                       ║
-- ║ SAFETY: Tüm CREATE'ler IF NOT EXISTS — production'da var, no-op olur. ║
-- ║         Fresh DB'de ilk yaratım.                                      ║
-- ║                                                                       ║
-- ║ APPLY SIRASI: M1 (100000) → M2 (110000) → BU (120000) → M4 (130000)  ║
-- ║                                                                       ║
-- ║ NOT: M4 bu tablolar üzerinde ALTER ekler (event_type, event_metadata) ║
-- ║      ve update_candidate_view_stats() fonksiyonunu CREATE OR REPLACE  ║
-- ║      ile güncelleştirir (event_type filter ile). Bu migration sadece  ║
-- ║      base tabloları + trigger + RLS sağlar.                           ║
-- ║                                                                       ║
-- ║ ROLLBACK: docs/rollback/matching-engine-rollback.sql                  ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════
-- 1. profile_view_events — raw event log
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.profile_view_events (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id bigint NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  hr_profile_id uuid NOT NULL REFERENCES public.hr_profiles(id) ON DELETE CASCADE,
  company_id  bigint REFERENCES public.companies(id) ON DELETE SET NULL,
  position_id bigint REFERENCES public.positions(id) ON DELETE SET NULL,
  position_ad_snapshot  text,
  position_seg_snapshot text,
  viewed_at   timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pve_candidate_id ON public.profile_view_events(candidate_id);
CREATE INDEX IF NOT EXISTS idx_pve_hr_candidate ON public.profile_view_events(hr_profile_id, candidate_id);

-- ═══════════════════════════════════════════════════════════════
-- 2. candidate_view_stats — aggregated stats per candidate
--    G1 Codex iter-5 fix: DROP VIEW IF EXISTS object-type-safe.
--    Production'da TABLE olarak elle yaratılmış (VIEW DEĞİL). Doğrudan
--    DROP VIEW IF EXISTS "not a view" error fırlatır → migration abort.
--    Sadece gerçek VIEW ise drop et.
-- ═══════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'candidate_view_stats'
      AND c.relkind = 'v'  -- 'v' = view (kind 'r' = table)
  ) THEN
    EXECUTE 'DROP VIEW public.candidate_view_stats';
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.candidate_view_stats (
  candidate_id    bigint PRIMARY KEY REFERENCES public.candidates(id) ON DELETE CASCADE,
  total_views     integer DEFAULT 0 NOT NULL,
  unique_companies integer DEFAULT 0 NOT NULL,
  unique_positions integer DEFAULT 0 NOT NULL,
  last_viewed_at  timestamptz
);

-- ═══════════════════════════════════════════════════════════════
-- 3. Trigger fonksiyonu (base — M4 sonradan event_type filter ekler)
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.update_candidate_view_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.candidate_view_stats (candidate_id, total_views, unique_companies, unique_positions, last_viewed_at)
  VALUES (NEW.candidate_id, 1,
    CASE WHEN NEW.company_id IS NOT NULL THEN 1 ELSE 0 END,
    CASE WHEN NEW.position_ad_snapshot IS NOT NULL THEN 1 ELSE 0 END,
    NEW.viewed_at)
  ON CONFLICT (candidate_id) DO UPDATE SET
    total_views = (
      SELECT count(*) FROM public.profile_view_events WHERE candidate_id = NEW.candidate_id
    ),
    unique_companies = (
      SELECT count(DISTINCT company_id) FROM public.profile_view_events WHERE candidate_id = NEW.candidate_id AND company_id IS NOT NULL
    ),
    unique_positions = (
      SELECT count(DISTINCT position_ad_snapshot) FROM public.profile_view_events WHERE candidate_id = NEW.candidate_id AND position_ad_snapshot IS NOT NULL
    ),
    last_viewed_at = GREATEST(public.candidate_view_stats.last_viewed_at, NEW.viewed_at);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_view_stats ON public.profile_view_events;
CREATE TRIGGER trg_update_view_stats
  AFTER INSERT ON public.profile_view_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_candidate_view_stats();

-- ═══════════════════════════════════════════════════════════════
-- 4. RLS Policies (base — A1 hotfix 135000'de pve_employer_insert güncellenecek)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.profile_view_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_view_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pve_employer_insert ON public.profile_view_events;
CREATE POLICY pve_employer_insert ON public.profile_view_events
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.hr_profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS pve_candidate_select ON public.profile_view_events;
CREATE POLICY pve_candidate_select ON public.profile_view_events
  FOR SELECT
  USING (
    candidate_id IN (SELECT c.id FROM public.candidates c WHERE c.user_id = auth.uid())
  );

DROP POLICY IF EXISTS cvs_candidate_select ON public.candidate_view_stats;
CREATE POLICY cvs_candidate_select ON public.candidate_view_stats
  FOR SELECT
  USING (
    candidate_id IN (SELECT c.id FROM public.candidates c WHERE c.user_id = auth.uid())
  );

GRANT SELECT, INSERT ON public.profile_view_events  TO authenticated;
GRANT SELECT          ON public.candidate_view_stats TO authenticated;

-- ═══════════════════════════════════════════════════════════════
-- 5. DRY RUN VERIFY BLOCK
-- ═══════════════════════════════════════════════════════════════
-- Production: zaten var → no-op apply
-- Fresh DB:   tablo + index + trigger + policy oluşturulur
--
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema='public' AND table_name IN ('profile_view_events','candidate_view_stats');
-- Beklenen: 2 satır
