-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Migration: hr_profile_role_flags_admin_guard                          ║
-- ║  Tarih: 2026-05-03  REV-4 (Codex C1+C2 fix)                          ║
-- ║  Tier: T3 — auditor + code-reviewer + Codex zorunlu                   ║
-- ║  Yazar: supabase-agent                                                 ║
-- ╠══════════════════════════════════════════════════════════════════════════╣
-- ║  Bug A18: hr_update policy → kullanıcı kendi employer_role'unu         ║
-- ║    viewer→admin yapabilir → is_admin_employer() true → KVKK leak       ║
-- ║                                                                        ║
-- ║  Bug A7: feature_flags->>'paid'=true yazılabilir → Iyzico bypass       ║
-- ║                                                                        ║
-- ║  Auditor A1 HIGH (TOCTOU): WITH CHECK subquery concurrent exploit →    ║
-- ║    FIX: BEFORE UPDATE trigger (immutability kernel-level)              ║
-- ║                                                                        ║
-- ║  Auditor A2 HIGH (cross-company): admin policy satır filtresi yok →   ║
-- ║    FIX: USING/WITH CHECK'e company_id eşleşme guard eklendi           ║
-- ║                                                                        ║
-- ║  Auditor N1 MEDIUM (admin→admin sabotaj): admin başka admin'in         ║
-- ║    role/flags'ını değiştirebilir → lock-out + sabotaj riski           ║
-- ║    FIX: trigger'da OLD.employer_role='admin' ise → reject             ║
-- ║         service_role bypass: auth.uid() IS NULL → RETURN NEW          ║
-- ║                                                                        ║
-- ║  Codex C1 BLOCKER (company_id exploit): admin kendi company_id'sini   ║
-- ║    UPDATE ederse cross-company guard subquery yeni company'yi okur →   ║
-- ║    başka company satırlarına erişir → A2 fix tam kapanmamış           ║
-- ║    FIX: trigger'a company_id IMMUTABLE branch eklendi (herkes için)   ║
-- ║    Rotasyon: service_role SQL Editor veya yeni migration               ║
-- ║                                                                        ║
-- ║  Codex C2 LOW (rollback GRANT eksik): GRANT UPDATE bu migration'da    ║
-- ║    ilk kez ekleniyor (önceki migration'larda yok — grep doğruladı)    ║
-- ║    FIX: rollback'e REVOKE UPDATE eklendi                              ║
-- ║                                                                        ║
-- ║  Kapsam dışı:                                                          ║
-- ║    - save_onboarding_step RPC: SECURITY DEFINER, employer_role/        ║
-- ║      feature_flags whitelist'e girmemiş → güvenli, dokunma           ║
-- ║    - register_employer RPC: SECURITY DEFINER, INSERT'te company_id    ║
-- ║      set eder → BEFORE INSERT trigger değil, BEFORE UPDATE → güvenli  ║
-- ║    - Edge Functions: company_id yazmıyor → güvenli                    ║
-- ║    - Test seed scripts: service_role → auth.uid() NULL bypass → güvenli
-- ║                                                                        ║
-- ║  APPLY YOK — dry-run. Tuna onayı sonrası: npm run db:push --linked    ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════
-- 1. Mevcut permissive UPDATE policy'yi kaldır
-- ═══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS hr_update ON hr_profiles;
DROP POLICY IF EXISTS hr_profiles_update_own ON hr_profiles;
DROP POLICY IF EXISTS hr_profiles_update_admin ON hr_profiles;

-- ═══════════════════════════════════════════════════════════
-- 2. A1+C1 FIX — BEFORE UPDATE trigger: company_id + employer_role
--    + feature_flags immutability.
--
--    C1 BLOCKER FIX: company_id herkes için IMMUTABLE.
--      Saldırı: admin kendi company_id'sini değiştirir → cross-company
--      guard subquery yeni company'yi okur → başka company'ye erişim.
--      Rotasyon gerekirse: service_role SQL Editor veya yeni migration.
--
--    SECURITY DEFINER: is_admin_employer() çağırır.
--    Recursive risk YOK: trigger DML (UPDATE) tetikler, function
--    içinde DML yok → özyineleme girişi olmaz.
--
--    N1 FIX: OLD.employer_role = 'admin' satır koruma.
--      - Admin kendi role/flags → reject (lock-out önleme)
--      - Admin başka admin'in role/flags → reject (sabotaj engeli)
--      - Admin başka non-admin'in role/flags → izin (yetki yönetimi)
--
--    SERVICE_ROLE BYPASS: auth.uid() IS NULL → RETURN NEW
--      - service_role context'te auth.uid() NULL döner
--      - Iyzico setup, seed script, manuel rotasyon için gerekli
--
--    Performans: her UPDATE'te sıralı 4x IS DISTINCT FROM (scalar, ~0.1ms).
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION hr_profiles_freeze_sensitive_fields()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- ── 0. service_role bypass ──────────────────────────────────
  -- service_role context'te auth.uid() NULL → kısıtlama yok.
  -- Iyzico, seed script, manuel rotation bu path'i kullanır.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- ── 1. company_id IMMUTABLE — admin dahil herkes için ───────
  -- Codex C1 fix: cross-company guard subquery exploit kapatıldı.
  -- Değişim gerekirse: service_role SQL Editor veya yeni migration.
  IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
    RAISE EXCEPTION 'company_id değiştirilemez (service_role veya migration gerekli)'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- ── 2. Non-admin: kendi sensitive field'larını değiştiremez ─
  IF NOT is_admin_employer() THEN
    IF NEW.employer_role IS DISTINCT FROM OLD.employer_role THEN
      RAISE EXCEPTION 'employer_role değiştirilemez (admin yetkisi gerekli)'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.feature_flags IS DISTINCT FROM OLD.feature_flags THEN
      RAISE EXCEPTION 'feature_flags değiştirilemez (admin yetkisi gerekli)'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    RETURN NEW;
  END IF;

  -- ── 3. Admin path: hedef satır admin ise → reject ───────────
  -- Hem "kendi satırım" hem "başka admin" bu branch'e girer.
  -- Kural: admin'in role/flags'ı service_role dışı değiştirilemez.
  IF OLD.employer_role = 'admin'
     AND (NEW.employer_role IS DISTINCT FROM OLD.employer_role
          OR NEW.feature_flags IS DISTINCT FROM OLD.feature_flags) THEN
    RAISE EXCEPTION 'Admin role/flags değiştirilemez (service_role rotation gerekli)'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- ── 4. Admin → non-admin hedef: izin ────────────────────────
  RETURN NEW;
END;
$$;

-- Trigger idempotent: önce drop
DROP TRIGGER IF EXISTS hr_profiles_freeze_sensitive_trg ON hr_profiles;

CREATE TRIGGER hr_profiles_freeze_sensitive_trg
  BEFORE UPDATE ON hr_profiles
  FOR EACH ROW
  EXECUTE FUNCTION hr_profiles_freeze_sensitive_fields();

-- ═══════════════════════════════════════════════════════════
-- 3. Güvenli UPDATE policy — own row (trigger enforcement sonrası
--    policy sade kalır, subquery TOCTOU riski yok)
-- ═══════════════════════════════════════════════════════════
CREATE POLICY hr_profiles_update_own ON hr_profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ═══════════════════════════════════════════════════════════
-- 4. A2 FIX — Admin policy: cross-company guard
--    Admin sadece kendi company_id'sindeki satırları değiştirebilir.
--    Kendi satırı (id = auth.uid()) her zaman dahil.
--
--    NOT: auth.users SELECT yasak (migration 062 pattern).
--    company_id join hr_profiles üzerinden yapılır.
--    Subquery scalar, IS ile karşılaştırma yok → TOCTOU riski düşük
--    (admin path, non-admin path trigger tarafından zaten kilitli).
-- ═══════════════════════════════════════════════════════════
CREATE POLICY hr_profiles_update_admin ON hr_profiles
  FOR UPDATE
  TO authenticated
  USING (
    is_admin_employer()
    AND (
      id = auth.uid()
      OR (
        SELECT company_id FROM hr_profiles WHERE id = auth.uid()
      ) = company_id
    )
  )
  WITH CHECK (
    is_admin_employer()
    AND (
      id = auth.uid()
      OR (
        SELECT company_id FROM hr_profiles WHERE id = auth.uid()
      ) = company_id
    )
  );

-- ═══════════════════════════════════════════════════════════
-- 5. GRANT (idempotent)
-- ═══════════════════════════════════════════════════════════
GRANT UPDATE ON hr_profiles TO authenticated;

-- ═══════════════════════════════════════════════════════════
-- ROLLBACK PLANI (REV-4)
-- ═══════════════════════════════════════════════════════════
-- DROP TRIGGER IF EXISTS hr_profiles_freeze_sensitive_trg ON hr_profiles;
-- DROP FUNCTION IF EXISTS hr_profiles_freeze_sensitive_fields();
-- DROP POLICY IF EXISTS hr_profiles_update_own ON hr_profiles;
-- DROP POLICY IF EXISTS hr_profiles_update_admin ON hr_profiles;
-- -- C2 fix: GRANT UPDATE bu migration'da ilk kez eklendi (önceki migration'larda yok).
-- -- Rollback'te fazla yetki kalmaması için REVOKE:
-- REVOKE UPDATE ON hr_profiles FROM authenticated;
-- -- Eski permissive policy geri:
-- CREATE POLICY hr_update ON hr_profiles FOR UPDATE
--   TO authenticated
--   USING (auth.uid() = id)
--   WITH CHECK (auth.uid() = id);
--
-- NOT: company_id değişimi gerekirse rollback sonrası bile
-- service_role SQL Editor kullanılmalı (trigger droplanmış olur → güvenli).
--
-- UAT KOMUTLARI (6 senaryo — production'da service_role SQL Editor ile çalıştır)
--
-- Senaryo 1: Admin kendi ad/telefon güncellemesi → GEÇMELİ
--   UPDATE hr_profiles SET full_name='Tuna K' WHERE id = '<admin_uid>';
--
-- Senaryo 2: Admin → non-admin employer_role yükseltme → GEÇMELİ
--   UPDATE hr_profiles SET employer_role='admin' WHERE id = '<recruiter_uid>';
--   (auth.uid() = admin, OLD.employer_role = 'recruiter')
--
-- Senaryo 3: Admin → başka admin'in feature_flags değiştirmesi → REDDEDİLMELİ
--   UPDATE hr_profiles SET feature_flags='{"paid":true}' WHERE id = '<other_admin_uid>';
--   Beklenen hata: "Admin role/flags değiştirilemez"
--
-- Senaryo 4: Admin kendi employer_role'unu düşürmesi → REDDEDİLMELİ
--   UPDATE hr_profiles SET employer_role='viewer' WHERE id = '<admin_uid>';
--   Beklenen hata: "Admin role/flags değiştirilemez"
--
-- Senaryo 5: service_role employer_role rotasyonu → GEÇMELİ
--   -- SQL Editor'de (service_role context, auth.uid() NULL):
--   UPDATE hr_profiles SET employer_role='viewer' WHERE id = '<admin_uid>';
--   Beklenen: başarı (service_role bypass aktif)
--
-- Senaryo 6 (C1 yeni): Admin kendi company_id değiştirme → REDDEDİLMELİ
--   UPDATE hr_profiles SET company_id=99 WHERE id = '<admin_uid>';
--   Beklenen hata: "company_id değiştirilemez"
--   (service_role context → başarılı, authenticated context → reject)
