const { test, expect } = require('@playwright/test');

const VIEWPORTS = [
  { name: 'Mobile', width: 390, height: 844 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'SmallDesktop', width: 1024, height: 768 },
  { name: 'Desktop', width: 1440, height: 900 },
];

const BASE = 'http://localhost:3000';

// Helper: navigate to unified LP segment
async function gotoSegment(page, seg) {
  await page.goto(`${BASE}/index.html#${seg}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500); // allow segment toggle animation
}

// ─── KURUMSAL SEGMENT (index.html#kurumsal) ─────────────────────
for (const vp of VIEWPORTS) {
  test.describe(`kurumsal @ ${vp.name} (${vp.width}x${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test('screenshot + no overflow + images load', async ({ page }) => {
      await gotoSegment(page, 'kurumsal');
      await page.screenshot({ path: `test-results/kurumsal-${vp.name}-light.png`, fullPage: true });

      const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientW = await page.evaluate(() => document.documentElement.clientWidth);
      if (scrollW > clientW) {
        console.log(`ISSUE: kurumsal@${vp.name} horizontal overflow: scrollWidth=${scrollW}, clientWidth=${clientW}`);
      }
      expect(scrollW).toBeLessThanOrEqual(clientW);

      const broken = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('#seg-kurumsal img'))
          .filter(i => i.src && !i.src.includes('data:') && (!i.complete || i.naturalWidth === 0))
          .map(i => i.getAttribute('src'));
      });
      if (broken.length > 0) console.log(`ISSUE: kurumsal@${vp.name} broken images: ${broken.join(', ')}`);
      expect(broken).toHaveLength(0);
    });

    test('kurumsal segment is visible', async ({ page }) => {
      await gotoSegment(page, 'kurumsal');
      await expect(page.locator('#seg-kurumsal')).toBeVisible();
      await expect(page.locator('#seg-adaylar')).toBeHidden();
    });

    test('hero section (navy)', async ({ page }) => {
      await gotoSegment(page, 'kurumsal');
      await expect(page.locator('#seg-kurumsal section.hero')).toBeVisible();
      await expect(page.locator('#seg-kurumsal .hero-hl')).toBeVisible();
      await expect(page.locator('#seg-kurumsal .hero-vis img')).toBeVisible();
    });

    test('brand social proof section', async ({ page }) => {
      await gotoSegment(page, 'kurumsal');
      await expect(page.locator('.brand-section')).toBeVisible();
      const tags = page.locator('.brand-tag');
      expect(await tags.count()).toBeGreaterThanOrEqual(10);
    });

    test('steps section', async ({ page }) => {
      await gotoSegment(page, 'kurumsal');
      const steps = page.locator('#seg-kurumsal .steps-row');
      await expect(steps).toBeVisible();
      const stepCards = page.locator('#seg-kurumsal .step-card');
      expect(await stepCards.count()).toBeGreaterThanOrEqual(3);
    });

    test('who section', async ({ page }) => {
      await gotoSegment(page, 'kurumsal');
      const whoGrid = page.locator('#seg-kurumsal .who-grid');
      if (await whoGrid.count() > 0) {
        await expect(whoGrid).toBeVisible();
      }
    });

    test('kurumsal CTA section visible', async ({ page }) => {
      await gotoSegment(page, 'kurumsal');
      var cta = page.locator('#lead-form');
      await expect(cta).toBeVisible();
      var link = page.locator('#lead-form a[href="uye-ol.html?tab=kurumsal"]');
      await expect(link).toBeVisible();
    });

    test('footer visible', async ({ page }) => {
      await gotoSegment(page, 'kurumsal');
      const footer = page.locator('footer');
      if (await footer.count() > 0) {
        await expect(footer.first()).toBeVisible();
      }
    });

    test('dark mode', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });
      await gotoSegment(page, 'kurumsal');
      await page.screenshot({ path: `test-results/kurumsal-${vp.name}-dark.png`, fullPage: true });

      const bgColor = await page.evaluate(() => {
        return window.getComputedStyle(document.body).backgroundColor;
      });
      console.log(`kurumsal@${vp.name} dark mode bg: ${bgColor}`);
      const m = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (m) {
        var sum = parseInt(m[1]) + parseInt(m[2]) + parseInt(m[3]);
        expect(sum).toBeLessThan(150);
      }
    });
  });
}

// ─── ADAYLAR SEGMENT (index.html#adaylar) ───────────────────────
for (const vp of VIEWPORTS) {
  test.describe(`adaylar @ ${vp.name} (${vp.width}x${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test('screenshot + no overflow + images load', async ({ page }) => {
      await gotoSegment(page, 'adaylar');
      await page.screenshot({ path: `test-results/adaylar-${vp.name}-light.png`, fullPage: true });

      const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientW = await page.evaluate(() => document.documentElement.clientWidth);
      if (scrollW > clientW) {
        console.log(`ISSUE: adaylar@${vp.name} horizontal overflow: scrollWidth=${scrollW}, clientWidth=${clientW}`);
      }
      expect(scrollW).toBeLessThanOrEqual(clientW);

      const broken = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('#seg-adaylar img'))
          .filter(i => i.src && !i.src.includes('data:') && (!i.complete || i.naturalWidth === 0))
          .map(i => i.getAttribute('src'));
      });
      if (broken.length > 0) console.log(`ISSUE: adaylar@${vp.name} broken images: ${broken.join(', ')}`);
      expect(broken).toHaveLength(0);
    });

    test('adaylar segment is default visible', async ({ page }) => {
      await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
      await expect(page.locator('#seg-adaylar')).toBeVisible();
      await expect(page.locator('#seg-kurumsal')).toBeHidden();
    });

    test('hero section + Google signup button', async ({ page }) => {
      await gotoSegment(page, 'adaylar');
      await expect(page.locator('#seg-adaylar section.hero')).toBeVisible();
      await expect(page.locator('#seg-adaylar .hero-hl')).toBeVisible();
      await expect(page.locator('#seg-adaylar .hero-vis img')).toBeVisible();

      const googleBtn = page.locator('.btn-g');
      if (await googleBtn.count() > 0) {
        await expect(googleBtn.first()).toBeVisible();
        var btnText = await googleBtn.first().textContent();
        expect(btnText).toContain('Google');
      }
    });

    test('bento grid / feature cards', async ({ page }) => {
      await gotoSegment(page, 'adaylar');
      const bento = page.locator('#seg-adaylar .bento');
      await expect(bento).toBeVisible();
      const cards = page.locator('#seg-adaylar .bento-card');
      expect(await cards.count()).toBeGreaterThanOrEqual(4);
    });

    test('steps section', async ({ page }) => {
      await gotoSegment(page, 'adaylar');
      const steps = page.locator('#seg-adaylar .steps-row');
      await expect(steps).toBeVisible();
      const stepCards = page.locator('#seg-adaylar .step-card');
      expect(await stepCards.count()).toBeGreaterThanOrEqual(3);
    });

    test('who section', async ({ page }) => {
      await gotoSegment(page, 'adaylar');
      await expect(page.locator('#seg-adaylar .who-grid')).toBeVisible();
      const whoCards = page.locator('#seg-adaylar .who-card');
      expect(await whoCards.count()).toBeGreaterThanOrEqual(3);
    });

    test('CTA scene image at bottom', async ({ page }) => {
      await gotoSegment(page, 'adaylar');
      const ctaImg = page.locator('#seg-adaylar .cta-img');
      if (await ctaImg.count() > 0) {
        await expect(ctaImg).toBeVisible();
      }
    });

    test('footer visible', async ({ page }) => {
      await gotoSegment(page, 'adaylar');
      const footer = page.locator('footer');
      if (await footer.count() > 0) {
        await expect(footer.first()).toBeVisible();
      }
    });

    test('dark mode', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });
      await gotoSegment(page, 'adaylar');
      await page.screenshot({ path: `test-results/adaylar-${vp.name}-dark.png`, fullPage: true });

      const bgColor = await page.evaluate(() => {
        return window.getComputedStyle(document.body).backgroundColor;
      });
      console.log(`adaylar@${vp.name} dark mode bg: ${bgColor}`);
      const m = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (m) {
        var sum = parseInt(m[1]) + parseInt(m[2]) + parseInt(m[3]);
        expect(sum).toBeLessThan(150);
      }
    });
  });
}

// ─── SEGMENT TOGGLE ─────────────────────────────────────────────
test.describe('segment toggle', () => {
  test('clicking Kurumsal shows kurumsal segment', async ({ page }) => {
    await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle' });
    await expect(page.locator('#seg-adaylar')).toBeVisible();

    await page.click('.seg-btn[data-seg="kurumsal"]:visible');
    await page.waitForTimeout(500);

    await expect(page.locator('#seg-kurumsal')).toBeVisible();
    await expect(page.locator('#seg-adaylar')).toBeHidden();
  });

  test('clicking Adaylar after Kurumsal returns to adaylar', async ({ page }) => {
    await page.goto(`${BASE}/index.html#kurumsal`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await expect(page.locator('#seg-kurumsal')).toBeVisible();

    await page.click('.seg-btn[data-seg="adaylar"]:visible');
    await page.waitForTimeout(500);

    await expect(page.locator('#seg-adaylar')).toBeVisible();
    await expect(page.locator('#seg-kurumsal')).toBeHidden();
  });

  test('hash #kurumsal auto-selects kurumsal on load', async ({ page }) => {
    await page.goto(`${BASE}/index.html#kurumsal`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await expect(page.locator('#seg-kurumsal')).toBeVisible();
    await expect(page.locator('#seg-adaylar')).toBeHidden();
  });
});

// ─── REDIRECT TESTS ─────────────────────────────────────────────
test.describe('legacy redirects', () => {
  test('aday.html redirects to index', async ({ page }) => {
    await page.goto(`${BASE}/aday.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    var url = page.url();
    expect(url.includes('index') || url.includes('#adaylar')).toBe(true);
  });

  test('isveren.html redirects to index', async ({ page }) => {
    await page.goto(`${BASE}/isveren.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    var url = page.url();
    expect(url.includes('index') || url.includes('#kurumsal')).toBe(true);
  });
});
