-- ═══════════════════════════════════════════════════════════════
-- Migration: Analytics event tracking table
-- Date: 2026-04-04
-- Reason: LB1 — funnel event tracking for signup, profile, studio etc.
-- ═══════════════════════════════════════════════════════════════

-- 1. Create table
CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  event_name text NOT NULL,
  event_data jsonb DEFAULT '{}',
  page text,
  created_at timestamptz DEFAULT now()
);

-- 2. RLS
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Insert: authenticated users can insert their own events
CREATE POLICY analytics_events_insert_own ON analytics_events
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Select: no direct read access for users (admin only via service_role)
-- Reason: analytics data is aggregate, not individual — queried by admin dashboard

-- 3. Index for common queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_name_created
  ON analytics_events (event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user
  ON analytics_events (user_id, created_at DESC);

-- 4. Grant
GRANT INSERT ON analytics_events TO authenticated;
