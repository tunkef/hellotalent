/**
 * K032 Faz 3B — admin.html authenticated panel hash runtime smoke.
 *
 * Platform admin panel. Test user admin+k032@peoplein.com.tr
 * app_metadata.role='admin' + admin_users row seed'li. is_admin()
 * RPC admin_users tablosunda EXISTS check ediyor.
 *
 * 12 panel hash (dashboard/review/campaigns/announcements/support/
 * candidates/brands/employers/leads/sales/team/settings) × 2 tema ×
 * 2 viewport = 48 test.
 *
 * Login sonrasi candidate branch'a duser (role!=employer), profil.html
 * redirect. Test /admin.html URL'e direkt goto eder; auth guard
 * is_admin()=true kontrolunden gecer.
 */

const { test, expect } = require('@playwright/test');

const ADMIN_PANEL_HASHES = [
  'dashboard', 'review', 'campaigns', 'announcements', 'support',
  'candidates', 'brands', 'employers', 'leads', 'sales', 'team', 'settings',
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
  test.describe('K032 Faz 3B admin.html Panel Hash / ' + theme, function () {
    test.beforeEach(async function ({ page }) {
      await page.addInitScript(function (pref) {
        try { localStorage.setItem('ht_theme_preference', pref); } catch (e) {}
      }, theme);
    });

    for (const hash of ADMIN_PANEL_HASHES) {
      test('admin #' + hash + ' runtime smoke', async function ({ page }) {
        const signals = attachCollectors(page);

        await page.goto('/admin.html#' + hash, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(function (err) {
          const msg = (err && err.message) ? err.message : String(err);
          if (!/Timeout|timeout/.test(msg)) throw err;
        });
        await page.waitForTimeout(1800);

        const url = page.url();
        const redirectedAway = /giris\.html|profil\.html/.test(url);

        const critical = signals
          .filter(function (s) { return !shouldIgnore(s.message); })
          .filter(function (s) { return isRegression(s.message); });

        if (critical.length) {
          console.log('K032 Faz 3B critical signals on #' + hash + ' [' + theme + '] (url=' + url + '):');
          critical.forEach(function (s) { console.log('  -', s.kind, s.message); });
        }

        expect(critical, 'Faz 3B runtime regressions on /admin.html#' + hash + ' (' + theme + ')').toEqual([]);
        expect(redirectedAway, 'admin.html auth guard rejected admin user — redirected away').toBe(false);
      });
    }
  });
}
