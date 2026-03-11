-- ═══════════════════════════════════════════════════════════════
-- HELLOTALENT — Migration 012a: Company Ecosystem — Phase A Seed
-- Date: 2026-03-11
-- Type: DATA — seed inserts only, no schema changes
--
-- Purpose:
--   Populates companies and brands tables with initial data
--   derived from BRAND_DB (profil.html:1704-1723).
--
-- Re-run safety:
--   All inserts use ON CONFLICT (slug) DO NOTHING.
--   Re-running this file will never overwrite manually enriched
--   data (logos, descriptions, career URLs added after seed).
--
-- Slug convention:
--   Turkish chars → ASCII: İ/ı→i, Ş/ş→s, Ç/ç→c, Ö/ö→o, Ü/ü→u, Ğ/ğ→g
--   Apostrophes removed. Ampersands/dots removed.
--   Spaces and non-alphanumeric → hyphens. Leading/trailing hyphens stripped.
--   Result: lowercase, hyphen-separated, ASCII-safe.
--
-- Company derivation:
--   61 company rows from two sources:
--     - 18 parent group names (non-empty 'parent' field in BRAND_DB)
--     - 43 standalone brands (empty 'parent', name not used as parent by others)
--
-- Brand derivation:
--   96 brand rows — every BRAND_DB entry becomes one brand row.
--   company_id resolved via slug subquery to the parent company.
--   Standalone brands FK to their own same-name company row.
--
-- Depends on: 012_company_ecosystem_phase_a.sql (tables + RLS)
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. COMPANIES (61 rows) ─────────────────────────────────────

INSERT INTO companies (name, slug) VALUES
  -- Parent groups (18)
  ('AS Watson', 'as-watson'),
  ('Boyner Group', 'boyner-group'),
  ('Capri Holdings', 'capri-holdings'),
  ('Ceconomy', 'ceconomy'),
  ('Estee Lauder', 'estee-lauder'),
  ('Fast Retailing', 'fast-retailing'),
  ('Fiba Retail', 'fiba-retail'),
  ('H&M Group', 'hm-group'),
  ('İnditex', 'inditex'),
  ('Ingka Group', 'ingka-group'),
  ('Kering', 'kering'),
  ('LC Waikiki', 'lc-waikiki'),
  ('LVMH', 'lvmh'),
  ('Prada Group', 'prada-group'),
  ('PVH', 'pvh'),
  ('Richemont', 'richemont'),
  ('Sabancı Holding', 'sabanci-holding'),
  ('VF Corp', 'vf-corp'),
  -- Standalone brands (43)
  ('A101', 'a101'),
  ('Adidas', 'adidas'),
  ('Amazon', 'amazon'),
  ('Apple', 'apple'),
  ('Beymen', 'beymen'),
  ('BİM', 'bim'),
  ('Burberry', 'burberry'),
  ('CarrefourSA', 'carrefoursa'),
  ('Chanel', 'chanel'),
  ('Colin''s', 'colins'),
  ('Decathlon', 'decathlon'),
  ('DeFacto', 'defacto'),
  ('English Home', 'english-home'),
  ('Gratis', 'gratis'),
  ('Hermes', 'hermes'),
  ('Ipekyol', 'ipekyol'),
  ('Koçtaş', 'koctas'),
  ('Koton', 'koton'),
  ('Lacoste', 'lacoste'),
  ('Levi''s', 'levis'),
  ('L''Oreal', 'loreal'),
  ('Machka', 'machka'),
  ('Mango', 'mango'),
  ('Mavi', 'mavi'),
  ('Migros', 'migros'),
  ('Network', 'network'),
  ('New Balance', 'new-balance'),
  ('Nike', 'nike'),
  ('Prada', 'prada'),
  ('Puma', 'puma'),
  ('Ralph Lauren', 'ralph-lauren'),
  ('Reebok', 'reebok'),
  ('Roman', 'roman'),
  ('Samsung', 'samsung'),
  ('ŞOK', 'sok'),
  ('Starbucks', 'starbucks'),
  ('Superdry', 'superdry'),
  ('The Body Shop', 'the-body-shop'),
  ('Twist', 'twist'),
  ('Under Armour', 'under-armour'),
  ('Vakko', 'vakko'),
  ('Vatan Bilgisayar', 'vatan-bilgisayar'),
  ('Yves Rocher', 'yves-rocher')
ON CONFLICT (slug) DO NOTHING;


-- ── 2. BRANDS (96 rows) ────────────────────────────────────────
-- company_id resolved via: (SELECT id FROM companies WHERE slug = '<company_slug>')
-- The third value in each comment is the company slug for traceability.

-- İnditex brands
INSERT INTO brands (name, slug, company_id) VALUES
  ('Zara', 'zara', (SELECT id FROM companies WHERE slug = 'inditex')),
  ('Massimo Dutti', 'massimo-dutti', (SELECT id FROM companies WHERE slug = 'inditex')),
  ('Bershka', 'bershka', (SELECT id FROM companies WHERE slug = 'inditex')),
  ('Pull & Bear', 'pull-bear', (SELECT id FROM companies WHERE slug = 'inditex')),
  ('Stradivarius', 'stradivarius', (SELECT id FROM companies WHERE slug = 'inditex')),
  ('Oysho', 'oysho', (SELECT id FROM companies WHERE slug = 'inditex')),
  ('Zara Home', 'zara-home', (SELECT id FROM companies WHERE slug = 'inditex')),
  ('İnditex', 'inditex', (SELECT id FROM companies WHERE slug = 'inditex'))
ON CONFLICT (slug) DO NOTHING;

-- H&M Group brands
INSERT INTO brands (name, slug, company_id) VALUES
  ('H&M', 'hm', (SELECT id FROM companies WHERE slug = 'hm-group')),
  ('COS', 'cos', (SELECT id FROM companies WHERE slug = 'hm-group')),
  ('& Other Stories', 'other-stories', (SELECT id FROM companies WHERE slug = 'hm-group')),
  ('Arket', 'arket', (SELECT id FROM companies WHERE slug = 'hm-group')),
  ('Monki', 'monki', (SELECT id FROM companies WHERE slug = 'hm-group'))
ON CONFLICT (slug) DO NOTHING;

-- LVMH brands
INSERT INTO brands (name, slug, company_id) VALUES
  ('Louis Vuitton', 'louis-vuitton', (SELECT id FROM companies WHERE slug = 'lvmh')),
  ('Dior', 'dior', (SELECT id FROM companies WHERE slug = 'lvmh')),
  ('Sephora', 'sephora', (SELECT id FROM companies WHERE slug = 'lvmh')),
  ('Fendi', 'fendi', (SELECT id FROM companies WHERE slug = 'lvmh')),
  ('Givenchy', 'givenchy', (SELECT id FROM companies WHERE slug = 'lvmh')),
  ('Celine', 'celine', (SELECT id FROM companies WHERE slug = 'lvmh')),
  ('Loewe', 'loewe', (SELECT id FROM companies WHERE slug = 'lvmh')),
  ('Marc Jacobs', 'marc-jacobs', (SELECT id FROM companies WHERE slug = 'lvmh')),
  ('Tiffany & Co.', 'tiffany-co', (SELECT id FROM companies WHERE slug = 'lvmh'))
ON CONFLICT (slug) DO NOTHING;

-- Kering brands
INSERT INTO brands (name, slug, company_id) VALUES
  ('Gucci', 'gucci', (SELECT id FROM companies WHERE slug = 'kering')),
  ('Saint Laurent', 'saint-laurent', (SELECT id FROM companies WHERE slug = 'kering')),
  ('Balenciaga', 'balenciaga', (SELECT id FROM companies WHERE slug = 'kering')),
  ('Bottega Veneta', 'bottega-veneta', (SELECT id FROM companies WHERE slug = 'kering')),
  ('Alexander McQueen', 'alexander-mcqueen', (SELECT id FROM companies WHERE slug = 'kering'))
ON CONFLICT (slug) DO NOTHING;

-- Fiba Retail brands
INSERT INTO brands (name, slug, company_id) VALUES
  ('Gap', 'gap', (SELECT id FROM companies WHERE slug = 'fiba-retail')),
  ('Banana Republic', 'banana-republic', (SELECT id FROM companies WHERE slug = 'fiba-retail')),
  ('Marks & Spencer', 'marks-spencer', (SELECT id FROM companies WHERE slug = 'fiba-retail')),
  ('Fiba Retail', 'fiba-retail', (SELECT id FROM companies WHERE slug = 'fiba-retail')),
  ('Eataly', 'eataly', (SELECT id FROM companies WHERE slug = 'fiba-retail'))
ON CONFLICT (slug) DO NOTHING;

-- Fast Retailing brands
INSERT INTO brands (name, slug, company_id) VALUES
  ('Uniqlo', 'uniqlo', (SELECT id FROM companies WHERE slug = 'fast-retailing')),
  ('GU', 'gu', (SELECT id FROM companies WHERE slug = 'fast-retailing'))
ON CONFLICT (slug) DO NOTHING;

-- Capri Holdings brands
INSERT INTO brands (name, slug, company_id) VALUES
  ('Versace', 'versace', (SELECT id FROM companies WHERE slug = 'capri-holdings')),
  ('Michael Kors', 'michael-kors', (SELECT id FROM companies WHERE slug = 'capri-holdings')),
  ('Jimmy Choo', 'jimmy-choo', (SELECT id FROM companies WHERE slug = 'capri-holdings'))
ON CONFLICT (slug) DO NOTHING;

-- Richemont brands
INSERT INTO brands (name, slug, company_id) VALUES
  ('Cartier', 'cartier', (SELECT id FROM companies WHERE slug = 'richemont')),
  ('Montblanc', 'montblanc', (SELECT id FROM companies WHERE slug = 'richemont'))
ON CONFLICT (slug) DO NOTHING;

-- PVH brands
INSERT INTO brands (name, slug, company_id) VALUES
  ('Tommy Hilfiger', 'tommy-hilfiger', (SELECT id FROM companies WHERE slug = 'pvh')),
  ('Calvin Klein', 'calvin-klein', (SELECT id FROM companies WHERE slug = 'pvh'))
ON CONFLICT (slug) DO NOTHING;

-- VF Corp brands
INSERT INTO brands (name, slug, company_id) VALUES
  ('The North Face', 'the-north-face', (SELECT id FROM companies WHERE slug = 'vf-corp')),
  ('Timberland', 'timberland', (SELECT id FROM companies WHERE slug = 'vf-corp')),
  ('Vans', 'vans', (SELECT id FROM companies WHERE slug = 'vf-corp'))
ON CONFLICT (slug) DO NOTHING;

-- Prada Group brands
INSERT INTO brands (name, slug, company_id) VALUES
  ('Miu Miu', 'miu-miu', (SELECT id FROM companies WHERE slug = 'prada-group'))
ON CONFLICT (slug) DO NOTHING;

-- Boyner Group brands
INSERT INTO brands (name, slug, company_id) VALUES
  ('Boyner', 'boyner', (SELECT id FROM companies WHERE slug = 'boyner-group'))
ON CONFLICT (slug) DO NOTHING;

-- Ceconomy brands
INSERT INTO brands (name, slug, company_id) VALUES
  ('MediaMarkt', 'mediamarkt', (SELECT id FROM companies WHERE slug = 'ceconomy'))
ON CONFLICT (slug) DO NOTHING;

-- Sabancı Holding brands
INSERT INTO brands (name, slug, company_id) VALUES
  ('Teknosa', 'teknosa', (SELECT id FROM companies WHERE slug = 'sabanci-holding'))
ON CONFLICT (slug) DO NOTHING;

-- AS Watson brands
INSERT INTO brands (name, slug, company_id) VALUES
  ('Watsons', 'watsons', (SELECT id FROM companies WHERE slug = 'as-watson'))
ON CONFLICT (slug) DO NOTHING;

-- Estee Lauder brands
INSERT INTO brands (name, slug, company_id) VALUES
  ('MAC', 'mac', (SELECT id FROM companies WHERE slug = 'estee-lauder')),
  ('Estee Lauder', 'estee-lauder', (SELECT id FROM companies WHERE slug = 'estee-lauder'))
ON CONFLICT (slug) DO NOTHING;

-- Ingka Group brands
INSERT INTO brands (name, slug, company_id) VALUES
  ('IKEA', 'ikea', (SELECT id FROM companies WHERE slug = 'ingka-group'))
ON CONFLICT (slug) DO NOTHING;

-- LC Waikiki (self-referencing parent)
INSERT INTO brands (name, slug, company_id) VALUES
  ('LC Waikiki', 'lc-waikiki', (SELECT id FROM companies WHERE slug = 'lc-waikiki'))
ON CONFLICT (slug) DO NOTHING;

-- Standalone brands (each FKs to its own same-name company row)
INSERT INTO brands (name, slug, company_id) VALUES
  ('Nike', 'nike', (SELECT id FROM companies WHERE slug = 'nike')),
  ('Adidas', 'adidas', (SELECT id FROM companies WHERE slug = 'adidas')),
  ('Puma', 'puma', (SELECT id FROM companies WHERE slug = 'puma')),
  ('New Balance', 'new-balance', (SELECT id FROM companies WHERE slug = 'new-balance')),
  ('Under Armour', 'under-armour', (SELECT id FROM companies WHERE slug = 'under-armour')),
  ('Reebok', 'reebok', (SELECT id FROM companies WHERE slug = 'reebok')),
  ('DeFacto', 'defacto', (SELECT id FROM companies WHERE slug = 'defacto')),
  ('Koton', 'koton', (SELECT id FROM companies WHERE slug = 'koton')),
  ('Mavi', 'mavi', (SELECT id FROM companies WHERE slug = 'mavi')),
  ('Vakko', 'vakko', (SELECT id FROM companies WHERE slug = 'vakko')),
  ('Beymen', 'beymen', (SELECT id FROM companies WHERE slug = 'beymen')),
  ('Ipekyol', 'ipekyol', (SELECT id FROM companies WHERE slug = 'ipekyol')),
  ('Colin''s', 'colins', (SELECT id FROM companies WHERE slug = 'colins')),
  ('Network', 'network', (SELECT id FROM companies WHERE slug = 'network')),
  ('Twist', 'twist', (SELECT id FROM companies WHERE slug = 'twist')),
  ('Machka', 'machka', (SELECT id FROM companies WHERE slug = 'machka')),
  ('Roman', 'roman', (SELECT id FROM companies WHERE slug = 'roman')),
  ('Burberry', 'burberry', (SELECT id FROM companies WHERE slug = 'burberry')),
  ('Prada', 'prada', (SELECT id FROM companies WHERE slug = 'prada')),
  ('Chanel', 'chanel', (SELECT id FROM companies WHERE slug = 'chanel')),
  ('Hermes', 'hermes', (SELECT id FROM companies WHERE slug = 'hermes')),
  ('Apple', 'apple', (SELECT id FROM companies WHERE slug = 'apple')),
  ('Samsung', 'samsung', (SELECT id FROM companies WHERE slug = 'samsung')),
  ('Vatan Bilgisayar', 'vatan-bilgisayar', (SELECT id FROM companies WHERE slug = 'vatan-bilgisayar')),
  ('Migros', 'migros', (SELECT id FROM companies WHERE slug = 'migros')),
  ('CarrefourSA', 'carrefoursa', (SELECT id FROM companies WHERE slug = 'carrefoursa')),
  ('BİM', 'bim', (SELECT id FROM companies WHERE slug = 'bim')),
  ('A101', 'a101', (SELECT id FROM companies WHERE slug = 'a101')),
  ('ŞOK', 'sok', (SELECT id FROM companies WHERE slug = 'sok')),
  ('Gratis', 'gratis', (SELECT id FROM companies WHERE slug = 'gratis')),
  ('L''Oreal', 'loreal', (SELECT id FROM companies WHERE slug = 'loreal')),
  ('Yves Rocher', 'yves-rocher', (SELECT id FROM companies WHERE slug = 'yves-rocher')),
  ('The Body Shop', 'the-body-shop', (SELECT id FROM companies WHERE slug = 'the-body-shop')),
  ('Koçtaş', 'koctas', (SELECT id FROM companies WHERE slug = 'koctas')),
  ('English Home', 'english-home', (SELECT id FROM companies WHERE slug = 'english-home')),
  ('Decathlon', 'decathlon', (SELECT id FROM companies WHERE slug = 'decathlon')),
  ('Levi''s', 'levis', (SELECT id FROM companies WHERE slug = 'levis')),
  ('Ralph Lauren', 'ralph-lauren', (SELECT id FROM companies WHERE slug = 'ralph-lauren')),
  ('Lacoste', 'lacoste', (SELECT id FROM companies WHERE slug = 'lacoste')),
  ('Mango', 'mango', (SELECT id FROM companies WHERE slug = 'mango')),
  ('Superdry', 'superdry', (SELECT id FROM companies WHERE slug = 'superdry')),
  ('Starbucks', 'starbucks', (SELECT id FROM companies WHERE slug = 'starbucks')),
  ('Amazon', 'amazon', (SELECT id FROM companies WHERE slug = 'amazon'))
ON CONFLICT (slug) DO NOTHING;


-- ── 3. VERIFICATION ────────────────────────────────────────────
-- Run after seed to verify counts. Expected: 61 companies, 96 brands.
-- SELECT 'companies' AS tbl, count(*) FROM companies
-- UNION ALL
-- SELECT 'brands', count(*) FROM brands;

COMMIT;


-- ═══════════════════════════════════════════════════════════════
-- EDGE CASES HANDLED:
--
-- 1. Prada (standalone brand) vs Prada Group (parent of Miu Miu):
--    Two separate company rows — slugs 'prada' and 'prada-group'.
--    Prada the brand FKs to company 'prada'.
--    Miu Miu FKs to company 'prada-group'.
--    This matches BRAND_DB where Prada has parent:'' but Miu Miu
--    has parent:'Prada Group'.
--
-- 2. Self-referencing parents (İnditex, Fiba Retail, Estee Lauder):
--    These appear in BRAND_DB with parent:'' but other brands
--    reference them as parents. They get one company row (from
--    the parent group derivation) and one brand row (same name,
--    same slug, FK to self).
--
-- 3. LC Waikiki (name === parent):
--    {name:'LC Waikiki', parent:'LC Waikiki'} — one company row
--    and one brand row, both slug 'lc-waikiki'. Brand FKs to
--    its own company. Treated same as other parent groups.
--
-- 4. Brand slug = company slug (standalone brands):
--    e.g. Nike brand slug 'nike' = Nike company slug 'nike'.
--    No conflict — different tables, different UNIQUE constraints.
--
-- 5. Estee Lauder brand slug = Estee Lauder company slug:
--    Brand 'estee-lauder' FKs to company 'estee-lauder'. The brand
--    row represents the retail brand; the company row represents
--    the parent corporation. Same entity, dual purpose — correct.
-- ═══════════════════════════════════════════════════════════════
