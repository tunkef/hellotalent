-- K-063: Phone uniqueness — signup time dup check
-- Problem: same phone number can register multiple candidate accounts.
-- Solution: functional unique index (digits-only) + public RPC for pre-signup check.

-- ── 1. Functional unique index on normalized phone (digits-only) ──
-- Handles existing data variations like "0555 123 4567" vs "05551234567".
-- Partial index: skip NULL phones (backfill-friendly).
CREATE UNIQUE INDEX IF NOT EXISTS candidates_telefon_digits_uniq
ON public.candidates ((regexp_replace(telefon, '[^0-9]', '', 'g')))
WHERE telefon IS NOT NULL AND telefon <> '';

-- ── 2. Public RPC for signup pre-check ──
-- Anon/authenticated call this before auth.signUp to show "zaten kayıtlı" UX.
-- SECURITY DEFINER + STABLE — bypasses RLS (read-only, safe).
-- Returns true if phone digits match any existing candidate, false otherwise.
CREATE OR REPLACE FUNCTION public.is_phone_registered(p_phone text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.candidates
    WHERE regexp_replace(telefon, '[^0-9]', '', 'g')
        = regexp_replace(COALESCE(p_phone, ''), '[^0-9]', '', 'g')
      AND telefon IS NOT NULL
      AND telefon <> ''
  );
$$;

-- RLS-free function — explicit grant required
REVOKE ALL ON FUNCTION public.is_phone_registered(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_phone_registered(text) TO anon, authenticated;

COMMENT ON FUNCTION public.is_phone_registered(text) IS
  'K-063: Signup-time phone dup check. Returns true if digits match any existing candidate. Anon-callable for giris-yonlendirme UX.';
