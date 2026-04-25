-- ╔══════════════════════════════════════════════════════════════╗
-- ║  hr_leads — Lead Capture (MVP 1 lead funnel)                 ║
-- ║  Public form (isveren-onboarding.html) → bu tabloya insert   ║
-- ║  Tuna sales lead listesi service_role ile okur               ║
-- ║  Read için RLS policy YOK — sadece INSERT (anon + auth)      ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════
-- 1. TABLO
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS hr_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Zorunlu (5)
  email text NOT NULL CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  full_name text NOT NULL CHECK (length(full_name) BETWEEN 2 AND 200),
  company_name text NOT NULL CHECK (length(company_name) BETWEEN 1 AND 200),
  segment_type text NOT NULL CHECK (segment_type IN ('single_brand','holding','distributor','headhunter')),
  team_size text NOT NULL CHECK (team_size IN ('1','2-5','6-20','21-50','50+')),
  monthly_positions text NOT NULL CHECK (monthly_positions IN ('1-3','4-10','11-30','30+')),

  -- Opsiyonel (4)
  brands jsonb,                -- multi-select brand IDs ["1","42"]
  position_types jsonb,        -- multi-select role names ["magaza_muduru","satis_danismani"]
  urgency text CHECK (urgency IS NULL OR urgency IN ('hemen','1_ay','3_ay','kesif')),
  phone text CHECK (phone IS NULL OR length(phone) BETWEEN 7 AND 20),

  -- Consent + meta
  marketing_opt_in boolean NOT NULL DEFAULT false,
  ip_address inet,
  user_agent text,
  responses jsonb,             -- ham cevap (future-proof, schema değişimi için)

  -- Demo erişim + sales tracking
  demo_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','rejected','mvp2_invited')),

  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexler
CREATE INDEX IF NOT EXISTS idx_hr_leads_email ON hr_leads(email);
CREATE INDEX IF NOT EXISTS idx_hr_leads_status ON hr_leads(status);
CREATE INDEX IF NOT EXISTS idx_hr_leads_created_at ON hr_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hr_leads_demo_token ON hr_leads(demo_token);

-- ═══════════════════════════════════════════════
-- 2. ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════
ALTER TABLE hr_leads ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════
-- 3. POLİCY'LER
--    INSERT: anon + authenticated (public form)
--    SELECT: YOK — service_role only (Tuna sales dashboard MVP 2'de)
-- ═══════════════════════════════════════════════

CREATE POLICY "hr_leads_anon_insert"
  ON hr_leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- ═══════════════════════════════════════════════
-- 4. GRANT
-- ═══════════════════════════════════════════════
GRANT INSERT ON hr_leads TO anon, authenticated;
-- SELECT için service_role default'ta erişebilir (RLS bypass)

-- ═══════════════════════════════════════════════
-- 5. RPC: get_lead_context — demo_token ile lead bilgisi (kişiselleştirme için)
--    SECURITY DEFINER ile RLS bypass edip sadece guvenli alanlari döner
-- ═══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_lead_context(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead hr_leads%ROWTYPE;
BEGIN
  SELECT * INTO v_lead FROM hr_leads WHERE demo_token = p_token LIMIT 1;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Sadece kişiselleştirme için gerekli alanlar (email/phone exposed olmaz)
  RETURN jsonb_build_object(
    'company_name', v_lead.company_name,
    'segment_type', v_lead.segment_type,
    'team_size', v_lead.team_size,
    'brands', v_lead.brands,
    'position_types', v_lead.position_types,
    'monthly_positions', v_lead.monthly_positions
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_lead_context(uuid) TO anon, authenticated;

-- ═══════════════════════════════════════════════
-- 6. TRIGGER: hot lead notification (Edge Function pg_net çağrısı)
--    Edge Function notify-hr-lead'ı tetikler — Resend ile Tuna'ya email
--    Edge Function MVP 1 yayını öncesi deploy edilmeli
-- ═══════════════════════════════════════════════
-- Not: pg_net extension Supabase managed'da default açık.
-- Edge Function deploy sonrası bu trigger aktive edilir.
-- Şu an placeholder olarak bırakılmıştır (uncomment FAZ A.2 deploy sonrası).

-- CREATE OR REPLACE FUNCTION trg_notify_hr_lead() RETURNS trigger AS $$
-- DECLARE
--   v_url text := current_setting('supabase.functions_url', true) || '/notify-hr-lead';
--   v_anon_key text := current_setting('supabase.anon_key', true);
-- BEGIN
--   PERFORM net.http_post(
--     url := v_url,
--     headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_anon_key),
--     body := to_jsonb(NEW)
--   );
--   RETURN NEW;
-- END; $$ LANGUAGE plpgsql SECURITY DEFINER;
--
-- CREATE TRIGGER hr_leads_after_insert
--   AFTER INSERT ON hr_leads
--   FOR EACH ROW EXECUTE FUNCTION trg_notify_hr_lead();
