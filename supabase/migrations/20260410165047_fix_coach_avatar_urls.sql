-- Fix coach_profiles.avatar_url: strip full public URL to storage path
-- Previously, coach-studio.html stored getPublicUrl() output (full URL) instead of just the path.
-- The cvs bucket is now private, so these full URLs are broken (400/403).
-- This migration converts them back to storage paths for use with createSignedUrl().

UPDATE coach_profiles
SET avatar_url = regexp_replace(
  avatar_url,
  '^https://cpwibefquojehjehtrog\.supabase\.co/storage/v1/object/public/cvs/',
  ''
)
WHERE avatar_url LIKE 'https://cpwibefquojehjehtrog.supabase.co/storage/v1/object/public/cvs/%';

-- Fix coach_posts.cover_image_url: same issue
UPDATE coach_posts
SET cover_image_url = regexp_replace(
  cover_image_url,
  '^https://cpwibefquojehjehtrog\.supabase\.co/storage/v1/object/public/cvs/',
  ''
)
WHERE cover_image_url LIKE 'https://cpwibefquojehjehtrog.supabase.co/storage/v1/object/public/cvs/%';
