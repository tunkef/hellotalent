/**
 * K032 — Runtime Playwright Smoke Suite
 *
 * Authenticated sayfalarin boot-time runtime hatalarini yakalar.
 * K068b sinifi regresyonu (script tag drop, ReferenceError) pre-push
 * gate'te tutar. Auth mock YOK — boot-time hata login redirect oncesi
 * fırlar, giris.html'e yonlenmek hatayi gizlemez.
 *
 * Kapsam: /profil.html, /ik.html, /admin.html, /coach-studio.html
 *          × light + dark (ht_theme_preference storage pre-seed)
 * Filter : supabase/posthog/sentry/network noise + auth redirect mesajlari
 * Assert : ReferenceError | TypeError | "is not defined" | "Cannot read propert" = 0
 */

const { test, expect } = require('@playwright/test');

const RUNTIME_PAGES = [
  { name: 'profil', path: '/profil.html' },
  { name: 'ik', path: '/ik.html' },
  { name: 'admin', path: '/admin.html' },
  { name: 'coach-studio', path: '/coach-studio.html' },
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
  test.describe('K032 Runtime Smoke / ' + theme, function () {
    test.beforeEach(async function ({ page }) {
      await page.addInitScript(function (pref) {
        try { localStorage.setItem('ht_theme_preference', pref); } catch (e) {}
      }, theme);
    });

    for (const target of RUNTIME_PAGES) {
      test(target.name + ' boot runtime smoke', async function ({ page }) {
        const signals = attachCollectors(page);

        await page.goto(target.path, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(function (err) {
          const msg = (err && err.message) ? err.message : String(err);
          if (!/Timeout|timeout/.test(msg)) throw err;
        });
        await page.waitForTimeout(1500);

        const critical = signals
          .filter(function (s) { return !shouldIgnore(s.message); })
          .filter(function (s) { return isRegression(s.message); });

        if (critical.length) {
          console.log('K032 critical signals on ' + target.name + ' [' + theme + ']:');
          critical.forEach(function (s) { console.log('  -', s.kind, s.message); });
        }

        expect(critical, 'Runtime regressions on ' + target.path + ' (' + theme + ')').toEqual([]);
      });
    }
  });
}
