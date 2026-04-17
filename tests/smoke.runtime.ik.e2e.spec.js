/**
 * K032 Faz 3A — ik.html authenticated panel hash runtime smoke.
 *
 * Gerçek employer dashboard (demo-dashboard-ik.html DEĞİL). Test user
 * tkefeli@peoplein.com.tr app_metadata.role='employer' ile seed'li.
 * Login sonrasi demo'ya yönleniyor, test /ik.html URL'e direkt goto
 * eder; auth guard role='employer' kontrolünden geçer.
 *
 * 10 panel hash (dashboard/search/pozisyonlar/favoriler/takipciler/
 * mesajlar/kampanyalar/sirket/ekip/ayarlar) × 2 tema × 2 viewport = 40 test.
 */

const { test, expect } = require('@playwright/test');

const IK_PANEL_HASHES = [
  'dashboard', 'search', 'pozisyonlar', 'favoriler', 'takipciler',
  'mesajlar', 'kampanyalar', 'sirket', 'ekip', 'ayarlar',
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
  test.describe('K032 Faz 3A ik.html Panel Hash / ' + theme, function () {
    test.beforeEach(async function ({ page }) {
      await page.addInitScript(function (pref) {
        try { localStorage.setItem('ht_theme_preference', pref); } catch (e) {}
      }, theme);
    });

    for (const hash of IK_PANEL_HASHES) {
      test('ik #' + hash + ' runtime smoke', async function ({ page }) {
        const signals = attachCollectors(page);

        await page.goto('/ik.html#' + hash, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(function (err) {
          const msg = (err && err.message) ? err.message : String(err);
          if (!/Timeout|timeout/.test(msg)) throw err;
        });
        await page.waitForTimeout(1800);

        const url = page.url();
        const redirectedToLogin = /giris\.html/.test(url);

        const critical = signals
          .filter(function (s) { return !shouldIgnore(s.message); })
          .filter(function (s) { return isRegression(s.message); });

        if (critical.length) {
          console.log('K032 Faz 3A critical signals on #' + hash + ' [' + theme + '] (url=' + url + '):');
          critical.forEach(function (s) { console.log('  -', s.kind, s.message); });
        }

        expect(critical, 'Faz 3A runtime regressions on /ik.html#' + hash + ' (' + theme + ')').toEqual([]);
        expect(redirectedToLogin, 'ik.html auth guard rejected employer — /giris.html redirect').toBe(false);
      });
    }
  });
}
