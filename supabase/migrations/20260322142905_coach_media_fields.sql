-- Coach content media fields V1
-- Adds cover image support to coach_posts.
-- coach_profiles.avatar_url already exists (migration 058).

ALTER TABLE coach_posts ADD COLUMN IF NOT EXISTS cover_image_url text;
ALTER TABLE coach_posts ADD COLUMN IF NOT EXISTS cover_image_alt text;
