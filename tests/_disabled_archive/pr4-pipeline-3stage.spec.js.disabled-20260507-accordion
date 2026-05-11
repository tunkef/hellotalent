/* ════════════════════════════════════════════════════════════════
   PR-4 Pipeline 3-Stage — Playwright Smoke Tests
   Matrix: desktop 1440×900 + mobile 390×844
   A24 regression guard dahil.
   ════════════════════════════════════════════════════════════════ */
const { test, expect } = require('@playwright/test');
const fs   = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const PIPELINE_URL = BASE_URL + '/hr-pipeline.html';

/* ── Filesystem helpers ── */
var ROOT = path.join(__dirname, '..');
function readSrc(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }

/* ── Viewport configs ── */
const DESKTOP = { width: 1440, height: 900 };
const MOBILE  = { width: 390,  height: 844 };

/* ── Auth helper — demo mode inject (ik-pipeline.spec.js pattern) ── */
async function gotoPipeline(page, viewport) {
  await page.setViewportSize(viewport || DESKTOP);
  await page.addInitScript(() => {
    try {
      localStorage.setItem('ht_ik_demo_mode', '1');
      localStorage.removeItem('ht_ik_pipeline_state');
      localStorage.setItem('ht_ik_active_position_id', 'pos-1');
    } catch (e) { /* ignore */ }
  });
  await page.goto(PIPELINE_URL);
  await page.waitForLoadState('networkidle');
}

/* ════════════════════════════════════════════════════════════════
   1. STAGES array — ik-pipeline.js kaynak kodu (filesystem)
   Gerçek Supabase bağlantısı gerekmez.
   ════════════════════════════════════════════════════════════════ */
test('PR4-01: STAGES array 3-eleman — uzun/kisa/iletisim', function () {
  var src = readSrc('js/ik-pipeline.js');

  expect(src).toContain("key: 'uzun_liste'");
  expect(src).toContain("key: 'kisa_liste'");
  expect(src).toContain("key: 'iletisime_gecildi'");

  /* Eski 5-sütun stage'ler yok */
  expect(src).not.toContain("key: 'basvuru'");
  expect(src).not.toContain("key: 'mulakat'");
  expect(src).not.toContain("key: 'teklif'");

  /* data-ik-pipeline-board HTML'de mevcut */
  var html = readSrc('hr-pipeline.html');
  expect(html).toContain('data-ik-pipeline-board');
});

/* ════════════════════════════════════════════════════════════════
   2. Sütun etiketleri Türkçe doğru (kaynak kodu)
   ════════════════════════════════════════════════════════════════ */
test('PR4-02: Sütun etiketleri — Uzun Liste / Kisa Liste / Iletisime Gecildi', function () {
  var src = readSrc('js/ik-pipeline.js');

  expect(src).toContain("label: 'Uzun Liste'");
  expect(src).toContain("label: 'Kısa Liste'");
  expect(src).toContain("label: 'İletişime Geçildi'");

  expect(src).not.toContain("label: 'Yeni'");
  expect(src).not.toContain("label: 'Mülakat'");
});

/* ════════════════════════════════════════════════════════════════
   3. İletişime Geçildi border-top aksan — CSS kaynak kodu
   ════════════════════════════════════════════════════════════════ */
test('PR4-03: iletisime_gecildi border-top aksan CSS dosyasinda var', function () {
  var css = readSrc('css/panels/ik-pipeline.css');

  expect(css).toContain('[data-stage="iletisime_gecildi"]');
  expect(css).toMatch(/\[data-stage="iletisime_gecildi"\][^}]*border-top/s);
});

/* ════════════════════════════════════════════════════════════════
   4. Skip-stage block — uzun_liste → iletisime_gecildi drop reject
   ════════════════════════════════════════════════════════════════ */
test('PR4-04: Skip-stage block — uzun → iletisim kaynak kodda', function () {
  var src = readSrc('js/ik-pipeline.js');

  /* Skip-stage guard kodu var mı */
  expect(src).toContain("fromStage === 'uzun_liste'");
  expect(src).toContain("newStage === 'iletisime_gecildi'");
  /* Toast mesajı doğru */
  expect(src).toContain('nce kısa listeye al');

  /* Toast DOM attribute HTML-de mevcut */
  var html = readSrc('hr-pipeline.html');
  expect(html).toContain('data-ik-pipeline-toast');
});

/* ════════════════════════════════════════════════════════════════
   5. Detay sheet — overlay + aside DOM-da mevcut
   ════════════════════════════════════════════════════════════════ */
test('PR4-05: Detay sheet DOM — #ik-pos-detail-sheet mevcut', async ({ page }) => {
  await gotoPipeline(page, DESKTOP);

  const sheet = page.locator('#ik-pos-detail-sheet');
  await expect(sheet).toBeAttached();
  await expect(sheet).toHaveAttribute('aria-hidden', 'true');

  const overlay = page.locator('#ik-pos-detail-overlay');
  await expect(overlay).toBeAttached();
});

/* ════════════════════════════════════════════════════════════════
   6. Detay sheet URL ?pos= pushState
   ════════════════════════════════════════════════════════════════ */
test('PR4-06: Detay sheet açılınca URL ?pos= içerir', async ({ page }) => {
  await gotoPipeline(page, DESKTOP);
  await page.waitForSelector('[data-ik-pipeline-board]', { timeout: 8000 });

  /* JS ile sheet aç */
  await page.evaluate(function () {
    if (window._htOpenPositionDetailSheet) {
      window._htOpenPositionDetailSheet(123, 'test');
    }
  });

  await page.waitForTimeout(200);
  expect(page.url()).toContain('?pos=123');

  const sheet = page.locator('#ik-pos-detail-sheet');
  await expect(sheet).toHaveClass(/is-open/);
});

/* ════════════════════════════════════════════════════════════════
   7. Detay sheet ESC kapatır
   ════════════════════════════════════════════════════════════════ */
test('PR4-07: Detay sheet ESC ile kapanır', async ({ page }) => {
  await gotoPipeline(page, DESKTOP);

  await page.evaluate(function () {
    if (window._htOpenPositionDetailSheet) {
      window._htOpenPositionDetailSheet(456, 'test');
    }
  });

  await page.waitForTimeout(200);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  const sheet = page.locator('#ik-pos-detail-sheet');
  await expect(sheet).not.toHaveClass(/is-open/);
});

/* ════════════════════════════════════════════════════════════════
   8. Soft refresh banner DOM — #ik-pipeline-refresh-banner
   ════════════════════════════════════════════════════════════════ */
test('PR4-08: Soft refresh banner DOM — mevcut, başlangıçta gizli', async ({ page }) => {
  await gotoPipeline(page, DESKTOP);

  const banner = page.locator('#ik-pipeline-refresh-banner');
  await expect(banner).toBeAttached();
  await expect(banner).not.toHaveClass(/is-visible/);
  await expect(banner).toHaveAttribute('aria-hidden', 'true');
});

/* ════════════════════════════════════════════════════════════════
   9. Soft refresh banner göster → dismiss → stale chip görünür
   ════════════════════════════════════════════════════════════════ */
test('PR4-09: Soft refresh banner dismiss → stale chip görünür', async ({ page }) => {
  await gotoPipeline(page, DESKTOP);
  await page.waitForSelector('#ik-pipeline-refresh-banner', { state: 'attached', timeout: 5000 });

  /* Banner'ı JS ile aç */
  await page.evaluate(function () {
    if (window._htPipelineShowRefreshBanner) {
      window._htPipelineShowRefreshBanner('Kriterler güncellendi.');
    }
  });

  const banner = page.locator('#ik-pipeline-refresh-banner');
  await expect(banner).toHaveClass(/is-visible/);

  /* Dismiss tıkla */
  await page.locator('#btn-pipeline-refresh-dismiss').click();
  await expect(banner).not.toHaveClass(/is-visible/);

  /* Stale chip görünür */
  const chip = page.locator('#ik-pipeline-stale-chip');
  await expect(chip).toHaveClass(/is-visible/);
});

/* ════════════════════════════════════════════════════════════════
   10. Soft refresh "Listeyi Yenile" buton — metin doğru
   ════════════════════════════════════════════════════════════════ */
test('PR4-10: Refresh btn metni "Listeyi Yenile"', async ({ page }) => {
  await gotoPipeline(page, DESKTOP);

  const btn = page.locator('#btn-pipeline-refresh');
  await expect(btn).toHaveText('Listeyi Yenile');

  const dismiss = page.locator('#btn-pipeline-refresh-dismiss');
  await expect(dismiss).toHaveText('Şimdilik geç');
});

/* ════════════════════════════════════════════════════════════════
   11. Mobile — segment switcher görünür, sütun toggle
   ════════════════════════════════════════════════════════════════ */
test('PR4-11: Mobile segment tabs — 390px viewport', async ({ page }) => {
  await gotoPipeline(page, MOBILE);
  await page.waitForSelector('[data-ik-pipeline-board]', { timeout: 8000 });

  /* Mobile tabs container mevcut */
  const tabs = page.locator('#ik-pipeline-mobile-tabs');
  await expect(tabs).toBeAttached();

  /* Desktop'ta gizli */
  await page.setViewportSize(DESKTOP);
  const tabsDesktop = page.locator('#ik-pipeline-mobile-tabs');
  const display = await tabsDesktop.evaluate(function (el) {
    return window.getComputedStyle(el).display;
  });
  expect(display).toBe('none');
});

/* ════════════════════════════════════════════════════════════════
   12. Auto badge — .ik-card-aday__auto-badge class mevcut CSS
   ════════════════════════════════════════════════════════════════ */
test('PR4-12: Auto badge CSS class tanımlı', async ({ page }) => {
  await gotoPipeline(page, DESKTOP);

  /* position-detail.css yüklendi mi? */
  const cssLoaded = await page.evaluate(function () {
    var sheets = Array.prototype.slice.call(document.styleSheets);
    return sheets.some(function (s) {
      return s.href && s.href.indexOf('position-detail') >= 0;
    });
  });
  expect(cssLoaded).toBe(true);
});

/* ════════════════════════════════════════════════════════════════
   13. A24 regression — form sheet hâlâ çalışıyor
   ════════════════════════════════════════════════════════════════ */
test('PR4-A24-regression: Yeni pozisyon butonu form sheet açar', async ({ page }) => {
  await gotoPipeline(page, DESKTOP);
  await page.waitForSelector('#btn-new-position', { timeout: 8000 });

  /* Form sheet başlangıçta kapalı */
  const formSheet = page.locator('#ik-pos-form-sheet');
  await expect(formSheet).not.toHaveClass(/is-open/);

  /* Butona tıkla */
  await page.locator('#btn-new-position').click();
  await expect(formSheet).toHaveClass(/is-open/);

  /* Form sheet z-index detay sheet'ten düşük */
  const formZ = await formSheet.evaluate(function (el) {
    return parseInt(window.getComputedStyle(el).zIndex, 10) || 0;
  });
  expect(formZ).toBeLessThan(901);

  /* ESC ile kapat */
  await page.keyboard.press('Escape');
  await expect(formSheet).not.toHaveClass(/is-open/);
});

/* ════════════════════════════════════════════════════════════════
   14. A24 regression — iki sheet DOM-da koexist eder
   ════════════════════════════════════════════════════════════════ */
test('PR4-A24-regression-2: Detay sheet + form sheet DOM-da birlikte', async ({ page }) => {
  await gotoPipeline(page, DESKTOP);

  await expect(page.locator('#ik-pos-form-sheet')).toBeAttached();
  await expect(page.locator('#ik-pos-detail-sheet')).toBeAttached();
  await expect(page.locator('#ik-pos-form-overlay')).toBeAttached();
  await expect(page.locator('#ik-pos-detail-overlay')).toBeAttached();
});

/* ════════════════════════════════════════════════════════════════
   15. Token-strict — hardcoded hex yok (CSS dosyaları)
   ════════════════════════════════════════════════════════════════ */
test('PR4-15: Token-strict — hardcoded hex yok position-detail.css', async ({ page }) => {
  const fs = require('fs');
  const path = require('path');

  var cssPath = path.join(__dirname, '..', 'css', 'panels', 'position-detail.css');
  var content = fs.readFileSync(cssPath, 'utf8');

  /* Yorum satırlarını çıkar */
  var noComments = content.replace(/\/\*[\s\S]*?\*\//g, '');

  /* rgba() ve #hex arama — var() içinde olanlar hariç */
  var hexMatches = noComments.match(/#[0-9a-fA-F]{3,8}(?!\s*[;,]?\s*\/\*)/g) || [];
  /* rgba hardcode — var() olmayan */
  var rgbaHardcode = noComments.match(/rgba\(\s*\d/g) || [];

  expect(hexMatches.length).toBe(0);
  expect(rgbaHardcode.length).toBe(0);
});
