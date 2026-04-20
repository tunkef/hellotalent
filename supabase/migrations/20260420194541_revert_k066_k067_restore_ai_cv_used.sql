-- ═══════════════════════════════════════════════════════════════
-- K-068 — Rollback K-066+K-067: ai_cv_used kolonunu geri ekle.
-- Tuna kararı: AI CV Optimize feature DONDURULDU (UI'da gizli),
-- Studio "Yakında" sayfasına taşındı. Kod backwards-compat için kalır,
-- DB schema da eski feature için gerekli kolonlara döner.
--
-- career_mobility kolonu KORUNUR (zarar yok, opsiyonel work_prefs alanı).
-- save_candidate_profile RPC K-066 versiyonu KORUNUR (eski client
-- career_mobility göndermez, NULL döner, CHECK constraint null kabul eder).
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS ai_cv_used boolean DEFAULT false;

COMMENT ON COLUMN public.candidates.ai_cv_used IS
  'Beta: AI CV oluşturma hakkı kullanıldı mı. K-068: feature dondurulup Studio yakında sayfasına taşındı; kolon backwards-compat için kaldı.';
