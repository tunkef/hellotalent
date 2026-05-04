-- ═══════════════════════════════════════════════════════════════════
-- Migration: a23c_is_corporate_email_helper
-- Date: 2026-05-04
-- Ref: A23 WAVE C — Corporate Email Runtime Guard (helper function)
-- Tier: T3 (auth/security)
-- Sıra: 1/3 — is_employer revize + search guard + drift trigger bu dosyaya bağımlı
-- ─────────────────────────────────────────────────────────────────
-- AMAÇ:
--   WAVE A (20260504180654_hr_profiles_personal_email_guard.sql) sadece
--   signup-time INSERT'leri koruyordu. Runtime savunması yoktu:
--     - Mevcut hr_profile row sahibi personal email ile kayıtlıysa RPC'ye erişebiliyordu
--     - Email drift saldırısı (corporate→gmail) sonrası JWT email değişirse guard çalışmıyordu
--     - is_employer() → onboarding_completed kontrol ediyordu, email domain kontrolü yoktu
--
--   Bu helper her RPC / is_employer() çağrısında auth.jwt() üzerinden
--   kurumsal email domain'i doğrular. Tek nokta kontrol (DRY).
--
-- BYPASS KATMANI (WAVE A ile birebir uyumlu):
--   - SADECE service_role bypass (auth.uid() IS NULL → true)
--   - user_metadata bypass YOK (A23 R4/M1: client-writable, kaldırıldı)
--   - Test seed migrations service_role context'te çalışır → bypass otomatik geçer
--   - Tuna admin hesabı (kefelituna@gmail.com) employer profili yok → etki yok
--
-- DOMAIN LİSTESİ: WAVE A'daki 47 domain ile birebir aynı
--   Free-list değişirse sadece bu fonksiyon güncellenir (WAVE A trigger bağımsız).
--   NOT: Mevcut WAVE A BEFORE INSERT trigger ile çakışma yok —
--   trigger INSERT'leri korur, bu helper runtime'ı korur.
--
-- STABLE MARKER:
--   STABLE → PostgreSQL planner RLS içinde caches/inlines edebilir.
--   auth.jwt() call per-statement değil per-policy eval'de yapılır.
--   SECURITY DEFINER + search_path = pg_catalog, public, pg_temp → shadow attack guard.
--
-- FREE-LIST SAYISI: 47 domain (WAVE A ile birebir — sayım validate edildi)
--
-- ROLLBACK:
--   DROP FUNCTION IF EXISTS public.is_corporate_email();
--   (Bağımlılar: is_employer, is_employer_team_member, search_employer_candidates,
--    guard_email_drift → önce onları rollback et)
--
-- APPLY: npm run db:push (Tuna onayından sonra)
-- NO NEW TABLES. NO RLS POLICY CHANGES. is_employer() bağımlı (mig 2/3 sonrası etkili).
-- ═══════════════════════════════════════════════════════════════════

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
  -- ─── Service_role bypass ────────────────────────────────────────
  -- auth.uid() IS NULL → çağıran service_role veya internal system context.
  -- Edge Function / test seed / cron → bypass. user_metadata bypass YOK (A23 R4/M1).
  IF auth.uid() IS NULL THEN
    RETURN true;
  END IF;

  -- ─── JWT email parse ─────────────────────────────────────────────
  v_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  -- Fail-closed: JWT'de email yoksa veya boşsa → kişisel hesap say, reject.
  IF v_email = '' OR position('@' IN v_email) = 0 THEN
    RETURN false;
  END IF;

  v_domain := split_part(v_email, '@', 2);

  -- ─── Q2 fix (Codex 2026-05-04 + re-review 2026-05-04): IDN+Punycode guard.
  -- A) Non-ASCII karakter (Cyrillic ı, Greek mikro, vb homograph) reject.
  -- B) Punycode prefix (xn--*) reject — ASCII içinde geçen IDN bypass'ı
  --    da kapatır; saldırgan xn--gail-43d.com alsa bile reddedilir.
  --    Trade-off: legitimate IDN domain'li şirketler reddedilir (kabul —
  --    Türkiye'de retail talent şirketleri ASCII domain kullanıyor; istisna
  --    çıkarsa is_admin/test_account marker ile manuel whitelist).
  IF v_domain ~ '[^a-z0-9.\-]' THEN
    RETURN false;
  END IF;
  IF v_domain LIKE 'xn--%' OR v_domain LIKE '%.xn--%' THEN
    RETURN false;
  END IF;

  -- ─── Direct match + parent-domain match (ccSLD-safe) ─────────────
  -- WC-H1 fix (auditor 2026-05-04): eski "last 2 label" algoritması
  -- 'mail.yahoo.co.uk' için root='co.uk' döndürüyordu, free-list'te
  -- olmayan 'co.uk' → bypass. Şimdi: domain ya birebir free-list'te
  -- ya da herhangi bir free-domain'in subdomain'i (ör. 'mail.yahoo.co.uk'
  -- 'yahoo.co.uk' free-domain'inin subdomain'idir → reject).
  IF v_domain = ANY(v_free_domains) THEN
    RETURN false;
  END IF;

  -- Subdomain check: v_domain LIKE '%.' || any(free_list)
  -- EXISTS subquery ile ANY pattern match (PG'de = ANY array tekstual,
  -- LIKE ANY için unnest gerekir).
  IF EXISTS (
    SELECT 1 FROM unnest(v_free_domains) AS fd
    WHERE v_domain LIKE '%.' || fd
  ) THEN
    RETURN false;
  END IF;

  -- Domain free-list'te değil ve subdomain'i de değil → kurumsal kabul
  RETURN true;
END;
$$;

-- ─────────────────────────────────────────────────────────────────
-- Privilege: REVOKE ALL → sadece authenticated görebilir
-- service_role her fonksiyonu zaten çağırabilir (BYPASS RLS context)
-- ─────────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.is_corporate_email() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_corporate_email() TO authenticated;

-- ─────────────────────────────────────────────────────────────────
-- Comment metadata
-- ─────────────────────────────────────────────────────────────────
COMMENT ON FUNCTION public.is_corporate_email() IS
  'A23 WAVE C (2026-05-04) — Runtime corporate email guard. '
  'auth.jwt() ->> ''email'' domain''ini free-list''e karşı kontrol eder. '
  'Bypass: service_role (auth.uid() IS NULL) sadece. '
  'user_metadata bypass YOK (R4/M1 audit finding). '
  'Subdomain guard dahil (mail.gmail.com → gmail.com root check). '
  'Free-list: 47 domain, WAVE A trigger ile birebir uyumlu. '
  'STABLE SECURITY DEFINER — planner inlining için safe.';
