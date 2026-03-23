-- Coach profiles: add linkedin_url field
-- Date: 2026-03-23
-- Type: SCHEMA (additive)

ALTER TABLE coach_profiles ADD COLUMN IF NOT EXISTS linkedin_url text;
