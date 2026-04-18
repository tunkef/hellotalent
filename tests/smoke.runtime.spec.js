/**
 * K032 — Runtime Playwright Smoke Suite (Faz 1)
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
 *
 * Faz 4B (O-2) refaktor: ortak IGNORE/REGRESSION + attachCollectors mantigi
 * tests/helpers/runtime-signals.js'de. Davranis degismedi.
 */

const { test, expect } = require('@playwright/test');
const { attachCollectors, criticalFrom, contextSnapshot, waitForBootSettle } = require('./helpers/runtime-signals');

const RUNTIME_PAGES = [
  { name: 'profil', path: '/profil.html' },
  { name: 'ik', path: '/ik.html' },
  { name: 'admin', path: '/admin.html' },
  { name: 'coach-studio', path: '/coach-studio.html' },
];

const THEMES = ['light', 'dark'];

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
        await waitForBootSettle(page, { sentinelTimeoutMs: 1200, settleMs: 300 });

        const ctx = contextSnapshot(page);
        const critical = criticalFrom(signals);

        if (critical.length) {
          console.log('K032 critical signals on ' + target.name + ' [' + theme + '] (url=' + ctx.url + '):');
          critical.forEach(function (s) { console.log('  -', s.kind, s.message); });
        }

        expect(critical, 'Runtime regressions on ' + target.path + ' (' + theme + ', vp=' + ctx.viewportLabel + ', url=' + ctx.url + ')').toEqual([]);
      });
    }
  });
}
