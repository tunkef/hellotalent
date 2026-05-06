-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  M2 — Matching Engine: positions opsiyonel kriter kolonları          ║
-- ║  Tarih: 2026-05-06                                                  ║
-- ║  Tier: T3 (schema add, RLS dokunmaz — mevcut policy kolonları cover)║
-- ║  Codex: ZORUNLU                                                      ║
-- ║                                                                      ║
-- ║  KAPSAM:                                                             ║
-- ║   1. calisma_tipi text[] DEFAULT NULL                               ║
-- ║   2. musaitlik text DEFAULT NULL + CHECK                            ║
-- ║   3. egitim_seviye text DEFAULT NULL                                ║
-- ║   4. diller text[] DEFAULT NULL                                     ║
-- ║   5. tercih_segmentler text[] DEFAULT NULL                          ║
-- ║   6. DROP COLUMN maas — Tuna 1A explicit OK (data yok/önemsiz)     ║
-- ║   7. 2A CHECK constraint — en az 1 kriter zorunlu                  ║
-- ║   8. metadata jsonb — auto_match_threshold per-position             ║
-- ║                                                                      ║
-- ║  ADR-2: Opsiyonel alanlar, maaş kasıtlı kaldırıldı                 ║
-- ║         (CLAUDE.md — Turkey inflation rule)                          ║
-- ║  2A: server-side CHECK — boş pozisyon spam önleme                   ║
-- ║                                                                      ║
-- ║  RLS NOTU: Bu migration yeni kolon add eder, mevcut                 ║
-- ║  positions_select_own / positions_insert_own / positions_update_own  ║
-- ║  politikaları kolon-spesifik değil, etkilenmez.                     ║
-- ║  (A25 migration — company_id guard aktif)                           ║
-- ║                                                                      ║
-- ║  DİKKAT — MEVCUT SATIR UYUMU:                                       ║
-- ║  2A CHECK constraint eklenmeden önce mevcut satırlar audit edilmeli.║
-- ║  Hiç kriteri olmayan eski pozisyonlar varsa CHECK REJECT eder.       ║
-- ║  Auditor onayı: positions WHERE tüm kriterler NULL satır sayısı.    ║
-- ║                                                                      ║
-- ║  ROLLBACK: docs/rollback/matching-engine-rollback.sql               ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════
-- PRE-CHECK: Mevcut pozisyonlarda kriter durumu
-- (Migration apply öncesi manuel çalıştır, Tuna onayı için)
-- ═══════════════════════════════════════════════════════════════
-- SELECT
--   count(*) AS toplam_pozisyon,
--   count(*) FILTER (WHERE sehir IS NULL AND seg IS NULL AND exp IS NULL) AS kriter_yok_legacy,
--   count(*) FILTER (WHERE durum = 'active') AS aktif_pozisyon
-- FROM positions;
-- → kriter_yok_legacy > 0 ise: ya DEFAULT değer ver ya da cleanup script çalıştır.
-- Bu migrasyona geçmeden Tuna kararı zorunlu.

-- ═══════════════════════════════════════════════════════════════
-- 1. Yeni opsiyonel kriter kolonları (hepsi DEFAULT NULL)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE positions
  ADD COLUMN IF NOT EXISTS calisma_tipi text[] DEFAULT NULL;

ALTER TABLE positions
  ADD COLUMN IF NOT EXISTS musaitlik_pozisyon text DEFAULT NULL;

ALTER TABLE positions
  ADD COLUMN IF NOT EXISTS egitim_seviye text DEFAULT NULL;

ALTER TABLE positions
  ADD COLUMN IF NOT EXISTS diller text[] DEFAULT NULL;

ALTER TABLE positions
  ADD COLUMN IF NOT EXISTS tercih_segmentler text[] DEFAULT NULL;

-- ═══════════════════════════════════════════════════════════════
-- 2. metadata jsonb — auto_match_threshold per-position override
--    Default: NULL (global default 50 kullanılır)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE positions
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT NULL;

-- ═══════════════════════════════════════════════════════════════
-- 3. musaitlik_pozisyon CHECK constraint
--    Kabul edilen değerler: NULL | 'Hemen' | '2 Hafta İçinde' | '1 Ay İçinde' | '2+ Ay İçinde'
--    A4 FIX (2026-05-06): candidate_work_preferences.musaitlik değer seti ile align edildi.
--    Önceki mono-key format ('hemen','1ay','2-3ay') iptal — Türkçe text tutarlılığı.
--    Tuna 2F kararı (Türkçe doğal text) ile uyumlu.
--    positions.musaitlik_pozisyon = recruiter minimum başlangıç beklentisi (exact match filter)
-- ═══════════════════════════════════════════════════════════════
DO $$
BEGIN
  -- Önce eski constraint'i kaldır (mono-key format ile oluşturulmuşsa)
  ALTER TABLE positions
    DROP CONSTRAINT IF EXISTS positions_musaitlik_pozisyon_check;

  ALTER TABLE positions
    ADD CONSTRAINT positions_musaitlik_pozisyon_check
    CHECK (musaitlik_pozisyon IS NULL
           OR musaitlik_pozisyon IN (
             'Hemen',
             '2 Hafta İçinde',
             '1 Ay İçinde',
             '2+ Ay İçinde'
           ));
END$$;

-- ═══════════════════════════════════════════════════════════════
-- 4. DROP COLUMN maas — PR-2'YE TAŞINDI (Codex C1 fix)
--    NEDEN: Frontend IK_DATA.createPosition() hâlâ maas field
--    gönderiyor (js/ik-data.js, js/ik-pipeline.js). Bu PR'da DROP
--    edilirse PostgREST "column maas does not exist" hatası verir
--    ve tüm employer "Yeni pozisyon" akışı kırılır.
--
--    DOĞRU YAKLAŞIM: PR-2 (form refactor) içinde atomic — frontend
--    maas referanslarını kaldır + DB DROP COLUMN aynı PR.
--    Tuna 1A onayı korunur, sadece timing PR-2'ye kayar.
--
--    Bu PR-1'de positions.maas kolonu DOKUNULMAZ.
-- ═══════════════════════════════════════════════════════════════
-- ALTER TABLE positions DROP COLUMN IF EXISTS maas;  -- PR-2'YE TAŞINDI

-- ═══════════════════════════════════════════════════════════════
-- 5. 2A CHECK constraint — PR-2'YE TAŞINDI (Codex C2 fix)
--    NEDEN: Frontend hr-pipeline.html sadece "ad" zorunlu yapıyor,
--    diğer alanlar opsiyonel ve IK_DATA.createPosition() boş
--    alanları NULL gönderiyor. Bu PR'da CHECK eklerse başlık-only
--    pozisyon REJECT edilir ve generic save error fırlar.
--
--    DOĞRU YAKLAŞIM: PR-2 (form refactor) içinde atomic — UI
--    validation (en az 1 kriter zorunlu mesaj) + DB CHECK aynı PR.
--    Tuna 2A doğrulaması korunur, sadece timing PR-2'ye kayar.
--
--    Bu PR-1'de positions tablosuna CHECK constraint EKLENMEZ.
-- ═══════════════════════════════════════════════════════════════
-- DO $$ ... ADD CONSTRAINT positions_min_one_criteria ... -- PR-2'YE TAŞINDI

-- ═══════════════════════════════════════════════════════════════
-- 6. Column comments (schema documentation)
-- ═══════════════════════════════════════════════════════════════
COMMENT ON COLUMN positions.calisma_tipi IS
  'Matching Engine M2: Pozisyon çalışma tipi array (tam_zamanli/yari_zamanli/uzaktan vb.). NULL = filter yok.';
COMMENT ON COLUMN positions.musaitlik_pozisyon IS
  'Matching Engine M2: Recruiter minimum aday müsaitlik beklentisi. Hemen|2 Hafta İçinde|1 Ay İçinde|2+ Ay İçinde|NULL. A4 FIX: candidate_work_preferences.musaitlik değer seti ile align.';
COMMENT ON COLUMN positions.egitim_seviye IS
  'Matching Engine M2: Pozisyon için minimum eğitim seviyesi. NULL = filter yok.';
COMMENT ON COLUMN positions.diller IS
  'Matching Engine M2: Pozisyon için gerekli dil(ler). NULL = filter yok.';
COMMENT ON COLUMN positions.tercih_segmentler IS
  'Matching Engine M2: Pozisyon için tercih edilen segment(ler). NULL = filter yok.';
COMMENT ON COLUMN positions.metadata IS
  'Matching Engine M2: Per-position config. metadata->>auto_match_threshold (int, default 50).';

-- ═══════════════════════════════════════════════════════════════
-- DRY RUN VERIFY BLOCK
-- ═══════════════════════════════════════════════════════════════

-- VERIFY 1: Yeni kolonlar oluştu
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'positions'
--   AND column_name IN ('calisma_tipi', 'musaitlik_pozisyon', 'egitim_seviye', 'diller', 'tercih_segmentler', 'metadata');
-- Beklenen: 6 satır

-- VERIFY 2: maas kolonu yok
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'positions' AND column_name = 'maas';
-- Beklenen: 0 satır

-- VERIFY 3: 2A CHECK — hiç kriteri olmayan INSERT reddedilir
-- INSERT INTO positions (hr_profile_id, company_id, ad, durum)
--   VALUES (auth.uid(), COMPANY_ID, 'Test Pozisyon', 'draft');
-- Beklenen: ERROR - CHECK constraint "positions_min_one_criteria" violated

-- VERIFY 4: 2A CHECK — 1 kriter ile INSERT kabul edilir
-- INSERT INTO positions (hr_profile_id, company_id, ad, sehir, durum)
--   VALUES (auth.uid(), COMPANY_ID, 'Test Pozisyon', 'İstanbul', 'draft');
-- Beklenen: INSERT OK

-- VERIFY 5: musaitlik_pozisyon CHECK — geçersiz değer reddedilir
-- UPDATE positions SET musaitlik_pozisyon = 'gecersiz' WHERE id = LAST_INSERT_ID;
-- Beklenen: ERROR - CHECK constraint "positions_musaitlik_pozisyon_check" violated
-- UPDATE positions SET musaitlik_pozisyon = 'hemen' WHERE id = LAST_INSERT_ID;  -- eski mono-key
-- Beklenen: ERROR - CHECK constraint violated (A4 FIX: mono-key format artık geçersiz)

-- VERIFY 5B: musaitlik_pozisyon CHECK — Türkçe text değer kabul edilir
-- UPDATE positions SET musaitlik_pozisyon = 'Hemen' WHERE id = LAST_INSERT_ID;
-- Beklenen: UPDATE OK
-- UPDATE positions SET musaitlik_pozisyon = '2+ Ay İçinde' WHERE id = LAST_INSERT_ID;
-- Beklenen: UPDATE OK

-- VERIFY 6: metadata threshold — geçerli JSON
-- UPDATE positions SET metadata = '{"auto_match_threshold": 60}'::jsonb WHERE id = LAST_INSERT_ID;
-- Beklenen: UPDATE OK
-- SELECT (metadata->>'auto_match_threshold')::int FROM positions WHERE id = LAST_INSERT_ID;
-- Beklenen: 60
