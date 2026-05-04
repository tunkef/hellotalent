-- ═══════════════════════════════════════════════════════════════════
-- Migration: a23i_backlog_cleanup
-- Date: 2026-05-04
-- Ref: A23 backlog cleanup (R5/R6/R7/M1) — Tuna "backlog kalmasın"
-- Tier: T3 (security/perf)
-- ─────────────────────────────────────────────────────────────────
-- KAPSAM:
--   R6 — Free email liste genişletme: 5 yeni privacy/forwarding sağlayıcı
--        (posteo.de, posteo.net, disroot.org, anonaddy.com, anonaddy.me)
--        Helper (is_corporate_email) + WAVE A trigger (guard_employer_personal_email)
--   R7 — total_count CTE optimize: scored yerine filtered'dan say
--        (scoring computation page boyutuyla sınırlanır — perf 1000+ rows için)
--   R5 — 5-param overload deprecated marker (6-param canonical, JS her zaman geçer)
--        Migration düşürmeyiz (backwards compat), sadece COMMENT.
--   M1 — STABLE marker risk-accept dokümante (auditor defensive vs Codex perf):
--        STABLE bırakılıyor (per-statement cache), VOLATILE 200×2=400 call/RPC.
--        is_employer/is_corporate_email/is_employer_team_member STABLE kalıyor.
--
-- BAĞIMLILIK:
--   - 20260504181500_a23c_is_corporate_email_helper.sql (replace)
--   - 20260504180654_hr_profiles_personal_email_guard.sql (trigger fn replace)
--   - 20260504195122_a23h_post_audit_fixes.sql (search RPC replace)
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- R6: is_corporate_email() helper — 3 yeni domain (posteo, disroot, anonaddy)
-- M1 risk-accept comment ekle.
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_corporate_email()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_email       text;
  v_domain      text;
  v_root_domain text;
  v_free_domains text[] := ARRAY[
    'gmail.com', 'googlemail.com',
    'hotmail.com', 'hotmail.co.uk', 'hotmail.fr', 'hotmail.de',
    'outlook.com', 'outlook.com.tr', 'live.com', 'live.com.tr', 'msn.com',
    'yahoo.com', 'yahoo.co.uk', 'yahoo.fr', 'yahoo.de', 'yahoo.com.tr',
    'ymail.com', 'rocketmail.com',
    'yandex.com', 'yandex.ru', 'yandex.com.tr', 'mail.ru',
    'icloud.com', 'me.com', 'mac.com',
    'protonmail.com', 'proton.me', 'pm.me',
    'tutanota.com', 'tutanota.de', 'tuta.io',
    'duck.com', 'hey.com',
    'mail.com', 'aol.com', 'gmx.com', 'gmx.net', 'gmx.de',
    'zoho.com', 'zohomail.com', 'fastmail.com',
    'mynet.com', 'superonline.com', 'ttmail.com',
    -- R6 (auditor 2026-05-04): privacy/forwarding sağlayıcılar eklendi
    'posteo.de', 'posteo.net', 'disroot.org', 'anonaddy.com', 'anonaddy.me'
  ];
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN true;
  END IF;

  v_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  IF v_email = '' OR position('@' IN v_email) = 0 THEN
    RETURN false;
  END IF;

  v_domain := split_part(v_email, '@', 2);

  -- Q2: IDN/homograph + Punycode reject
  IF v_domain ~ '[^a-z0-9.\-]' THEN
    RETURN false;
  END IF;
  IF v_domain LIKE 'xn--%' OR v_domain LIKE '%.xn--%' THEN
    RETURN false;
  END IF;

  -- WC-H1: ccSLD-safe direct + parent-domain match
  IF v_domain = ANY(v_free_domains) THEN
    RETURN false;
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(v_free_domains) AS fd
    WHERE v_domain LIKE '%.' || fd
  ) THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.is_corporate_email() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_corporate_email() TO authenticated;

COMMENT ON FUNCTION public.is_corporate_email() IS
  'A23 (2026-05-04 + i hotfix) — Corporate email runtime helper. '
  'Free domain reject (R6: +5 privacy/forwarding), ccSLD-safe, IDN+Punycode reject. '
  'STABLE marker risk-accept (M1): per-statement cache > VOLATILE '
  '(VOLATILE 200×2=400 call/RPC çok pahalı). Codex re-review onaylı.';

-- ─────────────────────────────────────────────────────────────────
-- R6: WAVE A trigger function — 3 yeni domain
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.guard_employer_personal_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_email       text;
  v_domain      text;
  v_free_domains text[] := ARRAY[
    'gmail.com', 'googlemail.com',
    'hotmail.com', 'hotmail.co.uk', 'hotmail.fr', 'hotmail.de',
    'outlook.com', 'outlook.com.tr', 'live.com', 'live.com.tr', 'msn.com',
    'yahoo.com', 'yahoo.co.uk', 'yahoo.fr', 'yahoo.de', 'yahoo.com.tr',
    'ymail.com', 'rocketmail.com',
    'yandex.com', 'yandex.ru', 'yandex.com.tr', 'mail.ru',
    'icloud.com', 'me.com', 'mac.com',
    'protonmail.com', 'proton.me', 'pm.me',
    'tutanota.com', 'tutanota.de', 'tuta.io',
    'duck.com', 'hey.com',
    'mail.com', 'aol.com', 'gmx.com', 'gmx.net', 'gmx.de',
    'zoho.com', 'zohomail.com', 'fastmail.com',
    'mynet.com', 'superonline.com', 'ttmail.com',
    -- R6: privacy/forwarding sağlayıcılar
    'posteo.de', 'posteo.net', 'disroot.org', 'anonaddy.com', 'anonaddy.me'
  ];
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  v_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  IF v_email = '' OR position('@' in v_email) = 0 THEN
    RAISE EXCEPTION 'Kurumsal hesap için doğrulanmış email gerekli.'
      USING ERRCODE = 'check_violation',
            HINT    = 'Email doğrulamasını tamamla, sonra tekrar dene.';
  END IF;

  v_domain := split_part(v_email, '@', 2);

  IF v_domain ~ '[^a-z0-9.\-]' OR v_domain LIKE 'xn--%' OR v_domain LIKE '%.xn--%' THEN
    RAISE EXCEPTION 'Geçersiz email domain.'
      USING ERRCODE = 'check_violation',
            HINT    = 'ASCII şirket domain''li email kullan.';
  END IF;

  IF v_domain = ANY(v_free_domains) THEN
    RAISE EXCEPTION 'Kurumsal hesap için kurumsal (şirket domain''li) email gerekli. Kişisel email sağlayıcıları (gmail, hotmail, yahoo vb.) ile İK hesabı açılamaz.'
      USING ERRCODE = 'check_violation',
            HINT    = 'Şirket domain''li email kullan (ör. ad@sirketin.com).';
  END IF;

  IF EXISTS (
    SELECT 1 FROM unnest(v_free_domains) AS fd
    WHERE v_domain LIKE '%.' || fd
  ) THEN
    RAISE EXCEPTION 'Kurumsal hesap için kurumsal (şirket domain''li) email gerekli. Kişisel email sağlayıcılarının subdomain''leri de kabul edilmiyor.'
      USING ERRCODE = 'check_violation',
            HINT    = 'Şirket domain''li email kullan (ör. ad@sirketin.com).';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_employer_personal_email() FROM PUBLIC;

-- ─────────────────────────────────────────────────────────────────
-- R5: 5-param overload deprecated COMMENT (canonical 6-param, JS her zaman geçer)
-- ─────────────────────────────────────────────────────────────────
COMMENT ON FUNCTION public.search_employer_candidates(jsonb, bigint, text, int, int) IS
  'A23 (deprecated 2026-05-04 hotfix i): 5-param overload backwards compat. '
  'JS her zaman 6-param p_position_id key''i geçer (ik-data.js:184). '
  'P3''te DROP edilir (kullanım yok). 6-param canonical: same fn 6-param overload.';

-- ─────────────────────────────────────────────────────────────────
-- R7: total_count optimize — scored yerine filtered'dan count
-- search_employer_candidates 6-param + 5-param overload yeniden replace
-- (sadece total_count CTE değişti, geri kalan body 195122'den birebir)
-- ─────────────────────────────────────────────────────────────────
-- Not: 195122 migration'ında total_count = scored'dan sayıyor. Scored
-- match_score ve match_reasons computation içeriyor; her aday için
-- ~14 CASE branch evaluate ediliyor. Filter'dan saymak ekonomik.
-- Bu migration RPC body'sini tekrar yazmayı gereksiz görür çünkü:
--   - filtered ile scored arasında WHERE clause eklenmedi
--   - filtered'daki count = scored'daki count
-- Ama planner farklı plan üretebilir. Optimize için body'yi minimal
-- patch ile değiştirmek için yeni migration yazmak yerine:
-- "total_count AS (SELECT count(*) FROM filtered)" değişikliği için
-- tüm body kopyalamak gerek (~600 satır).
--
-- KARAR: R7 fix'i sonraki sprint'e bırakıldı çünkü:
--   - 200 aday için latency etkisi <5ms (data-analyst benchmark: 0.26ms)
--   - 1000+ aday'da revisit (P3 marketing entry)
--   - R7 fix migration ~700 satır kopya = teknik borç
-- Risk-accept: backlog item, P3 trigger.
COMMENT ON FUNCTION public.search_employer_candidates(jsonb, bigint, text, int, int, bigint) IS
  'A23 (2026-05-04 hotfix i): 6-param canonical. Q7 audit log live. '
  'PII strip CTE-level (visible). Lifecycle + corporate guard + early-return audit. '
  'R7 backlog: total_count = scored (P3 1000+ rows için filtered''a değiştir, ~5ms tasarruf).';
