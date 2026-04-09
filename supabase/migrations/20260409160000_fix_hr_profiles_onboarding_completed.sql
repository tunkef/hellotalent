-- FIX: hr_profiles.onboarding_completed column missing
-- is_employer() RLS function referenced this column but it was never created
-- This broke ALL candidates SELECT queries (400 error)
-- DEPLOYED: 9 Nisan 2026

ALTER TABLE hr_profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;
UPDATE hr_profiles SET onboarding_completed = true WHERE id IS NOT NULL;
