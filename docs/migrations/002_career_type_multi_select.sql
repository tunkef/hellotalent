-- Migration 002: Allow multi-select career_type (comma-separated)
-- Previous: career_type IN ('yukari','yatay','lider') — single value only
-- New:      career_type matches canonical comma-separated pattern
-- Examples: 'yukari', 'yukari,yatay', 'yukari,yatay,lider'
-- Canonical order is always: yukari, yatay, lider (enforced by frontend)

-- Step 1: Drop old CHECK
ALTER TABLE candidate_work_preferences
  DROP CONSTRAINT IF EXISTS candidate_work_preferences_career_type_check;

-- Step 2: Add regex CHECK allowing comma-separated values
ALTER TABLE candidate_work_preferences
  ADD CONSTRAINT candidate_work_preferences_career_type_check
  CHECK (career_type IS NULL OR career_type ~ '^(yukari|yatay|lider)(,(yukari|yatay|lider))*$');
