-- ╔══════════════════════════════════════════════════════════════╗
-- ║  HelloTalent Migration Template                             ║
-- ║  Bu dosyayı kopyalayıp YYYYMMDDHHMMSS_aciklama.sql olarak  ║
-- ║  kaydet. Tüm bölümler ZORUNLUDUR (istisnalar aşağıda).     ║
-- ╚══════════════════════════════════════════════════════════════╝
--
-- Kullanım:
--   cp TEMPLATE.sql $(date +%Y%m%d%H%M%S)_yeni_tablo.sql
--   npm run db:push

-- ═══════════════════════════════════════════════
-- 1. TABLO OLUŞTUR
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS {tablo_adi} (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  -- candidate_id bigint NOT NULL REFERENCES candidates(id),
  created_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════
-- 2. ROW LEVEL SECURITY (ZORUNLU)
--    Her CREATE TABLE'dan sonra bu satır OLMALIDIR.
--    İstisna: Sadece service_role erişimli tablolar
--    (örn: email_outbox). İstisna varsa sebebini yaz.
-- ═══════════════════════════════════════════════
ALTER TABLE {tablo_adi} ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════
-- 3. POLİCY'LER (ZORUNLU — en az 1)
--    Naming: {tablo}_select_own, {tablo}_insert_own, vs.
--    Candidate: get_my_candidate_id()
--    Employer:  is_employer()
-- ═══════════════════════════════════════════════
CREATE POLICY "{tablo_adi}_select_own"
  ON {tablo_adi} FOR SELECT
  USING (candidate_id = get_my_candidate_id());

CREATE POLICY "{tablo_adi}_insert_own"
  ON {tablo_adi} FOR INSERT
  WITH CHECK (candidate_id = get_my_candidate_id());

CREATE POLICY "{tablo_adi}_update_own"
  ON {tablo_adi} FOR UPDATE
  USING (candidate_id = get_my_candidate_id());

CREATE POLICY "{tablo_adi}_delete_own"
  ON {tablo_adi} FOR DELETE
  USING (candidate_id = get_my_candidate_id());

-- ═══════════════════════════════════════════════
-- 4. GRANT (ZORUNLU)
-- ═══════════════════════════════════════════════
GRANT SELECT, INSERT, UPDATE, DELETE ON {tablo_adi} TO authenticated;

-- ═══════════════════════════════════════════════
-- 5. TUZAK UYARISI
-- ═══════════════════════════════════════════════
-- ⚠️  Policy içinde auth.users tablosuna SELECT YAPMA!
--     coach_invites'ta bu tuzağa düştük (migration 058 → 062 fix).
--     auth.users cross-reference → "permission denied for table users"
--
--     YANLIŞ:  (SELECT email FROM auth.users WHERE id = auth.uid())
--     DOĞRU:   auth.jwt() ->> 'email'
--
--     auth.jwt() her zaman güvenlidir, auth.users'a RLS bypass gerektirir.
