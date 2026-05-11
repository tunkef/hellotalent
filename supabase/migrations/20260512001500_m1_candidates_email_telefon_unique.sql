-- ════════════════════════════════════════════════════════════════════
-- M1: candidates.email + telefon UNIQUE Constraint
-- Reform v3.4 — 12 May 2026 (MEDIUM batch)
--
-- Tetik: P1.3 audit, candidates tablosunda email/telefon UNIQUE yok.
-- Risk: duplicate kayıt (KVKK md.4 doğruluk ihlali), işveren arama
-- duplicate sonuç, email/SMS spam riski.
--
-- Çözüm: case-insensitive UNIQUE index (lower(email)). NULL allowed
-- (account oluşur sonra email girilir).
--
-- Pre-flight: mevcut duplicate var mı detect — varsa migration FAIL.
-- Tuna manuel cleanup sonra retry.
--
-- Spec: docs/specs/candidates-unique-constraints.md
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- 1. Pre-fix duplicate detect (audit log)
DO $$
DECLARE
  dup_email INT;
  dup_phone INT;
BEGIN
  SELECT COUNT(*) INTO dup_email FROM (
    SELECT lower(email) AS e
    FROM candidates
    WHERE email IS NOT NULL AND email <> ''
    GROUP BY lower(email)
    HAVING COUNT(*) > 1
  ) x;

  SELECT COUNT(*) INTO dup_phone FROM (
    SELECT telefon AS p
    FROM candidates
    WHERE telefon IS NOT NULL AND telefon <> ''
    GROUP BY telefon
    HAVING COUNT(*) > 1
  ) y;

  RAISE NOTICE '[M1] Pre-fix duplicate detect: email=%, phone=%', dup_email, dup_phone;

  IF dup_email > 0 THEN
    RAISE EXCEPTION '[M1] Email duplicate var (count=%). Önce manuel cleanup, sonra retry.', dup_email;
  END IF;

  IF dup_phone > 0 THEN
    RAISE EXCEPTION '[M1] Telefon duplicate var (count=%). Önce manuel cleanup, sonra retry.', dup_phone;
  END IF;
END $$;

-- 2. Email UNIQUE index (case-insensitive, partial)
CREATE UNIQUE INDEX IF NOT EXISTS candidates_email_unique_idx
  ON candidates (lower(email))
  WHERE email IS NOT NULL AND email <> '';

COMMENT ON INDEX candidates_email_unique_idx IS
  'M1 (Reform v3.4): aday email tekilliği. NULL/empty allowed. case-insensitive (lower).';

-- 3. Telefon UNIQUE index (partial)
CREATE UNIQUE INDEX IF NOT EXISTS candidates_telefon_unique_idx
  ON candidates (telefon)
  WHERE telefon IS NOT NULL AND telefon <> '';

COMMENT ON INDEX candidates_telefon_unique_idx IS
  'M1 (Reform v3.4): aday telefon tekilliği. NULL/empty allowed.';

-- 4. Post-fix verify
DO $$
DECLARE
  email_idx_exists BOOLEAN;
  phone_idx_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'candidates'
      AND indexname = 'candidates_email_unique_idx'
  ) INTO email_idx_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'candidates'
      AND indexname = 'candidates_telefon_unique_idx'
  ) INTO phone_idx_exists;

  IF NOT email_idx_exists OR NOT phone_idx_exists THEN
    RAISE EXCEPTION '[M1] VERIFY FAILED: email_idx=%, phone_idx=%', email_idx_exists, phone_idx_exists;
  END IF;

  RAISE NOTICE '[M1] VERIFY OK: both unique indexes created';
END $$;

COMMIT;

-- ════════════════════════════════════════════════════════════════════
-- Rollback:
--   DROP INDEX IF EXISTS candidates_email_unique_idx;
--   DROP INDEX IF EXISTS candidates_telefon_unique_idx;
--
-- Verify post-apply (manuel):
--   SELECT indexname, indexdef FROM pg_indexes
--   WHERE tablename = 'candidates' AND indexname LIKE '%unique%';
-- ════════════════════════════════════════════════════════════════════
