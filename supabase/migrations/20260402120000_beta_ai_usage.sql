-- ═══════════════════════════════════════════════════════════════
-- Beta AI Usage Tracking — Aşama 50
-- AI özellikleri beta'da 1 kullanım hakkı (CV oluşturma + yetkinlik değerlendirme)
-- 3 ay beta sonrası premium'a çekilecek
-- ═══════════════════════════════════════════════════════════════

-- 1. AI kullanım tracking kolonları
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS ai_cv_used boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_assessment_used boolean DEFAULT false;

-- 2. RLS — mevcut candidates RLS zaten var, yeni kolon RLS kapsamında
-- Ek policy gerekmiyor — candidates_update_own mevcut

-- 3. COMMENT — dokümantasyon
COMMENT ON COLUMN candidates.ai_cv_used IS 'Beta: AI CV oluşturma hakkı kullanıldı mı (1 hak/kullanıcı)';
COMMENT ON COLUMN candidates.ai_assessment_used IS 'Beta: AI yetkinlik değerlendirme hakkı kullanıldı mı (1 hak/kullanıcı)';
