-- Fix: cap studio module duration_minutes to 7 for 3-7 dk micro-learning target
-- Affects: 1 Performans module (vaka-calismasi) currently at 10 dk

UPDATE studio_modules
SET duration_minutes = 7
WHERE duration_minutes > 7
  AND status = 'published';
