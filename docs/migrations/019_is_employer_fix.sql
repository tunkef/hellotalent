-- Migration 019: Fix is_employer() function with SET search_path
-- Fixes search path injection vulnerability on SECURITY DEFINER function
-- Fixes broken cbf_employer_read RLS policy on candidate_brand_follows

CREATE OR REPLACE FUNCTION is_employer()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM hr_profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;
