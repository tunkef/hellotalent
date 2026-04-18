/**
 * K032 Faz 3B — admin.html authenticated panel hash runtime smoke.
 *
 * Platform admin panel. Test user admin+k032@peoplein.com.tr
 * app_metadata.role='admin' + admin_users row seed'li. admin.html:757
 * checkAdminAccess admin_users maybeSingle lookup yapiyor.
 *
 * 12 panel hash (dashboard/review/campaigns/announcements/support/
 * candidates/brands/employers/leads/sales/team/settings) × 2 tema ×
 * 2 viewport = 48 test.
 *
 * Login sonrasi candidate branch'a duser (role!=employer), profil.html
 * redirect. Test /admin.html URL'e direkt goto eder; admin shell guard
 * `admin_users` lookup'undan gecer.
 *
 * Faz 4A (K-2) + 4B (O-2) update:
 *   - admin.html has NO hash-restore (backlog K-036). Every hash ends up
 *     on `panel-dashboard` after boot — assertion pins that contract.
 *   - Shared helpers from tests/helpers/runtime-signals.js.
 */

const { test, expect } = require('@playwright/test');
const { attachCollectors, criticalFrom, contextSnapshot, waitForBootSettle } = require('./helpers/runtime-signals');

const ADMIN_PANEL_HASHES = [
  'dashboard', 'review', 'campaigns', 'announcements', 'support',
  'candidates', 'brands', 'employers', 'leads', 'sales', 'team', 'settings',
];

const THEMES = ['light', 'dark'];

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
        // admin.html has no `_htBootstrapDone` sentinel — lower cap, settle tail
        // covers admin_users lookup + showAdminDashboard microtasks.
        await waitForBootSettle(page, { sentinelTimeoutMs: 600, settleMs: 600 });

        const ctx = contextSnapshot(page);
        const redirectedAway = /giris\.html|profil\.html/.test(ctx.url);
        const activePanelId = redirectedAway
          ? null
          : await page.locator('.panel.active').getAttribute('id').catch(function () { return null; });
        const critical = criticalFrom(signals);

        if (critical.length) {
          console.log('K032 Faz 3B critical signals on #' + hash + ' [' + theme + '] (url=' + ctx.url + ', active=' + activePanelId + '):');
          critical.forEach(function (s) { console.log('  -', s.kind, s.message); });
        }

        expect(critical, 'Faz 3B runtime regressions on /admin.html#' + hash + ' (' + theme + ', vp=' + ctx.viewportLabel + ', active=' + activePanelId + ', url=' + ctx.url + ')').toEqual([]);
        expect(redirectedAway, 'admin.html auth guard rejected admin user — redirected away (hash=#' + hash + ', ' + theme + ', vp=' + ctx.viewportLabel + ', url=' + ctx.url + ')').toBe(false);

        // admin.html has NO hash-restore on boot. Direct goto('/admin.html#X')
        // always lands on dashboard (admin.html:840-853 showAdminDashboard() →
        // loadDashboardOverview()). Panel-id strict assert is INVALID for admin
        // until admin.html gains hash routing (backlog K-036). Until then we
        // pin the current contract: every hash → panel-dashboard.
        expect(activePanelId, 'Faz 3B admin dashboard should be active for every hash until K-036 hash-restore lands (hash=#' + hash + ', ' + theme + ', vp=' + ctx.viewportLabel + ', url=' + ctx.url + ')').toBe('panel-dashboard');
      });
    }
  });
}
