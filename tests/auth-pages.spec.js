var { test, expect } = require('@playwright/test');

test.describe('uye-ol.html', function() {
  test('page loads with aday tab active', async function({ page }) {
    await page.goto('/uye-ol.html', { waitUntil: 'networkidle' });
    await expect(page.locator('#form-aday')).toBeVisible();
    await expect(page.locator('#form-kurumsal')).toBeHidden();
  });

  test('tab=kurumsal opens kurumsal form', async function({ page }) {
    await page.goto('/uye-ol.html?tab=kurumsal', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await expect(page.locator('#form-kurumsal')).toBeVisible();
    await expect(page.locator('#form-aday')).toBeHidden();
  });

  test('aday form has all required fields', async function({ page }) {
    await page.goto('/uye-ol.html', { waitUntil: 'networkidle' });
    await expect(page.locator('#aday-adsoyad')).toBeVisible();
    await expect(page.locator('#aday-email')).toBeVisible();
    await expect(page.locator('#aday-telefon')).toBeVisible();
    await expect(page.locator('#aday-sifre')).toBeVisible();
    await expect(page.locator('#aday-sifre-tekrar')).toBeVisible();
    await expect(page.locator('#cb-aday-privacy')).toBeVisible();
    await expect(page.locator('#cb-aday-kvkk')).toBeVisible();
    await expect(page.locator('#btn-aday-kayit')).toBeVisible();
    await expect(page.locator('#btn-aday-kayit')).toBeDisabled();
  });

  test('kurumsal form has all required fields', async function({ page }) {
    await page.goto('/uye-ol.html?tab=kurumsal', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await expect(page.locator('#k-adsoyad')).toBeVisible();
    await expect(page.locator('#k-sirket')).toBeVisible();
    await expect(page.locator('#k-web')).toBeVisible();
    await expect(page.locator('#k-email')).toBeVisible();
    await expect(page.locator('#k-telefon')).toBeVisible();
    await expect(page.locator('#k-sifre')).toBeVisible();
    await expect(page.locator('#k-sifre-tekrar')).toBeVisible();
    await expect(page.locator('#cb-k-privacy')).toBeVisible();
    await expect(page.locator('#cb-k-kvkk')).toBeVisible();
    await expect(page.locator('#btn-k-kayit')).toBeVisible();
    await expect(page.locator('#btn-k-kayit')).toBeDisabled();
  });

  test('aday phone formats correctly', async function({ page }) {
    await page.goto('/uye-ol.html', { waitUntil: 'networkidle' });
    await page.fill('#aday-telefon', '05321234567');
    var val = await page.inputValue('#aday-telefon');
    expect(val).toBe('0532 123 45 67');
  });

  test('password match hint shows', async function({ page }) {
    await page.goto('/uye-ol.html', { waitUntil: 'networkidle' });
    await page.fill('#aday-sifre', 'Test1234!');
    await page.fill('#aday-sifre-tekrar', 'Test1234!');
    await expect(page.locator('#aday-match-hint')).toBeVisible();
    await expect(page.locator('#aday-match-hint')).toContainText('eslesiyor');
  });

  test('aday OAuth buttons visible', async function({ page }) {
    await page.goto('/uye-ol.html', { waitUntil: 'networkidle' });
    await expect(page.locator('#btn-google-signup')).toBeVisible();
    await expect(page.locator('#btn-linkedin-signup')).toBeVisible();
  });

  test('kurumsal has NO OAuth buttons', async function({ page }) {
    await page.goto('/uye-ol.html?tab=kurumsal', { waitUntil: 'networkidle' });
    var googleCount = await page.locator('#form-kurumsal #btn-google-signup').count();
    var linkedinCount = await page.locator('#form-kurumsal #btn-linkedin-signup').count();
    expect(googleCount).toBe(0);
    expect(linkedinCount).toBe(0);
  });

  test('no horizontal scroll on mobile', async function({ page }) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/uye-ol.html', { waitUntil: 'networkidle' });
    var hs = await page.evaluate(function() {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hs).toBe(false);
  });

  test('logo does not contain .ai', async function({ page }) {
    await page.goto('/uye-ol.html', { waitUntil: 'networkidle' });
    var logoText = await page.locator('.logo').textContent();
    expect(logoText).not.toContain('.ai');
  });
});

test.describe('demo-dashboard-ik.html', function() {
  test('page loads or redirects to login', async function({ page }) {
    await page.goto('/demo-dashboard-ik.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    var url = page.url();
    expect(url.includes('demo-dashboard') || url.includes('giris')).toBe(true);
  });
});

test.describe('giris.html updates', function() {
  test('no registration forms exist', async function({ page }) {
    await page.goto('/giris.html', { waitUntil: 'networkidle' });
    await expect(page.locator('#aday-register-box')).toHaveCount(0);
    await expect(page.locator('#ik-register-box')).toHaveCount(0);
  });

  test('kayit ol link points to uye-ol.html', async function({ page }) {
    await page.goto('/giris.html', { waitUntil: 'networkidle' });
    var link = page.locator('a[href="uye-ol.html"]');
    await expect(link).toBeVisible();
  });

  test('kurumsal kayit ol link points to uye-ol.html?tab=kurumsal', async function({ page }) {
    await page.goto('/giris.html?tab=kurumsal', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    var link = page.locator('a[href="uye-ol.html?tab=kurumsal"]');
    await expect(link).toBeVisible();
  });

  test('logo does not contain .ai', async function({ page }) {
    await page.goto('/giris.html', { waitUntil: 'networkidle' });
    var logoText = await page.locator('.logo').textContent();
    expect(logoText).not.toContain('.ai');
  });

  test('tab=kurumsal param works', async function({ page }) {
    await page.goto('/giris.html?tab=kurumsal', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    var ikForm = page.locator('#form-ik');
    await expect(ikForm).toBeVisible();
  });
});
