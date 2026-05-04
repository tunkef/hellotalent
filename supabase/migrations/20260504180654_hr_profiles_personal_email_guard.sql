-- ═══════════════════════════════════════════════════════════════════
-- Migration: hr_profiles_personal_email_guard
-- Date: 2026-05-04
-- Ref: A23 — Kurumsal email zorunluluğu (free providers reject)
-- Tier: T3 (auth/security)
-- ─────────────────────────────────────────────────────────────────
-- AMAÇ:
--   uye-ol.html'de yıllarca sadece "warning" gösteren freeProviders
--   listesi submit'i blokemiyordu. Tuna kefelituna@gmail.com gibi
--   kişisel email ile employer signup yapabiliyordu (BUG 1, asıl bug).
--
--   Bu migration server-side fail-closed defense:
--   hr_profiles BEFORE INSERT trigger — kullanıcının auth.jwt()
--   email domain'i free provider listesindeyse RAISE EXCEPTION.
--
--   Frontend (uye-ol.html) ayrıca hard-block alır (UX). Server bu
--   trigger ile son söz sahibi (client bypass'ı engeller).
--
-- DEFENSE-IN-DEPTH:
--   - L1 (UI): uye-ol.html validateKurumsalForm — submit disabled
--   - L2 (Server, bu migration): BEFORE INSERT trigger — RAISE EXC
--   - L3 (audit): mevcut hr_profiles'da 0 free-provider row (temiz)
--
-- BYPASS YOLLARI (bilinçli):
--   1. service_role (auth.uid() NULL) — Edge Function/system insert
--   Tek bypass yolu service_role. user_metadata bypass'ları KALDIRILDI
--   (R4 review finding 2026-05-04): user_metadata client-writable
--   (signup options.data) → saldırgan is_admin/test_account flag'i
--   set ederek trigger bypass yapabilir. app_metadata da Auth hooks
--   ile dolduruluyor ama yine de risk var, en güvenli: tek bypass = service_role.
--   Test seed migrations zaten service_role context'te çalışır → trigger geçer.
--
-- AUDIT (2026-05-04):
--   SELECT count(*) FROM hr_profiles WHERE email free-provider → 0 row.
--   Migration apply geriye dönük etki yok, sadece YENİ INSERT'leri etkiler.
--
-- ROLLBACK:
--   DROP TRIGGER hr_profiles_personal_email_guard ON hr_profiles;
--   DROP FUNCTION public.guard_employer_personal_email();
--
-- APPLY: npm run db:push (Tuna onayından sonra)
-- NO NEW TABLES. NO RLS CHANGES. NO GRANTS.
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.guard_employer_personal_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_email       text;
  v_domain      text;
  v_root_domain text;  -- subdomain bypass guard (mail.gmail.com → gmail.com)
  v_free_domains text[] := ARRAY[
    -- Google
    'gmail.com', 'googlemail.com',
    -- Microsoft
    'hotmail.com', 'hotmail.co.uk', 'hotmail.fr', 'hotmail.de',
    'outlook.com', 'outlook.com.tr', 'live.com', 'live.com.tr', 'msn.com',
    -- Yahoo
    'yahoo.com', 'yahoo.co.uk', 'yahoo.fr', 'yahoo.de', 'yahoo.com.tr',
    'ymail.com', 'rocketmail.com',
    -- Yandex / Mail.ru
    'yandex.com', 'yandex.ru', 'yandex.com.tr', 'mail.ru',
    -- Apple
    'icloud.com', 'me.com', 'mac.com',
    -- Privacy / Niche
    'protonmail.com', 'proton.me', 'pm.me',
    'tutanota.com', 'tutanota.de', 'tuta.io',
    'duck.com', 'hey.com',
    -- Other free
    'mail.com', 'aol.com', 'gmx.com', 'gmx.net', 'gmx.de',
    'zoho.com', 'zohomail.com', 'fastmail.com',
    -- Turkish ISP free addresses (eski-tip)
    'mynet.com', 'superonline.com', 'ttmail.com'
  ];
BEGIN
  -- ─── Tek bypass: service_role / system insert ───────────────────
  -- A23 audit (R4/A23-M1, 2026-05-04): user_metadata bypass'ları
  -- KALDIRILDI çünkü client-writable. Saldırgan signup options.data'da
  -- is_admin='true' veya test_account=true gönderirse trigger atlardı.
  -- Tek güvenli bypass: service_role (auth.uid() NULL) — test seed
  -- migrations zaten service_role context'te çalışır.
  -- Tuna admin hesabı kefelituna@gmail.com aday, employer signup için
  -- corporate email (peoplein.com.tr) kullanır → bypass gerekmez.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- ─── Asıl guard ─────────────────────────────────────────────────
  v_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  -- Fail-closed: JWT'de email yoksa kurumsal hesap açma.
  IF v_email = '' OR position('@' in v_email) = 0 THEN
    RAISE EXCEPTION 'Kurumsal hesap için doğrulanmış email gerekli.'
      USING ERRCODE = 'check_violation',
            HINT    = 'Email doğrulamasını tamamla, sonra tekrar dene.';
  END IF;

  v_domain := split_part(v_email, '@', 2);

  -- Q2 fix (Codex 2026-05-04 + re-review): IDN homograph + Punycode guard.
  -- Non-ASCII karakter VE xn--* prefix (Punycode IDN) reject.
  IF v_domain ~ '[^a-z0-9.\-]' OR v_domain LIKE 'xn--%' OR v_domain LIKE '%.xn--%' THEN
    RAISE EXCEPTION 'Geçersiz email domain.'
      USING ERRCODE = 'check_violation',
            HINT    = 'ASCII şirket domain''li email kullan.';
  END IF;

  -- Direct match
  IF v_domain = ANY(v_free_domains) THEN
    RAISE EXCEPTION 'Kurumsal hesap için kurumsal (şirket domain''li) email gerekli. Kişisel email sağlayıcıları (gmail, hotmail, yahoo vb.) ile İK hesabı açılamaz.'
      USING ERRCODE = 'check_violation',
            HINT    = 'Şirket domain''li email kullan (ör. ad@sirketin.com).';
  END IF;

  -- Subdomain bypass guard — ccSLD safe (WC-H1 fix, 2026-05-04):
  -- mail.gmail.com, mail.yahoo.co.uk gibi subdomain'leri yakala.
  -- LIKE '%.' || free_domain pattern → ccSLD ('co.uk' false-positive yok).
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
-- Trigger: BEFORE INSERT — sadece yeni hr_profiles row'larını etkiler
-- ─────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS hr_profiles_personal_email_guard ON public.hr_profiles;

CREATE TRIGGER hr_profiles_personal_email_guard
  BEFORE INSERT ON public.hr_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_employer_personal_email();

-- ─────────────────────────────────────────────────────────────────
-- Comment metadata
-- ─────────────────────────────────────────────────────────────────
COMMENT ON FUNCTION public.guard_employer_personal_email() IS
  'A23 (2026-05-04) — Free provider email reject for employer signup. '
  'Bypass: service_role, test_account=true, is_admin=true. '
  'Audit: hr_profiles 2026-05-04 → 0 affected rows.';

COMMENT ON TRIGGER hr_profiles_personal_email_guard ON public.hr_profiles IS
  'A23 — BEFORE INSERT defense for personal email signup. Tier T3.';
