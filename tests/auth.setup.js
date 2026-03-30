/**
 * Playwright global auth setup — logs in as a candidate test user
 * and saves browser storageState (localStorage + cookies) for reuse.
 *
 * Requires env vars: HT_TEST_EMAIL, HT_TEST_PASSWORD
 * Run once before E2E tests: `npx playwright test --project=setup`
 * Output: playwright/.auth/candidate.json (git-ignored)
 */
var { test: setup, expect } = require('@playwright/test');

var AUTH_FILE = 'playwright/.auth/candidate.json';

setup('authenticate candidate', async ({ page }) => {
  var email = process.env.HT_TEST_EMAIL;
  var password = process.env.HT_TEST_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'BLOCKED: HT_TEST_EMAIL / HT_TEST_PASSWORD env vars not set. ' +
      'Set them to run E2E auth tests. See docs/handoff.md § E2E Testing.'
    );
  }

  // Navigate to login page
  await page.goto('/giris.html');

  // Fill candidate login form (first tab — "Aday" tab is default)
  await page.fill('#aday-email', email);
  await page.fill('#aday-sifre', password);
  await page.click('#btn-aday-giris');

  // Wait for redirect to profil.html (auth success)
  await page.waitForURL('**/profil.html**', { timeout: 15000 });

  // Verify we landed on the profile page
  await expect(page.locator('#panel-genel')).toBeAttached({ timeout: 10000 });

  // Save auth state
  await page.context().storageState({ path: AUTH_FILE });
});
