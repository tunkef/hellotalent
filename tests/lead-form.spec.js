// Lead Form E2E test — isveren-onboarding.html
// Smoke: form load, navigation, validation, submit (mock)
// Lokal server: python3 -m http.server 8765
// Run: npx playwright test tests/lead-form.spec.js --reporter=list

const { test, expect } = require('@playwright/test');

const BASE = process.env.BASE_URL || 'http://localhost:8765';

test.describe('Lead Form (isveren-onboarding.html)', () => {

  test('Form yüklenir, ilk step görünür, progress 1/9', async ({ page }) => {
    await page.goto(`${BASE}/isveren-onboarding.html`);
    await expect(page.locator('.obh-step[data-step="1"]')).toBeVisible();
    await expect(page.locator('#obh-counter')).toHaveText('1 / 9');
    await expect(page.locator('.obh-step.is-active h1.obh-hero-h1')).toContainText('Türkiye perakendesinin');
  });

  test('Step 2: segment seçilmeden devam edilemez', async ({ page }) => {
    await page.goto(`${BASE}/isveren-onboarding.html`);
    await page.click('.obh-step.is-active [data-action="next"]'); // 1 → 2
    await expect(page.locator('.obh-step[data-step="2"]')).toBeVisible();

    // Validation error
    await page.click('.obh-step.is-active button.obh-btn--primary[data-action="next"]');
    await expect(page.locator('#err-segment')).toBeVisible();
    await expect(page.locator('.obh-step[data-step="2"]')).toBeVisible(); // hala step 2
  });

  test('Tam akış: 9 step doldur, gerçek API submit, demo_token al', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto(`${BASE}/isveren-onboarding.html`);

    // Step 1 → 2
    await page.click('.obh-step.is-active [data-action="next"]');

    // Step 2: segment
    await page.click('[data-segment="holding"]');
    await page.click('.obh-step.is-active button.obh-btn--primary[data-action="next"]');

    // Step 3: contact
    await page.fill('#f-company', 'Playwright Test Holding');
    await page.fill('#f-fullname', 'Test Kullanıcı');
    await page.fill('#f-email', `playwright-${Date.now()}@hellotalent.local`);
    await page.click('.obh-step.is-active button.obh-btn--primary[data-action="next"]');

    // Step 4: brands (skip)
    await page.click('.obh-step.is-active [data-action="skip"]');

    // Step 5: team
    await page.click('[data-team="6-20"]');
    await page.click('.obh-step.is-active button.obh-btn--primary[data-action="next"]');

    // Step 6: positions (skip)
    await page.click('.obh-step.is-active [data-action="skip"]');

    // Step 7: monthly
    await page.click('[data-monthly="4-10"]');
    await page.click('.obh-step.is-active button.obh-btn--primary[data-action="next"]');

    // Step 8: urgency (skip)
    await page.click('.obh-step.is-active [data-action="skip"]');

    // Step 9: consent + submit
    await page.fill('#f-phone', '0555 000 0000');
    await page.check('#f-marketing');

    const responsePromise = page.waitForResponse(r => r.url().includes('/functions/v1/notify-hr-lead'));
    await page.click('#obh-submit');
    const response = await responsePromise;
    expect(response.status()).toBe(200);

    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.demo_token).toMatch(/^[0-9a-f-]{36}$/);

    // Success step shown
    await expect(page.locator('.obh-step[data-step="success"]')).toBeVisible({ timeout: 5000 });
  });

  test('Mobile viewport (390×844) layout', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/isveren-onboarding.html`);
    await expect(page.locator('.obh-shell')).toBeVisible();
    const heroBox = await page.locator('.obh-step.is-active .obh-hero-surface').boundingBox();
    expect(heroBox.width).toBeLessThanOrEqual(390);
  });
});
