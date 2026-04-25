-- hr_leads explicit grants — anon + authenticated INSERT
-- İlk migration GRANT'leri uygulanmadı (information_schema.role_table_grants check)
-- Bu fix grant'leri kesin olarak set eder

GRANT INSERT ON TABLE public.hr_leads TO anon;
GRANT INSERT ON TABLE public.hr_leads TO authenticated;

-- demo_token sütununa SELECT — RPC'siz alternatif yol için (gerekirse)
-- GRANT SELECT(demo_token) ON TABLE public.hr_leads TO anon;  -- not needed if RPC works

-- get_lead_context RPC için EXECUTE
GRANT EXECUTE ON FUNCTION public.get_lead_context(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_lead_context(uuid) TO authenticated;
