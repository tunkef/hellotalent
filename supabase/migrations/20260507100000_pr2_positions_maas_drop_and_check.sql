-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  PR-2: positions — maas DROP + min_one_criteria CHECK               ║
-- ║  Date: 2026-05-07                                                    ║
-- ║                                                                       ║
-- ║  Origin: PR-1 Codex iter-1 C1+C2 fix — maas DROP ve min_one         ║
-- ║          CHECK PR-2'ye atomic taşındı (frontend kontrat ile sync).   ║
-- ║                                                                       ║
-- ║  KAPSAM:                                                              ║
-- ║  - DROP COLUMN maas (frontend artık göndermiyor)                     ║
-- ║  - CHECK constraint en az 1 kriter zorunlu (NOT VALID + VALIDATE)    ║
-- ║                                                                       ║
-- ║  KAPSAM DIŞI (PR-1'de zaten var, dokunulmaz):                       ║
-- ║  - 5 yeni kolon (M2 / 20260506110000) ✓                              ║
-- ║  - musaitlik_pozisyon CHECK constraint (Türkçe text) ✓               ║
-- ║  - musaitlik_level + egitim_level helpers (115000) ✓                 ║
-- ║                                                                       ║
-- ║  Pre-check kanıt: PR-1 audit `boş_kriter=0` (2026-05-05) ile         ║
-- ║  VALIDATE güvenli — production'da hiçbir satır yeni constraint'i     ║
-- ║  ihlal etmiyor.                                                       ║
-- ╚══════════════════════════════════════════════════════════════════════╝

SET search_path = public, pg_catalog;

-- ═══════════════════════════════════════════════════════════════
-- 1. maas kolonunu DROP — frontend createPosition payload'ı PR-2
--    ile bu alanı göndermiyor (Codex C1 fix). Türkiye enflasyon
--    politikası (CLAUDE.md kalıcı kural).
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE public.positions DROP COLUMN IF EXISTS maas;

-- ═══════════════════════════════════════════════════════════════
-- 2. positions_min_one_criteria CHECK — Tuna 2A doğrulama
--    NOT VALID önce eklenir → mevcut satır ihlal etmez
--    VALIDATE sonra → yeni INSERT/UPDATE'ler enforce edilir
--    Pre-check: PR-1 audit boş_kriter=0 ✓
-- ═══════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'positions'
      AND constraint_name = 'positions_min_one_criteria'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.positions
      ADD CONSTRAINT positions_min_one_criteria
      CHECK (
        sehir              IS NOT NULL OR
        seg                IS NOT NULL OR
        exp                IS NOT NULL OR
        calisma_tipi       IS NOT NULL OR
        musaitlik_pozisyon IS NOT NULL OR
        egitim_seviye      IS NOT NULL OR
        diller             IS NOT NULL OR
        tercih_segmentler  IS NOT NULL
      ) NOT VALID;

    ALTER TABLE public.positions
      VALIDATE CONSTRAINT positions_min_one_criteria;
  END IF;
END$$;

-- ═══════════════════════════════════════════════════════════════
-- DRY RUN VERIFY
-- ═══════════════════════════════════════════════════════════════
-- Verify 1: maas kolonu yok
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name='positions' AND column_name='maas';
--   Beklenen: 0 satır
--
-- Verify 2: CHECK constraint kayıtlı
--   SELECT conname FROM pg_constraint
--    WHERE conname = 'positions_min_one_criteria';
--   Beklenen: 1 satır
--
-- Verify 3: Constraint VALIDATED (convalidated true)
--   SELECT conname, convalidated FROM pg_constraint
--    WHERE conname = 'positions_min_one_criteria';
--   Beklenen: convalidated = true
--
-- Verify 4: Negative test — sadece ad ile INSERT REJECT
--   INSERT INTO positions (ad, durum) VALUES ('Test', 'active');
--   Beklenen: ERROR check_violation
