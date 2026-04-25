-- ╔══════════════════════════════════════════════════════════════╗
-- ║  Asama 84 — Auth-gated Onboarding Wizard                     ║
-- ║  Migration A: hr_profiles extend (12 yeni kolon)             ║
-- ║                                                              ║
-- ║  Hibrit kararı (Tuna onayli):                                ║
-- ║    - onboarding_completed boolean ZATEN VAR (09 Nis)         ║
-- ║      → is_employer() RLS contract bozulmaz                   ║
-- ║    - onboarding_completed_at timestamptz YENI eklenir        ║
-- ║      → audit/analytics icin kesin zaman damgasi              ║
-- ║                                                              ║
-- ║  T3 — supabase-agent + auditor + Codex review zorunlu        ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════
-- 1. Onboarding wizard veri kolonlari
--    NOT NULL CHECK degil — wizard ortasinda yarim
--    kalan satirlar olabilir (pre-fill: phone+company_name
--    signup'ta; segment_type vs. wizard step 1'de set edilir)
-- ═══════════════════════════════════════════════

ALTER TABLE hr_profiles
  ADD COLUMN IF NOT EXISTS segment_type      text
    CHECK (segment_type IS NULL OR segment_type IN ('single_brand','holding','distributor','headhunter')),
  ADD COLUMN IF NOT EXISTS team_size         text
    CHECK (team_size IS NULL OR team_size IN ('1','2-5','6-20','21-50','50+')),
  ADD COLUMN IF NOT EXISTS monthly_positions text
    CHECK (monthly_positions IS NULL OR monthly_positions IN ('1-3','4-10','11-30','30+')),
  ADD COLUMN IF NOT EXISTS urgency           text
    CHECK (urgency IS NULL OR urgency IN ('hemen','1_ay','3_ay','kesif')),
  ADD COLUMN IF NOT EXISTS brands            jsonb,
  ADD COLUMN IF NOT EXISTS position_types    jsonb,
  ADD COLUMN IF NOT EXISTS phone             text
    CHECK (phone IS NULL OR length(phone) BETWEEN 7 AND 20),
  ADD COLUMN IF NOT EXISTS company_name      text
    CHECK (company_name IS NULL OR length(company_name) BETWEEN 1 AND 200),
  ADD COLUMN IF NOT EXISTS marketing_opt_in  boolean DEFAULT false;

-- ═══════════════════════════════════════════════
-- 2. Wizard state machine
--    onboarding_step: 1..8 (welcome step kalkti)
--    onboarding_completed_at: complete_onboarding() set eder
--    onboarding_responses: ham wizard cevap (future-proof)
-- ═══════════════════════════════════════════════

ALTER TABLE hr_profiles
  ADD COLUMN IF NOT EXISTS onboarding_step         int DEFAULT 1
    CHECK (onboarding_step BETWEEN 1 AND 8),
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_responses    jsonb;

-- ═══════════════════════════════════════════════
-- 3. Index — admin lead listesi performansi
--    onboarding_step + onboarding_completed_at DESC
--    (yeni signup → step=1, tamamlanan → completed_at NOT NULL)
-- ═══════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_hr_profiles_onboarding_step
  ON hr_profiles(onboarding_step)
  WHERE onboarding_completed = false;

CREATE INDEX IF NOT EXISTS idx_hr_profiles_completed_at
  ON hr_profiles(onboarding_completed_at DESC)
  WHERE onboarding_completed_at IS NOT NULL;

-- ═══════════════════════════════════════════════
-- 4. Yorum: RLS contract korundu
--    hr_select / hr_insert / hr_update policy'leri (009 + 058)
--    yeni kolonlar icin de gecerli — auth.uid() = id check'i
--    yeni kolonlar otomatik kapsama alir.
-- ═══════════════════════════════════════════════
