/**
 * K032 Faz 3B — Admin auth setup.
 *
 * Logs in as the seeded test admin (app_metadata.role='admin',
 * admin_users row present) and saves storageState for admin.html e2e tests.
 *
 * Required env: HT_TEST_ADMIN_EMAIL, HT_TEST_PASSWORD
 * Output: playwright/.auth/admin.json (git-ignored)
 *
 * Login flow: /giris.html → fill #aday-email + #aday-sifre (admin uses
 * candidate tab, app_metadata.role !== 'employer' so login redirects
 * to profil.html default branch) → click #btn-aday-giris → wait
 * profil.html OR admin.html. Admin.html erisimi manuel navigate'le.
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

  await page.context().storageState({ path: AUTH_FILE });
});
