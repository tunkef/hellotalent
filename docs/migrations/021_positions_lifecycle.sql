-- Migration 021: Position lifecycle (tabs + templates)
-- Adds archived status, closed_at tracking, template support

-- Drop and recreate CHECK constraint to include 'archived'
ALTER TABLE positions DROP CONSTRAINT IF EXISTS positions_durum_check;
ALTER TABLE positions ADD CONSTRAINT positions_durum_check
  CHECK (durum IN ('active', 'draft', 'closed', 'archived'));

-- Track when position was closed (for auto-archive after 90 days)
ALTER TABLE positions ADD COLUMN IF NOT EXISTS closed_at timestamptz;

-- Template flag for saved/recurring positions
ALTER TABLE positions ADD COLUMN IF NOT EXISTS is_template boolean NOT NULL DEFAULT false;
