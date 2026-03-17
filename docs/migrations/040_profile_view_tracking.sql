-- Migration 040: Profile View Tracking
-- Creates profile_view_events table, candidate_view_stats table,
-- trigger to auto-update stats, and RLS policies.
-- Run in Supabase SQL Editor.

-- ═══════════════════════════════════════════════════
-- 1. profile_view_events — raw event log
-- ═══════════════════════════════════════════════════
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

-- Index for candidate lookups (profil.html reads)
CREATE INDEX IF NOT EXISTS idx_pve_candidate_id ON public.profile_view_events(candidate_id);
-- Index for employer dedup (optional)
CREATE INDEX IF NOT EXISTS idx_pve_hr_candidate ON public.profile_view_events(hr_profile_id, candidate_id);

-- ═══════════════════════════════════════════════════
-- 2. candidate_view_stats — aggregated stats per candidate
--    NOTE: A VIEW with this name may already exist from a previous session.
--    We drop it first, then create as a TABLE (views can't have RLS or triggers).
-- ═══════════════════════════════════════════════════
DROP VIEW IF EXISTS public.candidate_view_stats;

CREATE TABLE IF NOT EXISTS public.candidate_view_stats (
  candidate_id    bigint PRIMARY KEY REFERENCES public.candidates(id) ON DELETE CASCADE,
  total_views     integer DEFAULT 0 NOT NULL,
  unique_companies integer DEFAULT 0 NOT NULL,
  unique_positions integer DEFAULT 0 NOT NULL,
  last_viewed_at  timestamptz
);

-- ═══════════════════════════════════════════════════
-- 3. Trigger: auto-update candidate_view_stats on insert
-- ═══════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.update_candidate_view_stats()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS trg_update_view_stats ON public.profile_view_events;
CREATE TRIGGER trg_update_view_stats
  AFTER INSERT ON public.profile_view_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_candidate_view_stats();

-- ═══════════════════════════════════════════════════
-- 4. RLS Policies
-- ═══════════════════════════════════════════════════

-- Enable RLS
ALTER TABLE public.profile_view_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_view_stats ENABLE ROW LEVEL SECURITY;

-- profile_view_events: employers can INSERT (log views)
DROP POLICY IF EXISTS pve_employer_insert ON public.profile_view_events;
CREATE POLICY pve_employer_insert ON public.profile_view_events
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.hr_profiles WHERE id = auth.uid())
  );

-- profile_view_events: candidates can SELECT their own views
DROP POLICY IF EXISTS pve_candidate_select ON public.profile_view_events;
CREATE POLICY pve_candidate_select ON public.profile_view_events
  FOR SELECT
  USING (
    candidate_id IN (
      SELECT c.id FROM public.candidates c WHERE c.user_id = auth.uid()
    )
  );

-- candidate_view_stats: candidates can SELECT their own stats
DROP POLICY IF EXISTS cvs_candidate_select ON public.candidate_view_stats;
CREATE POLICY cvs_candidate_select ON public.candidate_view_stats
  FOR SELECT
  USING (
    candidate_id IN (
      SELECT c.id FROM public.candidates c WHERE c.user_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════
-- 5. Verify
-- ═══════════════════════════════════════════════════
-- After running, test with:
-- INSERT INTO profile_view_events (candidate_id, hr_profile_id, company_id)
-- VALUES (YOUR_CANDIDATE_ID, YOUR_HR_UUID, YOUR_COMPANY_ID);
-- Then check: SELECT * FROM candidate_view_stats WHERE candidate_id = YOUR_CANDIDATE_ID;
