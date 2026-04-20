-- K-063 follow-up: phone normalize son 10 digit
-- Problem: candidates.telefon'da inconsistent format — bazıları "05551234567" (11), bazıları "5551234567" (10).
-- Eski functional index + RPC tam digit-string eşleşiyordu → "05551234567" vs "5551234567" miss oluyordu.
-- Fix: normalize = son 10 digit (leading 0 yok sayılır).

-- ── 1. Eski index drop ──
DROP INDEX IF EXISTS public.candidates_telefon_digits_uniq;

-- ── 2. Yeni functional unique index — son 10 digit ──
CREATE UNIQUE INDEX IF NOT EXISTS candidates_telefon_last10_uniq
ON public.candidates ((RIGHT(regexp_replace(telefon, '[^0-9]', '', 'g'), 10)))
WHERE telefon IS NOT NULL AND telefon <> '';

-- ── 3. RPC normalize güncelle ──
CREATE OR REPLACE FUNCTION public.is_phone_registered(p_phone text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.candidates
    WHERE telefon IS NOT NULL
      AND telefon <> ''
      AND LENGTH(regexp_replace(COALESCE(p_phone, ''), '[^0-9]', '', 'g')) >= 10
      AND RIGHT(regexp_replace(telefon, '[^0-9]', '', 'g'), 10)
        = RIGHT(regexp_replace(COALESCE(p_phone, ''), '[^0-9]', '', 'g'), 10)
  );
$$;

COMMENT ON FUNCTION public.is_phone_registered(text) IS
  'K-063: Signup-time phone dup check. Last 10 digits compared (leading 0 tolerant).';
