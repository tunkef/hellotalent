/**
 * K032 Faz 3B — Admin auth setup.
 *
 * Logs in as the seeded test admin (admin_users row present with role),
 * navigates to /admin.html, and verifies the admin shell actually activates
 * before capturing storageState.
 *
 * Required env: HT_TEST_ADMIN_EMAIL, HT_TEST_PASSWORD
 * Output: playwright/.auth/admin.json (git-ignored)
 *
 * Login flow:
 *   1. /giris.html candidate tab login (admin uses candidate tab; role !== 'employer'
 *      → profil.html default redirect branch)
 *   2. Post-login wait: /profil.html OR /admin.html
 *   3. Manual navigate /admin.html
 *   4. Assert #admin-shell.active — admin.html:757 `admin_users.select('id, role, display_name').eq('id', userId).maybeSingle()`
 *      gate passed (see admin.html checkAdminAccess)
 *   5. Capture storageState — verified admin session, not just a generic logged-in session
 *
 * Faz 4 K-3 fix: previously setup saved storageState right after candidate-tab redirect;
 * admin.html auth gate (admin_users lookup) was never exercised. Now we explicitly drive
 * the gate before save, so a regression in admin_users seed (role change, row drop, id
 * mismatch) surfaces here — not later inside the 48 admin e2e tests.
 */
var { test: setup, expect } = require('@playwright/test');

var AUTH_FILE = 'playwright/.auth/admin.json';

setup('authenticate admin', async ({ page }) => {
  var email = process.env.HT_TEST_ADMIN_EMAIL;
  var password = process.env.HT_TEST_PASSWORD;
  if (!email || !password) {
    throw new Error('BLOCKED: HT_TEST_ADMIN_EMAIL / HT_TEST_PASSWORD env vars not set.');
  }

  await page.goto('/giris.html');
  await page.waitForSelector('#aday-email', { timeout: 10000 });
  await page.fill('#aday-email', email);
  await page.fill('#aday-sifre', password);
  await page.click('#btn-aday-giris');

  await page.waitForURL(/profil\.html|admin\.html/, { timeout: 15000 });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(function () {});

  // K-3: explicitly drive admin.html guard so storageState reflects a
  // session that can actually render admin shell, not just a logged-in user.
  await page.goto('/admin.html');
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(function () {});

  var finalUrl = page.url();
  expect(finalUrl, 'admin auth setup: /admin.html redirected away (gate rejected) — check admin_users row for test admin (role, id match auth.uid)').not.toMatch(/giris\.html|profil\.html/);

  await expect(page.locator('#admin-shell.active'), 'admin auth setup: #admin-shell never activated — admin_users lookup returned null/error or guard race (admin.html:757 checkAdminAccess)').toBeVisible({ timeout: 10000 });

  await page.context().storageState({ path: AUTH_FILE });
});
