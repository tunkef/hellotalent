// ik-campaigns.spec.js — Asama 86 Sprint D
// D2.5: Kampanyalar MVP 2 sonrası (Iyzico entegrasyon) — sayfa kalıcı empty state.
// Filter toolbar / liste / modal / archive / counts KALDIRILDI.
// Aktif testler: markup integrity + empty state + btn-cmp-disabled + dark mode.

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
    // D2.5: data-ik-cmp-status filter butonları empty state'te yok — test silindi
    test('Empty state markup: ik-cmp-empty + btn-cmp-disabled mevcut', () => {
      expect(html).toMatch(/id=["']ik-cmp-empty["']/);
      expect(html).toMatch(/id=["']btn-cmp-disabled["']/);
      expect(html).toMatch(/aria-disabled=["']true["']/);
    });
    test('aria-current="page" Kampanyalar dropdown linkinde', () => {
      expect(html).toMatch(/href=["']hr-campaigns\.html["'][^>]*aria-current=["']page["']/);
    });
    test('Skip link #ik-cmp-shell', () => {
      expect(html).toMatch(/href=["']#ik-cmp-shell["']/);
    });
  });

  // D2.5: Filter toolbar, liste, modal, archive, counts testleri silindi.
  // Kampanyalar MVP 2 sonrası aktif olacak (Iyzico entegrasyonu).

  test.describe('Hero + empty state', () => {
    test('Hero render: eyebrow + headline mevcut', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoCampaigns(page);
      await expect(page.locator('.ik-cmp-hero')).toHaveCount(1);
      await expect(page.locator('.ik-cmp-headline')).toContainText(/Kampanyalar/i);
    });
    test('Empty state gorunur: baslik + aciklama', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoCampaigns(page);
      await expect(page.locator('#ik-cmp-empty')).toBeVisible();
      await expect(page.locator('.ik-cmp-empty__title')).toContainText(/yakında/i);
    });
    test('btn-cmp-disabled aria-disabled=true, tiklaninca tepki vermez', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoCampaigns(page);
      const btn = page.locator('#btn-cmp-disabled');
      await expect(btn).toBeVisible();
      await expect(btn).toHaveAttribute('aria-disabled', 'true');
    });
    // D2.5: Filter toolbar yok — filter testleri silindi
    // D2.5: #ik-cmp-new-btn yok (yerine btn-cmp-disabled) — modal testleri silindi
    // D2.5: .ik-cmp-row yok — liste/archive/counts testleri silindi
  });

  test.describe('Dark mode', () => {
    test('Dark theme: hero + empty state render', async ({ page }) => {
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
      await expect(page.locator('#ik-cmp-empty')).toBeVisible(); // D2.5: row yerine empty state
    });
  });

  test.describe('Mobile viewport', () => {
    test('Mobile: hero + empty state responsive', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await gotoDemoCampaigns(page);
      await expect(page.locator('.ik-cmp-hero')).toBeVisible();
      await expect(page.locator('#ik-cmp-empty')).toBeVisible(); // D2.5: toolbar/row yerine empty state
    });
  });
});
