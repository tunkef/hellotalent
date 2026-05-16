/* HR Pool havuz smoke + integration testi — Sprint 2 / FAZ B
   Kapsam:
   - Markup: search + filter chip + sort + bulk + list + drawer + pagination
   - Demo data load: candidates.json (50), positions.json (5)
   - Adapter genisleme: searchCandidates filter (sehir/segment/pozisyon/musaitlik)
   - Adapter genisleme: addToPipeline overlay persist + idempotent
   - Sort secenekleri: match / updated / name / experience
   - Sayfa-spesifik CSS: hr-pool.css yuklenmis
   - JS modul: FILTER_DEFS + SORT_OPTIONS + state (HR_POOL_TEST flag)
   - Sprint 1 ortakligi: drawer + position switcher menu + toast
*/
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function readFile(p) {
  return fs.readFileSync(path.join(ROOT, p), 'utf8');
}
function readJson(p) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
}

test.describe('FAZ B Sprint 2 — HR Pool havuz', () => {

  /* ════════════════════════════════════════════════
     Asset varligi
     ════════════════════════════════════════════════ */
  test('Yeni Sprint 2 dosyalari diskte', () => {
    expect(fs.existsSync(path.join(ROOT, 'css/hr-pool.css')), 'css/hr-pool.css').toBeTruthy();
    expect(fs.existsSync(path.join(ROOT, 'js/hr-pool.js')), 'js/hr-pool.js').toBeTruthy();
    expect(fs.existsSync(path.join(ROOT, 'hr-pool.html')), 'hr-pool.html').toBeTruthy();
  });

  test('hr-pool.html boyut Sprint 0 placeholderdan buyuk', () => {
    const html = readFile('hr-pool.html');
    // Sprint 0 placeholder ~3.5KB. Sprint 2 dolu sayfa minimum 8KB+
    expect(html.length).toBeGreaterThan(8000);
  });

  test('hr-pool.js boyut iskelet seviyesinden buyuk', () => {
    const js = readFile('js/hr-pool.js');
    // Sprint 0 iskelet ~370 byte. Sprint 2 minimum 15KB+
    expect(js.length).toBeGreaterThan(15000);
  });

  test('hr-pool.css yuklenmis (sayfa-spesifik)', () => {
    const css = readFile('css/hr-pool.css');
    expect(css.length).toBeGreaterThan(8000);
    expect(css).toContain('.hr-pool-toolbar');
    expect(css).toContain('.hr-pool-list');
    expect(css).toContain('.hr-pool-row');
    expect(css).toContain('.hr-pool-bulk');
    expect(css).toContain('.hr-pool-chip');
    expect(css).toContain('.hr-pool-sort');
    expect(css).toContain('.hr-pool-empty');
    expect(css).toContain('.hr-drawer');
  });

  /* ════════════════════════════════════════════════
     Markup — master pattern + Sprint 1 ortak iskelet
     ════════════════════════════════════════════════ */
  test('hr-pool.html — master pattern (lp-hdr + hr-subnav)', () => {
    const html = readFile('hr-pool.html');
    expect(html).toContain('<header class="lp-hdr">');
    expect(html).toContain('class="lp-logo"');
    expect(html).toContain('<a class="skip-to-content"');
    expect(html).toContain('data-hr-page="pool"');
    expect(html).toContain('class="hr-subnav"');
    expect(html).toContain('<nav class="hr-subnav"');
    expect(html).toContain('data-hr-link="pool"');
  });

  test('hr-pool.html — position switcher (Sprint 1 patten)', () => {
    const html = readFile('hr-pool.html');
    expect(html).toContain('data-hr-position-btn');
    expect(html).toContain('data-hr-position-menu');
    expect(html).toContain('data-hr-position-value');
    expect(html).toContain('data-hr-position-loading');
    expect(html).toContain('hr-position-switcher-wrap');
  });

  test('hr-pool.html — meta bar 3 alan', () => {
    const html = readFile('hr-pool.html');
    expect(html).toContain('data-hr-pool-position');
    expect(html).toContain('data-hr-pool-total');
    expect(html).toContain('data-hr-pool-shown');
    expect(html).toContain('class="hr-pl-meta"');
  });

  test('hr-pool.html — toolbar (search + sort + filter chip)', () => {
    const html = readFile('hr-pool.html');
    expect(html).toContain('data-hr-pool-search');
    expect(html).toContain('data-hr-pool-search-clear');
    expect(html).toContain('data-hr-pool-sort-btn');
    expect(html).toContain('data-hr-pool-sort-menu');
    expect(html).toContain('data-hr-pool-sort-current');
    expect(html).toContain('data-hr-pool-filters');
    expect(html).toContain('data-hr-pool-active');
    expect(html).toContain('placeholder="Aday adı, pozisyon veya marka yazın');
  });

  test('hr-pool.html — bulk action bar', () => {
    const html = readFile('hr-pool.html');
    expect(html).toContain('data-hr-pool-bulk');
    expect(html).toContain('data-hr-pool-bulk-count');
    expect(html).toContain('data-hr-pool-bulk-clear');
    expect(html).toContain('data-hr-pool-bulk-add');
    expect(html).toContain("Pipeline'a ekle");
    expect(html).toContain('aday seçildi');
  });

  test('hr-pool.html — list + select-all + empty + pagination', () => {
    const html = readFile('hr-pool.html');
    expect(html).toContain('data-hr-pool-list');
    expect(html).toContain('data-hr-pool-select-all');
    expect(html).toContain('data-hr-pool-list-info');
    expect(html).toContain('data-hr-pool-empty');
    expect(html).toContain('data-hr-pool-loading');
    expect(html).toContain('data-hr-pool-paginate');
    expect(html).toContain('data-hr-pool-paginate-info');
    expect(html).toContain('data-hr-pool-more');
    expect(html).toContain('data-hr-pool-reset');
    expect(html).toContain('Daha fazla göster');
    expect(html).toContain('Filtreleri sıfırla');
    expect(html).toContain('Filtrelere uyan aday yok');
  });

  test('hr-pool.html — drawer (Sprint 1 ortak iskelet)', () => {
    const html = readFile('hr-pool.html');
    expect(html).toContain('data-hr-drawer');
    expect(html).toContain('data-hr-drawer-backdrop');
    expect(html).toContain('data-hr-drawer-close');
    expect(html).toContain('data-hr-drawer-body');
    expect(html).toContain('data-hr-drawer-id');
    expect(html).toContain('class="hr-drawer__panel"');
  });

  test('hr-pool.html — toast', () => {
    const html = readFile('hr-pool.html');
    expect(html).toContain('data-hr-toast');
    expect(html).toContain('aria-live="polite"');
  });

  test('hr-pool.html — script defer order (shell → data → pool)', () => {
    const html = readFile('hr-pool.html');
    const shellIdx = html.indexOf('hr-shell.js');
    const dataIdx  = html.indexOf('hr-data.js');
    const poolIdx  = html.indexOf('hr-pool.js');
    expect(shellIdx).toBeGreaterThan(0);
    expect(dataIdx).toBeGreaterThan(shellIdx);
    expect(poolIdx).toBeGreaterThan(dataIdx);
  });

  test('hr-pool.html — CSS yukleme sirasi (tokens → shared → shell → pool)', () => {
    const html = readFile('hr-pool.html');
    const tokensIdx = html.indexOf('css/tokens.css');
    const sharedIdx = html.indexOf('shared-v2.css');
    const shellIdx  = html.indexOf('css/hr-shell.css');
    const poolIdx   = html.indexOf('css/hr-pool.css');
    expect(tokensIdx).toBeGreaterThan(0);
    expect(sharedIdx).toBeGreaterThan(tokensIdx);
    expect(shellIdx).toBeGreaterThan(sharedIdx);
    expect(poolIdx).toBeGreaterThan(shellIdx);
  });

  test('hr-pool.html — Turkce dil tutarli, "siz" hitabi', () => {
    const html = readFile('hr-pool.html');
    expect(html).toContain('lang="tr"');
    expect(html).toContain('Aday arama');
    expect(html).toContain('Aday havuzu');
    // röportaj YASAK
    expect(html).not.toContain('röportaj');
    // Inter / Roboto YASAK
    expect(html).not.toContain('Inter');
    expect(html).not.toContain('Roboto');
  });

  test('hr-pool.html — CSP unchanged (Sprint 1 ile ayni)', () => {
    const html = readFile('hr-pool.html');
    expect(html).toContain("default-src 'self'");
    expect(html).toContain("frame-ancestors 'none'");
    expect(html).toContain("object-src 'none'");
  });

  /* ════════════════════════════════════════════════
     Demo data
     ════════════════════════════════════════════════ */
  test('candidates.json — 50 aday + zorunlu alanlar', () => {
    const rows = readJson('data/demo/candidates.json');
    expect(Array.isArray(rows)).toBeTruthy();
    expect(rows.length).toBe(50);
    rows.forEach((r) => {
      expect(r.id).toBeTruthy();
      expect(r.full_name).toBeTruthy();
      expect(r.pozisyon).toBeTruthy();
      expect(r.sehir).toBeTruthy();
      expect(['luks','premium','high-street']).toContain(r.segment);
      expect(typeof r.deneyim_yil).toBe('number');
      expect(Array.isArray(r.markalar)).toBeTruthy();
      expect(r.musaitlik).toBeTruthy();
      expect(r.updated_at).toBeTruthy();
    });
  });

  test('positions.json — Sprint 1 ile ayni 5 pozisyon', () => {
    const rows = readJson('data/demo/positions.json');
    expect(rows.length).toBe(5);
    expect(rows[0].id).toBe('pos-1');
  });

  /* ════════════════════════════════════════════════
     JS modul — state, helpers, filter logic
     ════════════════════════════════════════════════ */
  test('hr-pool.js — IIFE + use strict + XSS-safe', () => {
    const js = readFile('js/hr-pool.js');
    expect(js).toContain("'use strict'");
    expect(js).toMatch(/\(function\s*\(\)\s*\{[\s\S]*\}\)\(\);?\s*$/);
    // innerHTML kesinlikle yok (XSS)
    expect(js).not.toContain('.innerHTML');
    // textContent + createElement kullanılmış
    expect(js).toContain('textContent');
    expect(js).toContain('createElement');
  });

  test('hr-pool.js — FILTER_DEFS 4 chip + SORT_OPTIONS 4 secenek', () => {
    const js = readFile('js/hr-pool.js');
    expect(js).toContain("key: 'sehir'");
    expect(js).toContain("key: 'pozisyon'");
    expect(js).toContain("key: 'segment'");
    expect(js).toContain("key: 'musaitlik'");
    expect(js).toContain("key: 'match'");
    expect(js).toContain("key: 'updated'");
    expect(js).toContain("key: 'name'");
    expect(js).toContain("key: 'experience'");
  });

  test('hr-pool.js — debounce 300ms + page size 20', () => {
    const js = readFile('js/hr-pool.js');
    expect(js).toContain('SEARCH_DEBOUNCE_MS = 300');
    expect(js).toContain('PAGE_SIZE = 20');
  });

  test('hr-pool.js — match score + tier helper', () => {
    const js = readFile('js/hr-pool.js');
    expect(js).toContain('function computeMatchScore');
    expect(js).toContain('function matchTier');
    expect(js).toContain("score >= 80");
    expect(js).toContain("score >= 60");
  });

  test('hr-pool.js — bulk + addOneToPipeline + addBulkToPipeline', () => {
    const js = readFile('js/hr-pool.js');
    expect(js).toContain('function addOneToPipeline');
    expect(js).toContain('function addBulkToPipeline');
    expect(js).toContain('updateBulkBar');
    expect(js).toContain('selectedIds');
    expect(js).toContain('selectedCount');
  });

  test('hr-pool.js — pipeline overlay localStorage key Sprint 1 ile uyumlu', () => {
    const js = readFile('js/hr-pool.js');
    expect(js).toContain("'ht_hr_pipeline_demo_state'");
  });

  test('hr-pool.js — drawer pattern (Sprint 1 ortak)', () => {
    const js = readFile('js/hr-pool.js');
    expect(js).toContain('function openDrawer');
    expect(js).toContain('function closeDrawer');
    expect(js).toContain('renderDrawerCandidate');
    expect(js).toContain("e.key === 'Escape'");
  });

  test('hr-pool.js — auth gate (HRShell.ready) + position context', () => {
    const js = readFile('js/hr-pool.js');
    expect(js).toContain('HRShell.ready');
    expect(js).toContain('getActivePosition');
    expect(js).toContain('setActivePosition');
    expect(js).toContain("hr:position-changed");
  });

  test('hr-pool.js — URL param: from=pipeline&position=…', () => {
    const js = readFile('js/hr-pool.js');
    expect(js).toContain("URLSearchParams");
    expect(js).toContain("params.get('position')");
  });

  /* ════════════════════════════════════════════════
     Adapter — searchCandidates filter genisleme
     ════════════════════════════════════════════════ */
  test('hr-data.js — searchCandidates yeni filter alanlari', () => {
    const js = readFile('js/hr-data.js');
    expect(js).toContain('f.pozisyon');
    expect(js).toContain('f.musaitlik');
    expect(js).toContain('f.calisma_tipi');
    expect(js).toContain('f.sehir');
    expect(js).toContain('f.segment');
  });

  test('hr-data.js — searchCandidates sort opt', () => {
    const js = readFile('js/hr-data.js');
    expect(js).toContain("opts.sort === 'updated'");
    expect(js).toContain("opts.sort === 'name'");
    expect(js).toContain("opts.sort === 'experience'");
  });

  test('hr-data.js — addToPipeline overlay persist + idempotent', () => {
    const js = readFile('js/hr-data.js');
    expect(js).toContain('writePipelineOverlay');
    expect(js).toContain('readPipelineOverlay');
    // Idempotent kontrol — ayni candidate+position cift eklenmemeli
    expect(js).toMatch(/duplicate/);
  });

  test('hr-data.js — _invalidate cache helper', () => {
    const js = readFile('js/hr-data.js');
    expect(js).toContain('function invalidate');
    expect(js).toContain('_invalidate');
  });

  /* ════════════════════════════════════════════════
     Mobile responsive
     ════════════════════════════════════════════════ */
  test('hr-pool.css — mobile breakpoint (640 + 480)', () => {
    const css = readFile('css/hr-pool.css');
    expect(css).toContain('@media (max-width: 640px)');
    expect(css).toContain('@media (max-width: 480px)');
    // Filter chips horizontal scroll
    expect(css).toContain('overflow-x: auto');
  });

  test('hr-pool.css — dark mode override', () => {
    const css = readFile('css/hr-pool.css');
    expect(css).toContain('html.dark');
    expect(css).toContain('html[data-theme="dark"]');
    expect(css).toContain('@media (prefers-color-scheme: dark)');
  });

  /* ════════════════════════════════════════════════
     Static markup smoke (HTTP server, no auth gate render — HRShell redirect olur)
     Sadece response 200 + HTML disinda hizli kontrol
     ════════════════════════════════════════════════ */
  test('hr-pool.html HTTP 200 dondurur', async ({ request }) => {
    const res = await request.get('/hr-pool.html');
    expect(res.status()).toBeLessThan(400);
    const txt = await res.text();
    expect(txt).toContain('<title>Havuz');
    expect(txt).toContain('data-hr-pool-search');
  });

  test('css/hr-pool.css HTTP 200 dondurur', async ({ request }) => {
    const res = await request.get('/css/hr-pool.css');
    expect(res.status()).toBeLessThan(400);
    const txt = await res.text();
    expect(txt).toContain('.hr-pool-toolbar');
  });

  test('js/hr-pool.js HTTP 200 dondurur', async ({ request }) => {
    const res = await request.get('/js/hr-pool.js');
    expect(res.status()).toBeLessThan(400);
    const txt = await res.text();
    expect(txt).toContain("'use strict'");
  });

  test('data/demo/candidates.json HTTP 200 dondurur', async ({ request }) => {
    const res = await request.get('/data/demo/candidates.json');
    expect(res.status()).toBeLessThan(400);
    const arr = await res.json();
    expect(arr.length).toBe(50);
  });

});
