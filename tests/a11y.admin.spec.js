/* ═══ a11y.admin.spec.js — Admin panel structural a11y guards ═══
   Axe-core yüklü değil, basit structural check'ler. Full WCAG scan için
   @axe-core/playwright install edilip `await axe(page)` çağrılabilir.
   Mevcut guards — bugünkü audit fix'lerini regression'dan korur.
*/
const { test, expect } = require('@playwright/test');

test.describe('Admin a11y structural guards', () => {
  test('admin.html — bir sayfa tek <main>', async ({ page }) => {
    const res = await page.request.get('/admin.html');
    const html = await res.text();
    const mainCount = (html.match(/<main\b/g) || []).length;
    expect(mainCount).toBe(1);
  });

  test('admin.html — sidebar nav-item role="button" + tabindex', async ({ page }) => {
    const res = await page.request.get('/admin.html');
    const html = await res.text();
    // Her nav-item role+tabindex taşımalı
    const navItems = html.match(/<div class="nav-item[^>]*>/g) || [];
    expect(navItems.length).toBeGreaterThan(10);
    for (const item of navItems) {
      expect(item).toMatch(/role="button"/);
      expect(item).toMatch(/tabindex="(?:0|-1)"/);
    }
  });

  test('admin.html — aktif nav-item aria-current="page"', async ({ page }) => {
    const res = await page.request.get('/admin.html');
    const html = await res.text();
    expect(html).toContain('aria-current="page"');
  });

  test('admin.html — meta color-scheme: light (dark mode inversion block)', async ({ page }) => {
    const res = await page.request.get('/admin.html');
    const html = await res.text();
    expect(html).toMatch(/<meta\s+name="color-scheme"\s+content="light"/);
    expect(html).toMatch(/<meta\s+name="supported-color-schemes"\s+content="light"/);
  });

  test('admin.html — marka drawer aria-modal="true"', async ({ page }) => {
    const res = await page.request.get('/admin.html');
    const html = await res.text();
    expect(html).toMatch(/<aside[^>]*role="dialog"[^>]*aria-modal="true"/);
  });

  test('admin.html — tablist button role=tab + aria-selected', async ({ page }) => {
    const res = await page.request.get('/admin.html');
    const html = await res.text();
    const tabs = html.match(/<button[^>]*role="tab"[^>]*>/g) || [];
    expect(tabs.length).toBeGreaterThanOrEqual(3);
    for (const t of tabs) {
      expect(t).toMatch(/aria-selected="(?:true|false)"/);
    }
  });

  test('admin.html — emoji yok (brand rule)', async ({ page }) => {
    const res = await page.request.get('/admin.html');
    const html = await res.text();
    // Common emoji ranges — eğer admin HTML'inde emoji varsa brand fail
    const emojiRe = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F9FF}]/u;
    expect(emojiRe.test(html)).toBe(false);
  });

  test('admin-core.js — mount + toast + emptyStateIcon exposed', async ({ page }) => {
    const res = await page.request.get('/admin-core.js');
    const js = await res.text();
    expect(js).toContain('window._htAdminCore');
    expect(js).toContain('mount:');
    expect(js).toContain('toast:');
    expect(js).toContain('emptyStateIcon:');
  });
});
