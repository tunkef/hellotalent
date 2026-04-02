-- Brand cover images — Aşama 54
-- Marka kartları için görsel URL'leri

ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS cover_image_url text;

COMMENT ON COLUMN brands.cover_image_url IS 'Marka kapak görseli URL (assets/brands/ altında)';
