-- ════════════════════════════════════════════════════════════════════
-- A26: SECURITY DEFINER search_path Hardening (T3 security fix)
-- Reform v3.4 — 11 May 2026
--
-- Tetik: P0 audit, 11+ SECURITY DEFINER fonksiyon search_path SET'siz
-- bulundu. Bu SQL injection vector — saldırgan public schema'yı
-- override eden malicious schema oluşturup function içindeki
-- unqualified identifier çağrılarını ele geçirebilir.
--
-- Çözüm: Tüm SECURITY DEFINER fonksiyonlara search_path = public, pg_temp
-- SET'i ekle (CVE-2018-1058 koruma pattern'i).
--
-- Strateji: Dynamic DO block — production'da gerçek eksik fonksiyonları
-- bul, hardcoded liste yerine. Migration apply edildiğinde search_path
-- eksik kalan SECURITY DEFINER fonksiyon kalmaz.
--
-- Safe: Function body değişmez, sadece function-level config eklenir.
-- Rollback gerek yok — search_path SET'i her fonksiyon için en
-- güvenli default'tur.
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- ────────────────────────────────────────────────────────────────────
-- 1. Pre-fix envanter: kaç fonksiyon eksik?
-- ────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  before_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO before_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.prosecdef = TRUE
    AND (
      p.proconfig IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM unnest(p.proconfig) cfg
        WHERE cfg LIKE 'search_path=%'
      )
    );

  RAISE NOTICE '[A26] Pre-fix: % SECURITY DEFINER function w/o search_path', before_count;
END $$;

-- ────────────────────────────────────────────────────────────────────
-- 2. Dynamic fix: tüm eksik SECURITY DEFINER fonksiyonlara ALTER
-- ────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  func_record RECORD;
  fix_count INTEGER := 0;
BEGIN
  FOR func_record IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS func_name,
      pg_get_function_identity_arguments(p.oid) AS func_args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.prosecdef = TRUE
      AND (
        p.proconfig IS NULL
        OR NOT EXISTS (
          SELECT 1 FROM unnest(p.proconfig) cfg
          WHERE cfg LIKE 'search_path=%'
        )
      )
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_temp',
      func_record.schema_name,
      func_record.func_name,
      func_record.func_args
    );

    RAISE NOTICE '[A26] Fixed: %.%(%)',
      func_record.schema_name, func_record.func_name, func_record.func_args;

    fix_count := fix_count + 1;
  END LOOP;

  RAISE NOTICE '[A26] Total fixed: % functions', fix_count;
END $$;

-- ────────────────────────────────────────────────────────────────────
-- 3. Post-fix verify: hiç eksik kalmamalı
-- ────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  remaining_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.prosecdef = TRUE
    AND (
      p.proconfig IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM unnest(p.proconfig) cfg
        WHERE cfg LIKE 'search_path=%'
      )
    );

  IF remaining_count > 0 THEN
    RAISE EXCEPTION '[A26] VERIFY FAILED: % SECURITY DEFINER function still missing search_path', remaining_count;
  ELSE
    RAISE NOTICE '[A26] VERIFY OK: All SECURITY DEFINER functions in public schema have search_path SET';
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────
-- 4. Audit log entry (opsiyonel — hr_profile_audit_log varsa)
-- ────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'hr_profile_audit_log') THEN
    INSERT INTO hr_profile_audit_log (
      event_type, event_subtype, attempt_status, payload, created_at
    )
    VALUES (
      'migration',
      'a26_security_definer_search_path_hardening',
      'success',
      jsonb_build_object(
        'migration', '20260511200950_a26_security_definer_search_path_hardening',
        'description', 'Added search_path=public,pg_temp to SECURITY DEFINER functions',
        'cve_pattern', 'CVE-2018-1058'
      ),
      now()
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '[A26] Audit log entry skipped: %', SQLERRM;
END $$;

COMMIT;

-- ════════════════════════════════════════════════════════════════════
-- Verify post-apply (manuel):
--   SELECT n.nspname, p.proname, p.proconfig
--   FROM pg_proc p
--   JOIN pg_namespace n ON p.pronamespace = n.oid
--   WHERE n.nspname = 'public' AND p.prosecdef = TRUE
--   ORDER BY p.proname;
--
-- Expected: every row has proconfig containing 'search_path=public, pg_temp'
-- ════════════════════════════════════════════════════════════════════
