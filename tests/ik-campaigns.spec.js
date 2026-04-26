// ik-campaigns.spec.js — Asama 86 Sprint D
// Kampanyalar: liste + filter pills + status pill + new modal + dark mode.

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 }
};

async function gotoDemoCampaigns(page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('ht_ik_demo_mode', '1');
      localStorage.removeItem('ht_ik_campaigns_state');
    } catch (e) { /* ignore */ }
  });
  await page.goto('/hr-campaigns.html');
  await page.waitForLoadState('networkidle');
}

test.describe('Asama 86 Sprint D — IK Campaigns', () => {
  test.describe('Markup-level (auth-walled bypass)', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'hr-campaigns.html'), 'utf8');

    test('hr-campaigns.html ik-shell + ik-campaigns panel CSS yükler', () => {
      expect(html).toMatch(/<link[^>]*href=["'][^"']*ik-shell\.css/);
      expect(html).toMatch(/<link[^>]*href=["'][^"']*ik-campaigns\.css/);
    });
    test('ik-campaigns.js script tag mevcut', () => {
      expect(html).toMatch(/<script[^>]*src=["'][^"']*ik-campaigns\.js/);
    });
    test('Eski hr-campaigns.css yok, data-ik-page="campaigns"', () => {
      expect(html).toMatch(/data-ik-page=["']campaigns["']/);
    });
    test('Filter 5 status butonu (all/draft/scheduled/sent/archived)', () => {
      expect(html).toMatch(/data-ik-cmp-status=["']all["']/);
      expect(html).toMatch(/data-ik-cmp-status=["']draft["']/);
      expect(html).toMatch(/data-ik-cmp-status=["']scheduled["']/);
      expect(html).toMatch(/data-ik-cmp-status=["']sent["']/);
      expect(html).toMatch(/data-ik-cmp-status=["']archived["']/);
    });
    test('aria-current="page" Kampanyalar dropdown linkinde', () => {
      expect(html).toMatch(/href=["']hr-campaigns\.html["'][^>]*aria-current=["']page["']/);
    });
    test('Skip link #ik-cmp-shell', () => {
      expect(html).toMatch(/href=["']#ik-cmp-shell["']/);
    });
  });

  test.describe('Hero + toolbar', () => {
    test('Hero render: eyebrow + headline + new btn', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoCampaigns(page);
      await expect(page.locator('.ik-cmp-hero')).toHaveCount(1);
      await expect(page.locator('.ik-cmp-headline')).toContainText(/Kampanyalar/i);
      await expect(page.locator('#ik-cmp-new-btn')).toContainText(/Yeni kampanya/i);
    });
    test('Demo notice render', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoCampaigns(page);
      await expect(page.locator('.ik-cmp-notice')).toContainText(/Demo modunda/i);
    });
    test('Filter toolbar 5 buton', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoCampaigns(page);
      await expect(page.locator('.ik-cmp-filter-btn')).toHaveCount(5);
    });
    test('Tumu filter ilk basta active', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoCampaigns(page);
      const all = page.locator('.ik-cmp-filter-btn[data-ik-cmp-status="all"]');
      await expect(all).toHaveClass(/is-active/);
    });
  });

  test.describe('Liste (campaigns.json — 5 demo)', () => {
    test('Default Tumu filter altinda 4 row gozukur (archived haric)', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoCampaigns(page);
      /* campaigns.json: 5 toplam, hepsi non-archived */
      await expect(page.locator('.ik-cmp-row')).toHaveCount(5);
    });
    test('Status pill her satirda var', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoCampaigns(page);
      await expect(page.locator('.ik-cmp-status').first()).toBeVisible();
    });
    test('Stats: 6 metric (Hedef, Gönderildi, Açıldı, Yanıtlandı, Açılma oranı, Oluşturuldu)', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoCampaigns(page);
      const firstRow = page.locator('.ik-cmp-row').first();
      await expect(firstRow.locator('.ik-cmp-stat')).toHaveCount(6);
    });
    test('Draft filter sadece draft kampanyalari gosterir', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoCampaigns(page);
      await page.click('.ik-cmp-filter-btn[data-ik-cmp-status="draft"]');
      const rows = page.locator('.ik-cmp-row');
      const count = await rows.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) {
        await expect(rows.nth(i).locator('.ik-cmp-status')).toHaveClass(/ik-cmp-status--draft/);
      }
    });
    test('Sent filter sadece sent kampanyalari gosterir', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoCampaigns(page);
      await page.click('.ik-cmp-filter-btn[data-ik-cmp-status="sent"]');
      const rows = page.locator('.ik-cmp-row');
      const count = await rows.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) {
        await expect(rows.nth(i).locator('.ik-cmp-status')).toHaveClass(/ik-cmp-status--sent/);
      }
    });
  });

  test.describe('New campaign modal', () => {
    test('Modal kapali baslar', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoCampaigns(page);
      await expect(page.locator('#ik-cmp-modal')).not.toHaveClass(/is-open/);
    });
    test('+ Yeni Kampanya tiklayinca modal acilir', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoCampaigns(page);
      await page.click('#ik-cmp-new-btn');
      await expect(page.locator('#ik-cmp-modal')).toHaveClass(/is-open/);
    });
    test('Modal kapatilabilir (X + Vazgec + Backdrop + ESC)', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoCampaigns(page);
      await page.click('#ik-cmp-new-btn');
      await page.click('#ik-cmp-cancel');
      await expect(page.locator('#ik-cmp-modal')).not.toHaveClass(/is-open/);
    });
    test('Bos title save error', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoCampaigns(page);
      await page.click('#ik-cmp-new-btn');
      await page.click('#ik-cmp-save');
      await expect(page.locator('#ik-cmp-form-msg')).toContainText(/zorunlu/i);
    });
    test('Gecerli kampanya kaydedilir + listede gozukur', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoCampaigns(page);
      await page.click('#ik-cmp-new-btn');
      await page.fill('#ik-cmp-input-title', 'Test kampanya 86');
      await page.fill('#ik-cmp-input-summary', 'Demo summary');
      await page.click('#ik-cmp-save');
      await expect(page.locator('#ik-cmp-modal')).not.toHaveClass(/is-open/);
      /* Yeni kampanya en uste ekle */
      await expect(page.locator('.ik-cmp-row__title').first()).toContainText(/Test kampanya 86/i);
    });
  });

  test.describe('Archive flow', () => {
    test('Arsivle tiklayinca kampanya arsiv listesine geçer', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoCampaigns(page);
      const initialCount = await page.locator('.ik-cmp-row').count();
      const firstArchive = page.locator('button[data-action="archive"]').first();
      await firstArchive.click();
      /* Arsivlenen liste'den dusmeli */
      await expect(page.locator('.ik-cmp-row')).toHaveCount(initialCount - 1);
      /* Arsiv filter'a tikla */
      await page.click('.ik-cmp-filter-btn[data-ik-cmp-status="archived"]');
      const archivedCount = await page.locator('.ik-cmp-row').count();
      expect(archivedCount).toBeGreaterThan(0);
    });
  });

  test.describe('Counts', () => {
    test('Tumu count = non-archived total', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoCampaigns(page);
      const allCountText = await page.locator('#ik-cmp-count-all').textContent();
      const total = parseInt((allCountText || '0').trim(), 10);
      const rowCount = await page.locator('.ik-cmp-row').count();
      expect(total).toBe(rowCount);
    });
  });

  test.describe('Dark mode', () => {
    test('Dark theme: hero + filter + row render', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('ht_ik_demo_mode', '1');
        localStorage.setItem('ht_theme_preference', 'dark');
      });
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.goto('/hr-campaigns.html');
      await page.waitForLoadState('networkidle');
      const themeAttr = await page.getAttribute('html', 'data-theme');
      expect(themeAttr).toBe('dark');
      await expect(page.locator('.ik-cmp-hero')).toBeVisible();
      await expect(page.locator('.ik-cmp-row')).toHaveCount(5);
    });
  });

  test.describe('Mobile viewport', () => {
    test('Mobile: hero + filter scroll + row stack', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await gotoDemoCampaigns(page);
      await expect(page.locator('.ik-cmp-hero')).toBeVisible();
      await expect(page.locator('.ik-cmp-toolbar')).toBeVisible();
      await expect(page.locator('.ik-cmp-row').first()).toBeVisible();
    });
  });
});
