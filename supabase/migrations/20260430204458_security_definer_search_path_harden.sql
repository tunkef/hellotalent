-- ═══════════════════════════════════════════════════════════════════
-- Migration: security_definer_search_path_harden
-- Date: 2026-04-30
-- Ref: A14 (A11 W4 Codex T3 tespiti)
-- Sprint: Sprint 7 sonrasi guevenlik hardening
-- ─────────────────────────────────────────────────────────────────
-- AMAC:
--   Sprint 7 migration (20260426012144_hr_pipeline_notes_mvp2.sql)
--   icinde tanimlanan 2 SECURITY DEFINER fonksiyon
--   "SET search_path = public" kullaniyordu. Bu konfiguerasyon
--   pg_temp schema'sinin siranin basina eklenmesine izin verir
--   ve bir saldirganin oturum sueresince gecici nesnelerle
--   (shadow functions/tables) fonksiyon davranisini manipuele
--   etmesine yol acar (pg_temp shadow attack vector).
--
-- DEGISIKLIK:
--   SET search_path = public
--   →
--   SET search_path = pg_catalog, public, pg_temp
--
--   pg_catalog: built-in PostgreSQL nesneleri (guevenli)
--   public:     uygulama tablolari/fonksiyonlari
--   pg_temp:    gecici nesneleri EN SONA koyarak shadow attack engellenir
--
--   Bu siralama ile public/pg_catalog nesneleri once bulunur;
--   saldirgan pg_temp'te shadow olustursa bile arama public'te
--   tamamlandiginda durur. A11 W4 pattern ile tutarli.
--   SECURITY DEFINER best practice (Supabase docs + A11 W4 Codex fix).
--
-- ETKILENEN FONKSIYONLAR:
--   1. is_employer_team_member(uuid) RETURNS boolean
--      Kaynak: 20260426012144 line 144-158
--   2. is_paid_employer() RETURNS boolean
--      Kaynak: 20260426012144 line 258-273
--
-- BODY DEGISIKLIGI: YOK — sadece search_path clause guncellendi.
-- GRANT/REVOKE: CREATE OR REPLACE PostgreSQL'de mevcut privilege'lari
--   korur; tutarlilik icin REVOKE + GRANT aynen tekrarlaniyor.
--
-- ROLLBACK:
--   CREATE OR REPLACE FUNCTION ile eski search_path geri yuklenebilir:
--   SET search_path = public   (eski hali)
--   Referans: 20260426012144_hr_pipeline_notes_mvp2.sql line 149, 263
--
-- APPLY: npm run db:push (sadece Tuna onayindan sonra)
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- 1. is_employer_team_member — pg_temp shadow hardening
-- ─────────────────────────────────────────────────────────────────
-- Body: 20260426012144 live'dan kopyalandi (pg_proc.prosrc verify edildi).
-- Degisen sadece: SET search_path satirindaki deger.
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION is_employer_team_member(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM hr_profiles hp1
    JOIN hr_profiles hp2 ON hp1.company_id = hp2.company_id
    WHERE hp1.id = auth.uid()
      AND hp2.id = p_user_id
  );
$$;

REVOKE ALL ON FUNCTION is_employer_team_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_employer_team_member(uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────
-- 2. is_paid_employer — pg_temp shadow hardening
-- ─────────────────────────────────────────────────────────────────
-- Body: 20260426012144 live'dan kopyalandi (pg_proc.prosrc verify edildi).
-- Degisen sadece: SET search_path satirindaki deger.
-- A7 paywall bypass guard bu fonksiyona bagimlidir;
-- Iyzico entegrasyonu oncesi bu fix zorunludur.
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION is_paid_employer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
  SELECT COALESCE(
    (
      SELECT (hp.feature_flags ->> 'paid')::boolean
      FROM hr_profiles hp
      WHERE hp.id = auth.uid()
    ),
    false
  );
$$;

REVOKE ALL ON FUNCTION is_paid_employer() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_paid_employer() TO authenticated;
