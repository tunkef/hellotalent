const { test, expect } = require('@playwright/test');
const BASE = 'http://localhost:3000';

test.describe('F1 — Avatar Signed URL', () => {
  test('shared.js exposes HT.signStorageUrl function', async ({ page }) => {
    await page.goto(`${BASE}/giris.html`, { waitUntil: 'networkidle' });
    var hasFn = await page.evaluate(() => typeof window.HT !== 'undefined' && typeof window.HT.signStorageUrl === 'function');
    expect(hasFn).toBe(true);
  });

  test('shared.js exposes HT.signStorageUrls function', async ({ page }) => {
    await page.goto(`${BASE}/giris.html`, { waitUntil: 'networkidle' });
    var hasFn = await page.evaluate(() => typeof window.HT !== 'undefined' && typeof window.HT.signStorageUrls === 'function');
    expect(hasFn).toBe(true);
  });
});

test.describe('F1 — coach-studio avatar', () => {
  test('coach-studio.html does not call getPublicUrl', async ({ page }) => {
    await page.goto(`${BASE}/coach-studio.html`, { waitUntil: 'networkidle' });
    var scriptContent = await page.evaluate(() => {
      var scripts = Array.from(document.querySelectorAll('script'));
      return scripts.map(function(s) { return s.textContent; }).join('\n');
    });
    expect(scriptContent).not.toContain('.getPublicUrl(');
  });
});
