/**
 * K032 Faz 3A — Employer auth setup.
 *
 * Logs in as the seeded test employer (app_metadata.role='employer') and
 * saves browser storageState for reuse in ik.html e2e tests.
 *
 * Required env: HT_TEST_EMPLOYER_EMAIL, HT_TEST_PASSWORD
 * Output: playwright/.auth/employer.json (git-ignored)
 *
 * Login flow: /giris.html?tab=ik → fill #ik-email + #ik-sifre →
 * click .btn-ik → wait demo-dashboard-ik.html OR ik.html.
 */
var { test: setup, expect } = require('@playwright/test');

var AUTH_FILE = 'playwright/.auth/employer.json';

setup('authenticate employer', async ({ page }) => {
  var email = process.env.HT_TEST_EMPLOYER_EMAIL;
  var password = process.env.HT_TEST_PASSWORD;
  if (!email || !password) {
    throw new Error('BLOCKED: HT_TEST_EMPLOYER_EMAIL / HT_TEST_PASSWORD env vars not set.');
  }

  await page.goto('/giris.html?tab=ik');
  await page.waitForSelector('#ik-email', { timeout: 10000 });
  await page.fill('#ik-email', email);
  await page.fill('#ik-sifre', password);
  await page.locator('button.btn-ik').filter({ hasText: /Giri|giri/ }).click();

  await page.waitForURL(/demo-dashboard-ik\.html|ik\.html/, { timeout: 15000 });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(function () {});

  await page.context().storageState({ path: AUTH_FILE });
});
