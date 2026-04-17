/**
 * K032 Faz 2 — Authenticated Panel Hash Runtime Smoke
 *
 * profil.html icindeki 13 panel hash iterasyonu. Her hash icin fresh page,
 * storageState-backed login (playwright.config.js `.e2e.spec.js` matcher
 * otomatik inject eder, setup dependency). Panel activation sonrasi
 * pageerror/console.error collector. Faz 1 ile ayni IGNORE/REGRESSION tablosu.
 *
 * Yakalanan yeni sinif hatalar (Faz 1 kapsaminda olmayan):
 *   - Panel render fn boot hatasi (undefined ref, yanlis destructuring)
 *   - User-aware RPC typo (get_candidate_* signatur farki)
 *   - Dark mode panel-specific DOM operation bug
 *
 * Kapsam disi (Faz 2 sonraki sprint): ik.html tab, admin.html tab iterasyonu.
 */

const { test, expect } = require('@playwright/test');

const PANEL_HASHES = [
  'genel', 'merkez', 'sirketler', 'kimbakti', 'mulakat',
  'yetkinlik', 'firsatlar', 'inbox', 'bildirimler', 'ayarlar',
  'premium', 'destek', 'profil',
];

const THEMES = ['light', 'dark'];

const IGNORE_PATTERNS = [
  /supabase/i,
  /cpwibefquojehjehtrog\.supabase\.co/i,
  /posthog/i,
  /sentry|browser\.sentry-cdn\.com|ingest\.de\.sentry\.io/i,
  /cloudflare|turnstile|challenges\.cloudflare\.com/i,
  /redirecting to giris\.html/i,
  /giris\.html\?tab=/,
  /demo-dashboard-ik\.html/,
  /Refused to load|Content Security Policy/i,
];

const REGRESSION_PATTERNS = [
  /ReferenceError/,
  /TypeError/,
  /SyntaxError/,
  /Unexpected token/,
  /Unexpected end of input/i,
  /is not defined/,
  /Cannot read propert/i,
  /Cannot read properties of (null|undefined)/i,
  /is not a function/,
];

function shouldIgnore(msg) {
  if (!msg) return true;
  return IGNORE_PATTERNS.some(function (re) { return re.test(msg); });
}

function isRegression(msg) {
  return REGRESSION_PATTERNS.some(function (re) { return re.test(msg); });
}

function attachCollectors(page) {
  const signals = [];
  page.on('pageerror', function (err) {
    signals.push({ kind: 'pageerror', message: err && err.message ? err.message : String(err) });
  });
  page.on('console', function (msg) {
    if (msg.type() !== 'error') return;
    let text = '';
    try { text = msg.text(); } catch (e) { text = ''; }
    signals.push({ kind: 'console', message: text });
  });
  return signals;
}

for (const theme of THEMES) {
  test.describe('K032 Faz 2 Auth Panel Hash / ' + theme, function () {
    test.beforeEach(async function ({ page }) {
      await page.addInitScript(function (pref) {
        try { localStorage.setItem('ht_theme_preference', pref); } catch (e) {}
      }, theme);
    });

    for (const hash of PANEL_HASHES) {
      test('profil #' + hash + ' runtime smoke', async function ({ page }) {
        const signals = attachCollectors(page);

        await page.goto('/profil.html#' + hash, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(function (err) {
          const msg = (err && err.message) ? err.message : String(err);
          if (!/Timeout|timeout/.test(msg)) throw err;
        });
        await page.waitForTimeout(1800);

        const activePanel = await page.locator('.panel.active').getAttribute('data-panel').catch(function () { return null; });

        const critical = signals
          .filter(function (s) { return !shouldIgnore(s.message); })
          .filter(function (s) { return isRegression(s.message); });

        if (critical.length) {
          console.log('K032 Faz 2 critical signals on #' + hash + ' [' + theme + '] (active=' + activePanel + '):');
          critical.forEach(function (s) { console.log('  -', s.kind, s.message); });
        }

        expect(critical, 'Faz 2 runtime regressions on /profil.html#' + hash + ' (' + theme + ', active=' + activePanel + ')').toEqual([]);
      });
    }
  });
}
