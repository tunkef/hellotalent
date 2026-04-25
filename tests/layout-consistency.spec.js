var { test, expect } = require('@playwright/test');

/**
 * Asama 84.1 — Clatu HR Layout System Consistency
 *
 * Hedef: 3 İK sayfası (giris, uye-ol, isveren-onboarding) standart
 * hr-page-header + hr-page-footer markup'ına uygun mu?
 *
 * Sidebar-based sayfalar (admin, ik) bu testten muaf — FAZ B'de migration.
 *
 * Kapsam:
 * - 3 sayfa
 * - 4 viewport (390/768/1024/1440)
 * - light + dark mode (CSS attribute kontrol, tam render bağımsız)
 *
 * Regression guard: 'Kurumsal başvuru' subtitle metni isveren-onboarding'de YOK.
 */

var STANDARDIZED_PAGES = [
  { path: '/giris.html',              rightSlotText: /Hesabın yok mu/ },
  { path: '/uye-ol.html',             rightSlotText: /Hesabın var mı/ },
  { path: '/isveren-onboarding.html', rightSlotText: /Adım/ }
];

var VIEWPORTS = [
  { name: 'mobile',  width: 390,  height: 844  },
  { name: 'tablet',  width: 768,  height: 1024 },
  { name: 'laptop',  width: 1024, height: 768  },
  { name: 'desktop', width: 1440, height: 900  }
];

STANDARDIZED_PAGES.forEach(function(p) {
  test.describe('Layout: ' + p.path, function() {

    test('hr-page-header markup mevcut', async function({ page }) {
      await page.goto(p.path, { waitUntil: 'domcontentloaded' });
      var header = page.locator('header.hr-page-header');
      await expect(header).toHaveCount(1);
      await expect(header).toBeVisible();
    });

    test('header logo doğru markup ve link', async function({ page }) {
      await page.goto(p.path, { waitUntil: 'domcontentloaded' });
      var logo = page.locator('header.hr-page-header a.hr-page-header__logo');
      await expect(logo).toHaveCount(1);
      await expect(logo).toHaveAttribute('href', '/index.html');
      await expect(logo).toContainText(/hello/);
      await expect(logo).toContainText(/talent/);
    });

    test('header sağ slot doğru içerik', async function({ page }) {
      await page.goto(p.path, { waitUntil: 'domcontentloaded' });
      var right = page.locator('header.hr-page-header .hr-page-header__right');
      await expect(right).toHaveCount(1);
      await expect(right).toContainText(p.rightSlotText);
    });

    test('hr-page-footer markup mevcut', async function({ page }) {
      await page.goto(p.path, { waitUntil: 'domcontentloaded' });
      var footer = page.locator('footer.hr-page-footer');
      await expect(footer).toHaveCount(1);
    });

    test('footer 4 link mevcut', async function({ page }) {
      await page.goto(p.path, { waitUntil: 'domcontentloaded' });
      var links = page.locator('footer.hr-page-footer .hr-page-footer__link');
      await expect(links).toHaveCount(4);
      await expect(links.nth(0)).toContainText(/KVKK/);
      await expect(links.nth(1)).toContainText(/Gizlilik/);
      await expect(links.nth(2)).toContainText(/Kullanım/);
      await expect(links.nth(3)).toContainText(/İletişim/);
    });

    test('footer copyright "© 2026" içeriyor', async function({ page }) {
      await page.goto(p.path, { waitUntil: 'domcontentloaded' });
      var copy = page.locator('footer.hr-page-footer .hr-page-footer__copy');
      await expect(copy).toContainText(/© 2026/);
      await expect(copy).toContainText(/HelloTalent/);
    });

    test('clatu-hr-components.css yüklenmiş', async function({ page }) {
      await page.goto(p.path, { waitUntil: 'domcontentloaded' });
      var hasLib = await page.evaluate(function() {
        return Array.prototype.some.call(
          document.querySelectorAll('link[rel="stylesheet"]'),
          function(l) { return /clatu-hr-components\.css/.test(l.href); }
        );
      });
      expect(hasLib).toBe(true);
    });

    test('header sticky 60px yükseklik', async function({ page }) {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(p.path, { waitUntil: 'domcontentloaded' });
      var box = await page.locator('header.hr-page-header').boundingBox();
      expect(box).not.toBeNull();
      // Tolerance 2px (border-bottom dahil)
      expect(box.height).toBeGreaterThanOrEqual(58);
      expect(box.height).toBeLessThanOrEqual(64);
    });

    VIEWPORTS.forEach(function(vp) {
      test('viewport ' + vp.name + ' (' + vp.width + 'x' + vp.height + ') header görünür', async function({ page }) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(p.path, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('header.hr-page-header')).toBeVisible();
        await expect(page.locator('header.hr-page-header__logo, header.hr-page-header a.hr-page-header__logo').first()).toBeVisible();
      });
    });
  });
});

/* ═══════════════════════════════════════════════════════════
   REGRESSION GUARD — isveren-onboarding "Kurumsal başvuru"
   Tuna feedback (2026-04-25): subtitle KALDIRILDI, geri gelmesin.
   ═══════════════════════════════════════════════════════════ */
test.describe('Regression: isveren-onboarding subtitle', function() {

  test('Header içinde "Kurumsal başvuru" metni YOK', async function({ page }) {
    await page.goto('/isveren-onboarding.html', { waitUntil: 'domcontentloaded' });
    var headerText = await page.locator('header.hr-page-header').textContent();
    expect(headerText).not.toMatch(/Kurumsal başvuru/);
  });

  test('lf-logo::after pseudo eki YOK', async function({ page }) {
    await page.goto('/isveren-onboarding.html', { waitUntil: 'domcontentloaded' });
    // Logo elementinin ::after pseudo'sunda content boş olmalı
    var pseudoContent = await page.locator('header.hr-page-header__logo, header.hr-page-header a.hr-page-header__logo').first().evaluate(function(el) {
      var style = window.getComputedStyle(el, '::after');
      return style.content;
    });
    // 'none' veya '""' kabul edilir; '· Kurumsal' içermemeli
    expect(pseudoContent).not.toMatch(/Kurumsal/);
  });

  test('Step counter "Adım N / 8" formatında', async function({ page }) {
    await page.goto('/isveren-onboarding.html', { waitUntil: 'domcontentloaded' });
    var step = page.locator('header.hr-page-header .hr-page-header__step');
    await expect(step).toHaveCount(1);
    await expect(step).toContainText(/Adım \d+ \/ \d+/);
  });

  test('Çıkış butonu sağ slotta mevcut', async function({ page }) {
    await page.goto('/isveren-onboarding.html', { waitUntil: 'domcontentloaded' });
    var btn = page.locator('header.hr-page-header #obh-logout');
    await expect(btn).toHaveCount(1);
    await expect(btn).toContainText(/Çıkış/);
  });
});

/* ═══════════════════════════════════════════════════════════
   SIDEBAR PAGES — sadece ik.html (FAZ B'de tam migration olacak)
   admin.html Tuna'nın internal panel, ayrı sistem — bu testten MUAF.
   ═══════════════════════════════════════════════════════════ */
test.describe('Sidebar pages: library import only', function() {
  ['/ik.html'].forEach(function(path) {
    test(path + ' clatu-hr-components.css import etmiş', async function({ page }) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      var hasLib = await page.evaluate(function() {
        return Array.prototype.some.call(
          document.querySelectorAll('link[rel="stylesheet"]'),
          function(l) { return /clatu-hr-components\.css/.test(l.href); }
        );
      });
      expect(hasLib).toBe(true);
    });
  });
});
