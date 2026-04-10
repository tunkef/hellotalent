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

test.describe('F1 — coach avatar signing', () => {
  test('profil-genel.js uses signStorageUrl for coach avatars', async ({ page }) => {
    await page.goto(`${BASE}/profil.html`, { waitUntil: 'networkidle' });
    var content = await page.evaluate(() => fetch('profil-genel.js').then(function(r) { return r.text(); }));
    expect(content).toContain('signStorageUrl');
    // Should not have direct assignment pattern: img.src = cp.avatar_url
    var hasDirectAssign = /img\.src\s*=\s*cp\.avatar_url/.test(content);
    expect(hasDirectAssign).toBe(false);
  });

  test('admin-coach-content.js uses signStorageUrl', async ({ page }) => {
    await page.goto(`${BASE}/admin.html`, { waitUntil: 'networkidle' });
    var content = await page.evaluate(() => fetch('admin-coach-content.js').then(function(r) { return r.text(); }));
    expect(content).toContain('signStorageUrl');
  });
});
