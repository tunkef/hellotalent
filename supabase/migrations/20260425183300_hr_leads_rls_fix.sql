-- hr_leads RLS fix — TO clause kaldırıldı (public role default)
-- HelloTalent convention'ında policies TO clause'suz tanımlı (polroles = '-' / public)
-- sb_publishable_* anahtar default 'public' role'üne map oluyor; TO anon/authenticated tetiklenmiyordu.

DROP POLICY IF EXISTS "hr_leads_anon_insert" ON hr_leads;

CREATE POLICY "hr_leads_anon_insert"
  ON hr_leads FOR INSERT
  WITH CHECK (true);

-- Grant'ler aynı kalır (anon, authenticated)
-- Service role default tüm RLS'yi bypass eder
