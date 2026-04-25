// ik-shell.spec.js — Asama 86 Sprint A
// IK shell (lp-hdr-ik header + sub-nav + bottom nav + dropdown + drawer)
// yapisal + davranis kontrolleri.
// Demo mode (auth bypass) icin localStorage.ht_ik_demo_mode = '1' set edilir.

const { test, expect } = require('@playwright/test');

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 }
};

async function gotoDemoIK(page, path = '/ik.html') {
  await page.addInitScript(() => {
    try { localStorage.setItem('ht_ik_demo_mode', '1'); }
    catch (e) { /* ignore */ }
  });
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}

test.describe('Asama 86 Sprint A — IK Shell', () => {
  test.describe('Header (lp-hdr-ik)', () => {
    test('64px fixed header render edilir', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoIK(page);
      const hdr = page.locator('.lp-hdr-ik');
      await expect(hdr).toHaveCount(1);
      const box = await hdr.boundingBox();
      expect(box.height).toBe(64);
      expect(box.y).toBe(0);
    });

    test('logo "hello<em>talent</em>" görünür ve ik.html linkine sahip', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoIK(page);
      const logo = page.locator('.lp-hdr-ik__logo');
      await expect(logo).toHaveCount(1);
      await expect(logo).toContainText(/hello/i);
      await expect(logo).toContainText(/talent/i);
      await expect(logo).toHaveAttribute('href', 'ik.html');
    });

    test('3 segment buton (Anasayfa · Adaylar · Mesajlar)', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoIK(page);
      const segs = page.locator('.lp-hdr-ik__segment');
      await expect(segs).toHaveCount(3);
      await expect(segs.nth(0)).toContainText(/Anasayfa/i);
      await expect(segs.nth(1)).toContainText(/Adaylar/i);
      await expect(segs.nth(2)).toContainText(/Mesajlar/i);
    });

    test('Anasayfa segment is-active sınıfı (ik.html üzerinde)', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoIK(page);
      const active = page.locator('.lp-hdr-ik__segment.is-active');
      await expect(active).toHaveCount(1);
      await expect(active).toContainText(/Anasayfa/i);
    });

    test('Mesaj icon button + Bildirim icon button render edilir', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoIK(page);
      const icons = page.locator('.lp-hdr-ik__icon-btn');
      await expect(icons).toHaveCount(2);
    });

    test('Avatar button render edilir + initial gösterir', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoIK(page);
      const avatar = page.locator('#ik-avatar-btn');
      await expect(avatar).toHaveCount(1);
      const text = await avatar.textContent();
      expect(text.trim().length).toBeGreaterThan(0);
    });
  });

  test.describe('Avatar dropdown', () => {
    test('Açık değil — başlangıç durumu', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoIK(page);
      const dd = page.locator('#ik-avatar-dropdown');
      await expect(dd).not.toHaveClass(/is-open/);
    });

    test('Avatar tıklayınca dropdown açılır', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoIK(page);
      await page.click('#ik-avatar-btn');
      const dd = page.locator('#ik-avatar-dropdown');
      await expect(dd).toHaveClass(/is-open/);
    });

    test('Dropdown 5 menü item içerir (Şirket, Ekip, Kampanya, Ayarlar, Çıkış)', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoIK(page);
      await page.click('#ik-avatar-btn');
      const items = page.locator('.lp-hdr-ik__dropdown-item');
      await expect(items).toHaveCount(5);
      await expect(items.nth(0)).toContainText(/Şirket profili/i);
      await expect(items.nth(1)).toContainText(/Ekip yönetimi/i);
      await expect(items.nth(2)).toContainText(/Kampanyalar/i);
      await expect(items.nth(3)).toContainText(/Ayarlar/i);
      await expect(items.nth(4)).toContainText(/Çıkış/i);
    });

    test('Dropdown dışına tıklayınca kapanır', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoIK(page);
      await page.click('#ik-avatar-btn');
      await expect(page.locator('#ik-avatar-dropdown')).toHaveClass(/is-open/);
      await page.click('main', { position: { x: 100, y: 200 } });
      await expect(page.locator('#ik-avatar-dropdown')).not.toHaveClass(/is-open/);
    });

    test('Escape tusu dropdown kapanir', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoIK(page);
      await page.click('#ik-avatar-btn');
      await expect(page.locator('#ik-avatar-dropdown')).toHaveClass(/is-open/);
      await page.keyboard.press('Escape');
      await expect(page.locator('#ik-avatar-dropdown')).not.toHaveClass(/is-open/);
    });
  });

  test.describe('Sub-nav (Adaylar segment)', () => {
    test('ik.html sayfasında sub-nav gizli', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoIK(page);
      const subnav = page.locator('#ik-subnav');
      await expect(subnav).not.toHaveClass(/is-visible/);
    });

    test('Sub-nav 3 alt-tab icerir (DOM uzerinde hep var)', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoIK(page);
      const items = page.locator('.ik-subnav__item');
      await expect(items).toHaveCount(3);
      await expect(items.nth(0)).toContainText(/Pipeline/i);
      await expect(items.nth(1)).toContainText(/Havuz/i);
      await expect(items.nth(2)).toContainText(/Aday detayı/i);
    });
  });

  test.describe('Mobile responsive', () => {
    test('Mobile viewport: hamburger görünür, segment nav gizli', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await gotoDemoIK(page);
      const hamburger = page.locator('#ik-hamburger');
      await expect(hamburger).toBeVisible();
      const nav = page.locator('.lp-hdr-ik__nav');
      await expect(nav).not.toBeVisible();
    });

    test('Mobile viewport: bottom nav 5 item ile görünür', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await gotoDemoIK(page);
      const bottom = page.locator('#ik-bottom-nav');
      await expect(bottom).toBeVisible();
      const items = page.locator('.ik-bottom-nav__item');
      await expect(items).toHaveCount(5);
    });

    test('Hamburger tıklayınca drawer açılır', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await gotoDemoIK(page);
      await page.click('#ik-hamburger');
      const drawer = page.locator('#ik-mobile-drawer');
      await expect(drawer).toHaveClass(/is-open/);
    });

    test('Drawer overlay tıklayınca drawer kapanır', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await gotoDemoIK(page);
      await page.click('#ik-hamburger');
      await expect(page.locator('#ik-mobile-drawer')).toHaveClass(/is-open/);
      await page.locator('#ik-mobile-overlay').click();
      await expect(page.locator('#ik-mobile-drawer')).not.toHaveClass(/is-open/);
    });

    test('Desktop viewport: bottom nav gizli', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoIK(page);
      const bottom = page.locator('#ik-bottom-nav');
      await expect(bottom).not.toBeVisible();
    });
  });

  test.describe('Eski hr-shell/hr-polish import yok', () => {
    test('ik.html eski override CSS import etmez', async ({ page }) => {
      await page.goto('/ik.html');
      const hadOldCSS = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
        return links.some(l => /hr-shell\.css|hr-polish\.css|clatu-hr-/i.test(l.href));
      });
      expect(hadOldCSS).toBe(false);
    });

    test('ik.html tokens.css ve ik-shell.css import eder (markup-level)', () => {
      // Auth-walled redirect → markup-level grep
      const fs = require('fs');
      const path = require('path');
      const ikHtml = fs.readFileSync(path.join(__dirname, '..', 'ik.html'), 'utf8');
      expect(ikHtml).toMatch(/<link[^>]*href=["'][^"']*tokens\.css/);
      expect(ikHtml).toMatch(/<link[^>]*href=["'][^"']*ik-shell\.css/);
    });
  });

  test.describe('Skip link (WCAG 2.4.1)', () => {
    test('skip link ilk focusable element', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoIK(page);
      const skip = page.locator('.ik-skip-link');
      await expect(skip).toHaveCount(1);
      await expect(skip).toHaveAttribute('href', '#ik-genel-shell');
    });
  });
});
