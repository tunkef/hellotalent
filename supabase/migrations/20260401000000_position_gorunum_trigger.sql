-- Migration: position_gorunum_trigger
-- Increment positions.gorunum when a candidate profile is viewed in position context.
-- Triggered by profile_view_events INSERT when position_id IS NOT NULL.
-- This is the canonical source for the Görüntüleme metric on position cards.

CREATE OR REPLACE FUNCTION public.increment_position_gorunum_on_view()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.position_id IS NOT NULL THEN
    UPDATE public.positions
    SET gorunum = gorunum + 1
    WHERE id = NEW.position_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_increment_position_gorunum ON public.profile_view_events;
CREATE TRIGGER trg_increment_position_gorunum
  AFTER INSERT ON public.profile_view_events
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_position_gorunum_on_view();
