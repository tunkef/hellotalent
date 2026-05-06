-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ H1 + H2 (Codex iter-6 P1) — Ordinal level helper functions           ║
-- ║                                                                       ║
-- ║ NEDEN: musaitlik_pozisyon ve egitim_seviye MINIMUM requirement       ║
-- ║        olarak documented (M2 comment + spec). Exact match `=` yanlış: ║
-- ║                                                                       ║
-- ║   - musaitlik: pozisyon "1 Ay İçinde" → aday "Hemen" / "2 Hafta" da  ║
-- ║                kabul edilmeli (sooner is better, aday <= pozisyon).   ║
-- ║   - egitim:    pozisyon "Lise" → aday Lisans / Yüksek Lisans da     ║
-- ║                kabul edilmeli (more education better, aday >= pos).   ║
-- ║                                                                       ║
-- ║ STRATEGY: STABLE IMMUTABLE SQL helper functions ordinal level döner. ║
-- ║           NULL input → NULL (NULL aday filter'da dışlanır,            ║
-- ║           E4 strict NULL exclude prensibi korunur).                   ║
-- ║                                                                       ║
-- ║ APPLY SIRASI: M2 (110000) → BU (115000) → M4 (130000) → M-RPC-1     ║
-- ║                                                                       ║
-- ║ ROLLBACK: docs/rollback/matching-engine-rollback.sql                  ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════
-- 1. musaitlik_level — ordinal sıralama (sooner = lower)
--    Hemen=1, 2 Hafta İçinde=2, 1 Ay İçinde=3, 2+ Ay İçinde=4
--    Filter: aday_level <= pozisyon_level (aday daha erken başlayabilir)
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.musaitlik_level(m text)
RETURNS int
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE m
    WHEN 'Hemen'           THEN 1
    WHEN '2 Hafta İçinde'  THEN 2
    WHEN '1 Ay İçinde'     THEN 3
    WHEN '2+ Ay İçinde'    THEN 4
    ELSE NULL  -- bilinmeyen değer veya NULL → NULL (filter dışlar)
  END;
$$;

COMMENT ON FUNCTION public.musaitlik_level(text) IS
  'Matching Engine helper: musaitlik string → ordinal int. Hemen=1..2+Ay=4. NULL = unknown/exclude. H1 fix 2026-05-06.';

-- ═══════════════════════════════════════════════════════════════
-- 2. egitim_level — ordinal sıralama (more education = higher)
--    Filter: aday_level >= pozisyon_level (aday minimum eğitimi sağlar/aşar)
--    Spec: candidates.egitim_seviye değer setine align (frontend dropdown)
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.egitim_level(e text)
RETURNS int
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE e
    WHEN 'İlkokul'         THEN 1
    WHEN 'Ortaokul'        THEN 2
    WHEN 'Lise'            THEN 3
    WHEN 'Ön Lisans'       THEN 4
    WHEN 'Lisans'          THEN 5
    WHEN 'Yüksek Lisans'   THEN 6
    WHEN 'Doktora'         THEN 7
    ELSE NULL  -- bilinmeyen değer veya NULL → NULL (filter dışlar)
  END;
$$;

COMMENT ON FUNCTION public.egitim_level(text) IS
  'Matching Engine helper: egitim_seviye string → ordinal int. İlkokul=1..Doktora=7. NULL = unknown/exclude. H2 fix 2026-05-06.';

-- ═══════════════════════════════════════════════════════════════
-- 3. GRANT (authenticated kullanıcılar SELECT'te kullanabilir)
-- ═══════════════════════════════════════════════════════════════
GRANT EXECUTE ON FUNCTION public.musaitlik_level(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.egitim_level(text)    TO authenticated;

-- ═══════════════════════════════════════════════════════════════
-- 4. DRY RUN VERIFY BLOCK
-- ═══════════════════════════════════════════════════════════════
-- Test musaitlik ordinal:
--   SELECT musaitlik_level('Hemen'),
--          musaitlik_level('2 Hafta İçinde'),
--          musaitlik_level('1 Ay İçinde'),
--          musaitlik_level('2+ Ay İçinde'),
--          musaitlik_level('Bilinmeyen'),
--          musaitlik_level(NULL);
--   Beklenen: 1, 2, 3, 4, NULL, NULL
--
-- Test filter sim:
--   SELECT 'aday Hemen + pozisyon 1 Ay → ' ||
--     CASE WHEN musaitlik_level('Hemen') <= musaitlik_level('1 Ay İçinde')
--          THEN 'EŞLEŞİR' ELSE 'EŞLEŞMEZ' END;
--   Beklenen: EŞLEŞİR (1 <= 3)
--
-- Test egitim ordinal:
--   SELECT egitim_level('Lise') AS lise, egitim_level('Lisans') AS lisans;
--   Beklenen: 3, 5
--
-- Test filter sim:
--   SELECT 'aday Lisans + pozisyon Lise → ' ||
--     CASE WHEN egitim_level('Lisans') >= egitim_level('Lise')
--          THEN 'EŞLEŞİR' ELSE 'EŞLEŞMEZ' END;
--   Beklenen: EŞLEŞİR (5 >= 3)
