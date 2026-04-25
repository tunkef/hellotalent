-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Asama 84 — Migration C: hr_leads DROP CASCADE               ║
-- ║                                                              ║
-- ║  Tuna onay (Q1 = a, 25 Nisan 2026):                          ║
-- ║  hr_leads ve get_lead_context arsivlenmeden silinir.         ║
-- ║  Asama 83'te lead funnel olarak eklendi, simdi auth-gated    ║
-- ║  signup -> hr_profiles + onboarding wizard mimarisine        ║
-- ║  gecildigi icin gereksiz. Mevcut 6 test row icin yedek       ║
-- ║  alinmaz (yalnizca E2E test verisi).                         ║
-- ║                                                              ║
-- ║  DIKKAT: employer_leads tablosu (admin.html aktif kullanim)  ║
-- ║  DOKUNULMAZ. Sadece hr_leads ve get_lead_context silinir.    ║
-- ║                                                              ║
-- ║  T3 — auditor + Codex review zorunlu                         ║
-- ╚══════════════════════════════════════════════════════════════╝

-- 1. RPC kaldir (CASCADE zaten dropluyor ama explicit guvenli)
DROP FUNCTION IF EXISTS get_lead_context(uuid);

-- 2. Tablo kaldir (CASCADE: index + RLS policy + grant temizler)
DROP TABLE IF EXISTS hr_leads CASCADE;

-- ═══════════════════════════════════════════════
-- Yorum: notify-hr-lead Edge Function bu migration'dan
-- BAGIMSIZ olarak Phase 3'te refactor edilir — yeni
-- versiyon hr_profiles row'undan email verisi cekecek.
-- ═══════════════════════════════════════════════
