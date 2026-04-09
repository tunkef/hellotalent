-- SEC-3: KVKK consent audit log — tamper-resistant, server-side timestamps
-- DEPLOYED: 9 Nisan 2026

CREATE TABLE IF NOT EXISTS public.consent_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type text NOT NULL CHECK (consent_type IN ('privacy_terms', 'kvkk_explicit', 'age_confirmed')),
  granted boolean NOT NULL DEFAULT true,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.consent_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY consent_log_select_own ON public.consent_log FOR SELECT USING (auth.uid() = user_id);
GRANT SELECT ON public.consent_log TO authenticated;
CREATE INDEX IF NOT EXISTS idx_consent_log_user_id ON public.consent_log(user_id);

CREATE OR REPLACE FUNCTION public.log_consent_on_signup()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.raw_user_meta_data->>'privacy_consent_at' IS NOT NULL THEN
    INSERT INTO public.consent_log (user_id, consent_type, granted) VALUES (NEW.id, 'privacy_terms', true);
  END IF;
  IF NEW.raw_user_meta_data->>'kvkk_explicit_consent_at' IS NOT NULL THEN
    INSERT INTO public.consent_log (user_id, consent_type, granted) VALUES (NEW.id, 'kvkk_explicit', true);
  END IF;
  IF (NEW.raw_user_meta_data->>'age_confirmed')::boolean IS TRUE THEN
    INSERT INTO public.consent_log (user_id, consent_type, granted) VALUES (NEW.id, 'age_confirmed', true);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_log_consent_on_signup ON auth.users;
CREATE TRIGGER trg_log_consent_on_signup
  AFTER INSERT ON auth.users FOR EACH ROW
  EXECUTE FUNCTION public.log_consent_on_signup();
