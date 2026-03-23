-- Coach notification email types
-- Date: 2026-03-23
-- Type: SCHEMA (CHECK constraint extension)
-- Purpose: Allow coach_post_published, coach_post_changes_requested, coach_post_rejected
--          email types in email_outbox for coach content moderation notifications.

-- Drop existing CHECK and recreate with new types
ALTER TABLE email_outbox DROP CONSTRAINT IF EXISTS email_outbox_email_type_check;
ALTER TABLE email_outbox ADD CONSTRAINT email_outbox_email_type_check
  CHECK (email_type IN (
    'candidate_welcome',
    'employer_welcome',
    'new_message',
    'coach_invite',
    'coach_post_published',
    'coach_post_changes_requested',
    'coach_post_rejected'
  ));
