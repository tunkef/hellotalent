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

test.describe('F1 — employer + preview avatar', () => {
  test('ik.html does not use raw avatar_url as img.src', async ({ page }) => {
    await page.goto(`${BASE}/ik.html`, { waitUntil: 'networkidle' });
    var scriptContent = await page.evaluate(() => {
      var scripts = Array.from(document.querySelectorAll('script'));
      return scripts.map(function(s) { return s.textContent; }).join('\n');
    });
    var hasRawAssign = /img\.src\s*=\s*cand\.avatar_url/.test(scriptContent);
    expect(hasRawAssign).toBe(false);
  });

  test('profil-preview.js uses signStorageUrl', async ({ page }) => {
    await page.goto(`${BASE}/profil.html`, { waitUntil: 'networkidle' });
    var content = await page.evaluate(() => fetch('profil-preview.js').then(function(r) { return r.text(); }));
    expect(content).toContain('signStorageUrl');
  });
});

test.describe('F2 — Beni Hatirla removal', () => {
  test('giris.html has no remember-me checkbox', async ({ page }) => {
    await page.goto(`${BASE}/giris.html`, { waitUntil: 'networkidle' });
    var adayCheckbox = await page.$('#cb-remember-aday');
    var ikCheckbox = await page.$('#cb-remember-ik');
    expect(adayCheckbox).toBeNull();
    expect(ikCheckbox).toBeNull();
  });

  test('giris.html JS has no dead remember variable', async ({ page }) => {
    await page.goto(`${BASE}/giris.html`, { waitUntil: 'networkidle' });
    var scriptContent = await page.evaluate(() => {
      var scripts = Array.from(document.querySelectorAll('script'));
      return scripts.map(function(s) { return s.textContent; }).join('\n');
    });
    expect(scriptContent).not.toContain('cb-remember-aday');
    expect(scriptContent).not.toContain('cb-remember-ik');
  });

  test('Sifremi Unuttum links still exist', async ({ page }) => {
    await page.goto(`${BASE}/giris.html`, { waitUntil: 'networkidle' });
    var adayLink = await page.$('#btn-forgot-password-aday');
    var ikLink = await page.$('#btn-forgot-password-ik');
    expect(adayLink).not.toBeNull();
    expect(ikLink).not.toBeNull();
  });
});
