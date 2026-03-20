/**
 * E2E: profil.html Ayarlar panel — Gizlilik & Bildirim toggle persistence
 *
 * Requires authenticated candidate session (storageState from auth.setup.js).
 * Env: HT_TEST_EMAIL + HT_TEST_PASSWORD must be set.
 *
 * Tests verify:
 *  1. Toggling does NOT cause "bounce-back" (old bug: delegation hit <main data-panel>,
 *     re-ran switchPanel, which re-applied _loadedDBData and reset checkboxes).
 *  2. Visibility toggles auto-save on change → survive page reload.
 *  3. Notification toggles persist after explicit "Kaydet" button click → survive reload.
 */
var { test, expect } = require('@playwright/test');

// Wait for profil.html bootstrap to finish (panels rendered, DB data loaded)
async function waitForProfilReady(page) {
  // panel-ayarlar exists and the auth bootstrap resolved (sidebar-user-name populated)
  await page.waitForSelector('#panel-ayarlar', { state: 'attached', timeout: 15000 });
  await page.waitForSelector('#sidebar-user-name:not(:empty)', { timeout: 15000 });
}

// Navigate to Ayarlar panel via hash
async function goToAyarlar(page) {
  await page.goto('/profil.html#ayarlar');
  await waitForProfilReady(page);
  // Ensure panel is visible
  await expect(page.locator('#panel-ayarlar')).toBeVisible({ timeout: 5000 });
}

test.describe('profil.html — Ayarlar toggle persistence', () => {

  // ── 1. Gizlilik: "Beni Öner" toggle does not bounce back ──
  test('visibility toggle does not bounce back after click', async ({ page }) => {
    await goToAyarlar(page);

    var toggle = page.locator('#settings-visibility-active');
    var before = await toggle.isChecked();

    // Click the toggle
    await toggle.click();

    // Short wait — old bug would reset within ~100ms via switchPanel re-fire
    await page.waitForTimeout(500);

    var after = await toggle.isChecked();
    expect(after).toBe(!before); // Must have flipped, not bounced back
  });

  // ── 2. Gizlilik: "Aktif İş Arıyorum" toggle does not bounce back ──
  test('actively-looking toggle does not bounce back after click', async ({ page }) => {
    await goToAyarlar(page);

    var toggle = page.locator('#settings-actively-looking');
    var before = await toggle.isChecked();

    await toggle.click();
    await page.waitForTimeout(500);

    var after = await toggle.isChecked();
    expect(after).toBe(!before);
  });

  // ── 3. Bildirim: "İşveren Mesajları" toggle does not bounce back ──
  test('notification toggle does not bounce back after click', async ({ page }) => {
    await goToAyarlar(page);

    var toggle = page.locator('#settings-notify-email-messages');
    var before = await toggle.isChecked();

    await toggle.click();
    await page.waitForTimeout(500);

    var after = await toggle.isChecked();
    expect(after).toBe(!before);
  });

  // ── 4. Visibility toggle persists across reload (auto-save) ──
  test('visibility toggle persists after reload', async ({ page }) => {
    await goToAyarlar(page);

    var toggle = page.locator('#settings-visibility-active');
    var initial = await toggle.isChecked();

    // Flip the toggle (auto-saves via syncBeniOner)
    await toggle.click();
    var flipped = !initial;

    // Wait for DB write to settle
    await page.waitForTimeout(1500);

    // Reload page
    await page.goto('/profil.html#ayarlar');
    await waitForProfilReady(page);

    // Verify persisted state
    var afterReload = await page.locator('#settings-visibility-active').isChecked();
    expect(afterReload).toBe(flipped);

    // Restore original state so test is idempotent
    if (afterReload !== initial) {
      await page.locator('#settings-visibility-active').click();
      await page.waitForTimeout(1500);
    }
  });

  // ── 5. Notification toggle persists after explicit save + reload ──
  test('notification toggle persists after save and reload', async ({ page }) => {
    await goToAyarlar(page);

    var toggle = page.locator('#settings-notify-email-messages');
    var initial = await toggle.isChecked();

    // Flip the toggle
    await toggle.click();
    var flipped = !initial;

    // Click the save button
    await page.locator('#btn-save-notifications').click();

    // Wait for success message
    await expect(page.locator('#notifications-msg')).toContainText('kaydedildi', { timeout: 5000 });

    // Reload
    await page.goto('/profil.html#ayarlar');
    await waitForProfilReady(page);

    var afterReload = await page.locator('#settings-notify-email-messages').isChecked();
    expect(afterReload).toBe(flipped);

    // Restore original state
    if (afterReload !== initial) {
      await page.locator('#settings-notify-email-messages').click();
      await page.locator('#btn-save-notifications').click();
      await expect(page.locator('#notifications-msg')).toContainText('kaydedildi', { timeout: 5000 });
    }
  });

  // ── 6. All four notification toggles are interactive (not stuck) ──
  test('all notification toggles respond to clicks', async ({ page }) => {
    await goToAyarlar(page);

    var toggleIds = [
      'settings-notify-email-messages',
      'settings-notify-email-jobs'
    ];

    for (var id of toggleIds) {
      var toggle = page.locator('#' + id);
      var before = await toggle.isChecked();
      await toggle.click();
      await page.waitForTimeout(200);
      var after = await toggle.isChecked();
      expect(after, id + ' should toggle').toBe(!before);
      // Restore
      await toggle.click();
    }

    // SMS and Push are disabled (Premium) — verify they are NOT interactive
    await expect(page.locator('#settings-notify-sms')).toBeDisabled();
    await expect(page.locator('#settings-notify-push')).toBeDisabled();
  });
});
