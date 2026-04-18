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
 *
 * Faz 4A (K-2) + 4B (O-2) update:
 *   - Panel router activation assertion (`panel-<hash>`).
 *   - Shared helpers from tests/helpers/runtime-signals.js.
 */

const { test, expect } = require('@playwright/test');
const { attachCollectors, criticalFrom, contextSnapshot, waitForBootSettle } = require('./helpers/runtime-signals');

const IK_PANEL_HASHES = [
  'dashboard', 'search', 'pozisyonlar', 'favoriler', 'takipciler',
  'mesajlar', 'kampanyalar', 'sirket', 'ekip', 'ayarlar',
];

const THEMES = ['light', 'dark'];

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
        // ik.html has no `_htBootstrapDone` sentinel — sentinel cap lowered so we
        // fall through to the settle tail quickly (networkidle already covers Supabase boot).
        await waitForBootSettle(page, { sentinelTimeoutMs: 600, settleMs: 600 });

        const ctx = contextSnapshot(page);
        const redirectedToLogin = /giris\.html/.test(ctx.url);
        const activePanelId = redirectedToLogin
          ? null
          : await page.locator('.panel.active').getAttribute('id').catch(function () { return null; });
        const critical = criticalFrom(signals);

        if (critical.length) {
          console.log('K032 Faz 3A critical signals on #' + hash + ' [' + theme + '] (url=' + ctx.url + ', active=' + activePanelId + '):');
          critical.forEach(function (s) { console.log('  -', s.kind, s.message); });
        }

        expect(critical, 'Faz 3A runtime regressions on /ik.html#' + hash + ' (' + theme + ', vp=' + ctx.viewportLabel + ', url=' + ctx.url + ')').toEqual([]);
        expect(redirectedToLogin, 'ik.html auth guard rejected employer — /giris.html redirect (hash=#' + hash + ', ' + theme + ', vp=' + ctx.viewportLabel + ', url=' + ctx.url + ')').toBe(false);

        // K-037 landed (18 Nisan 2026): gate switched from `!hrProfile.sirket` (which was
        // broken because `sirket` was never SELECT'd) to `!hrProfile.company_id`. Test
        // employer seed (scripts/seed-test-employer.mjs) now creates a companies row and
        // links hr_profile.company_id → gate releases, hash-restore activates the target
        // panel. Strict panel id assertion now catches a regression in either the gate
        // release OR the hash-restore code path.
        expect(activePanelId, 'Faz 3A panel router activation mismatch — hash=#' + hash + ' expected panel-' + hash + ' but active=' + activePanelId + ' (' + theme + ', vp=' + ctx.viewportLabel + ', url=' + ctx.url + ')').toBe('panel-' + hash);
      });
    }
  });
}
