-- ═══════════════════════════════════════════════════════════════
-- Migration 038: Add 'deleted' status to employer_messages
-- Date: 2026-03-16
-- Type: SCHEMA — soft-delete for candidate inbox trash feature
--
-- Purpose:
--   Add 'deleted' to employer_messages.status CHECK constraint
--   so candidates can soft-delete messages (recoverable trash).
--
-- Current: ('sent', 'read', 'archived')
-- New:     ('sent', 'read', 'archived', 'deleted')
--
-- Depends on: 031 (employer_messages)
-- ═══════════════════════════════════════════════════════════════


-- ── 1. UPDATE STATUS CONSTRAINT ─────────────────────────────────
ALTER TABLE employer_messages
  DROP CONSTRAINT IF EXISTS employer_messages_status_check;

ALTER TABLE employer_messages
  ADD CONSTRAINT employer_messages_status_check
  CHECK (status IN ('sent', 'read', 'archived', 'deleted'));


-- ── VERIFICATION ─────────────────────────────────────────────────
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'employer_messages'::regclass AND conname LIKE '%status%';
