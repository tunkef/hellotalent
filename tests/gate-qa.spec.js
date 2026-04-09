// Unified Landing Page QA Tests for hellotalent.ai
// Tests segment toggle, layout, dark mode, and responsive behavior
const { test, expect } = require('@playwright/test');

var viewports = [
  { name: 'mobile',        width: 390,  height: 844  },
  { name: 'tablet',        width: 768,  height: 1024 },
  { name: 'small-desktop', width: 1024, height: 768  },
  { name: 'desktop',       width: 1440, height: 900  },
];

for (var vp of viewports) {
  test.describe(`${vp.name} (${vp.width}x${vp.height})`, () => {

    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/index.html', { waitUntil: 'networkidle', timeout: 30000 });
    });

    // 1. Navigate + screenshot
    test('page loads and screenshot', async ({ page }) => {
      await page.screenshot({ path: `qa-screenshots/${vp.name}-light.png`, fullPage: true });
      var title = await page.title();
      expect(title.toLowerCase()).toContain('hellotalent');
    });

    // 2. Segment toggle exists
    test('segment toggle with two buttons', async ({ page }) => {
      var toggle = page.locator('.seg-toggle');
      await expect(toggle).toBeVisible();

      var adayBtn = page.locator('.seg-btn[data-seg="adaylar"]');
      var kurumsalBtn = page.locator('.seg-btn[data-seg="kurumsal"]');
      await expect(adayBtn).toBeVisible();
      await expect(kurumsalBtn).toBeVisible();

      // Adaylar is active by default
      await expect(adayBtn).toHaveClass(/active/);
    });

    // 3. Default segment is adaylar
    test('adaylar segment visible by default', async ({ page }) => {
      await expect(page.locator('#seg-adaylar')).toBeVisible();
      await expect(page.locator('#seg-kurumsal')).toBeHidden();
    });

    // 4. Segment switch works
    test('segment toggle switches content', async ({ page }) => {
      await page.click('.seg-btn[data-seg="kurumsal"]');
      await page.waitForTimeout(500);
      await expect(page.locator('#seg-kurumsal')).toBeVisible();
      await expect(page.locator('#seg-adaylar')).toBeHidden();

      // Switch back
      await page.click('.seg-btn[data-seg="adaylar"]');
      await page.waitForTimeout(500);
      await expect(page.locator('#seg-adaylar')).toBeVisible();
      await expect(page.locator('#seg-kurumsal')).toBeHidden();
    });

    // 5. No horizontal overflow
    test('no horizontal overflow', async ({ page }) => {
      var overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(overflow).toBe(false);
    });

    // 6. Header renders
    test('header renders with logo and login', async ({ page }) => {
      var logo = page.locator('.lp-logo');
      await expect(logo).toBeVisible();
      var logoText = await logo.textContent();
      expect(logoText.toLowerCase()).toContain('hellotalent');

      var loginCta = page.locator('.lp-hdr-cta');
      await expect(loginCta).toBeVisible();
    });

    // 7. Dark mode
    test('dark mode renders correctly', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.waitForTimeout(300);
      await page.screenshot({ path: `qa-screenshots/${vp.name}-dark.png`, fullPage: true });

      var bgColor = await page.evaluate(() => {
        return getComputedStyle(document.body).backgroundColor;
      });
      console.log(`Dark mode body bg: ${bgColor}`);
      expect(bgColor).not.toBe('rgb(247, 246, 244)');
    });

    // 8. Hash-based routing
    test('hash #kurumsal loads kurumsal segment', async ({ page }) => {
      await page.goto('/index.html#kurumsal', { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      await expect(page.locator('#seg-kurumsal')).toBeVisible();
      await expect(page.locator('#seg-adaylar')).toBeHidden();
    });

    // 9. Hero sections in both segments
    test('both segments have hero sections', async ({ page }) => {
      // Adaylar hero
      await expect(page.locator('#seg-adaylar .hero')).toBeVisible();
      await expect(page.locator('#seg-adaylar .hero-hl')).toBeVisible();

      // Switch to kurumsal
      await page.click('.seg-btn[data-seg="kurumsal"]');
      await page.waitForTimeout(500);
      await expect(page.locator('#seg-kurumsal .hero')).toBeVisible();
      await expect(page.locator('#seg-kurumsal .hero-hl')).toBeVisible();
    });

    // Desktop-only tests
    if (vp.name === 'desktop' || vp.name === 'small-desktop') {
      test('no unwanted scrollbars', async ({ page }) => {
        var scrollInfo = await page.evaluate(() => ({
          scrollW: document.documentElement.scrollWidth,
          clientW: document.documentElement.clientWidth,
        }));
        expect(scrollInfo.scrollW).toBeLessThanOrEqual(scrollInfo.clientW);
      });
    }
  });
}
