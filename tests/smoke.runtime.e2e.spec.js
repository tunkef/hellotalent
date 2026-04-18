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
 * Faz 4A (K-2) + 4B (O-2) update:
 *   - Panel router activation assertion: `.panel.active` id must match
 *     `panel-<hash>` (after alias normalization). Prevents silent-pass when
 *     router fails to apply hash.
 *   - Shared signal helpers pulled from tests/helpers/runtime-signals.js.
 *
 * Kapsam disi (Faz 2 sonraki sprint): ik.html tab, admin.html tab iterasyonu.
 */

const { test, expect } = require('@playwright/test');
const { attachCollectors, criticalFrom, contextSnapshot, waitForBootSettle } = require('./helpers/runtime-signals');

const PANEL_HASHES = [
  'genel', 'merkez', 'sirketler', 'kimbakti', 'mulakat',
  'yetkinlik', 'firsatlar', 'inbox', 'bildirimler', 'ayarlar',
  'premium', 'destek', 'profil',
];

// Router normalization: profil-events.js:508 aliases `yetkinlik` → `mulakat`
// (and `teklifler` → `firsatlar`, but `teklifler` is not in PANEL_HASHES).
// Keep PANEL_HASHES driving the URL we goto; use this map for the assertion.
const PANEL_ID_ALIASES = {
  yetkinlik: 'mulakat',
};

function expectedPanelIdFor(hash) {
  return 'panel-' + (PANEL_ID_ALIASES[hash] || hash);
}

const THEMES = ['light', 'dark'];

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
        // profil.html sets `_htBootstrapDone` → sentinel wait usually exits well below 1500ms.
        await waitForBootSettle(page, { sentinelTimeoutMs: 1500, settleMs: 400 });

        const ctx = contextSnapshot(page);
        const activePanelId = await page.locator('.panel.active').getAttribute('id').catch(function () { return null; });
        const expectedPanelId = expectedPanelIdFor(hash);
        const critical = criticalFrom(signals);

        if (critical.length) {
          console.log('K032 Faz 2 critical signals on #' + hash + ' [' + theme + '] (active=' + activePanelId + ', url=' + ctx.url + '):');
          critical.forEach(function (s) { console.log('  -', s.kind, s.message); });
        }

        expect(critical, 'Faz 2 runtime regressions on /profil.html#' + hash + ' (' + theme + ', vp=' + ctx.viewportLabel + ', active=' + activePanelId + ', url=' + ctx.url + ')').toEqual([]);
        expect(activePanelId, 'Faz 2 panel router activation mismatch — hash=#' + hash + ' expected ' + expectedPanelId + ' but active=' + activePanelId + ' (' + theme + ', vp=' + ctx.viewportLabel + ', url=' + ctx.url + ')').toBe(expectedPanelId);
      });
    }
  });
}
