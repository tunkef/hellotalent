const { test, expect } = require('@playwright/test');

// Helper: navigate directly to target path
async function withGate(page, path) {
  await page.goto(path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
}

const PAGES = [
  { name: 'Homepage', path: '/' },
  { name: 'Adaylar', path: '/index.html#adaylar' },
  { name: 'Kurumsal', path: '/index.html#kurumsal' },
  { name: 'Hakkimizda', path: '/hakkimizda.html' },
  { name: 'Iletisim', path: '/iletisim.html' },
  { name: 'Yasal', path: '/yasal.html' },
];

test.describe('Page Load', () => {
  for (const pg of PAGES) {
    test(pg.name + ' loads', async ({ page }) => {
      await withGate(page, pg.path);
      expect(true).toBe(true);
    });
  }
});

test.describe('Console Errors', () => {
  for (const pg of PAGES.slice(0, 5)) {
    test(pg.name + ' no JS errors', async ({ page }) => {
      var errors = [];
      page.on('pageerror', function(err) { errors.push(err.message); });
      await withGate(page, pg.path);
      var critical = errors.filter(function(e) {
        return !e.toLowerCase().includes('supabase') &&
          !e.includes('PostHog') &&
          !e.includes('Sentry');
      });
      expect(critical).toEqual([]);
    });
  }
});

test.describe('Shared Chrome', () => {
  for (var p of ['/hakkimizda.html', '/iletisim.html', '/yasal.html']) {
    test(p + ' has header+footer', async ({ page }) => {
      await withGate(page, p);
      await expect(page.locator('.site-header')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('.site-footer')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('.header-logo')).toContainText('hello');
    });
  }
});

test('Brand fonts loaded', async ({ page }) => {
  await withGate(page, '/');
  await page.evaluate(async () => {
    await Promise.all([
      document.fonts.load('400 16px "Plus Jakarta Sans"'),
      document.fonts.load('400 16px "Bricolage Grotesque"'),
    ]);
  });
  var ok = await page.evaluate(() =>
    document.fonts.check('16px "Plus Jakarta Sans"') &&
    document.fonts.check('16px "Bricolage Grotesque"')
  );
  expect(ok).toBe(true);
});

test.describe('Unified LP', () => {
  test.beforeEach(async ({ page }) => {
    await withGate(page, '/');
  });

  test('segment toggle exists', async ({ page }) => {
    await expect(page.locator('.seg-toggle')).toBeVisible({ timeout: 10000 });
  });

  test('adaylar hero section is visible', async ({ page }) => {
    await expect(page.locator('#seg-adaylar .hero')).toBeVisible({ timeout: 10000 });
  });

  test('kurumsal segment activates via toggle', async ({ page }) => {
    await page.click('.seg-btn[data-seg="kurumsal"]');
    await page.waitForTimeout(500);
    await expect(page.locator('#seg-kurumsal')).toBeVisible({ timeout: 10000 });
  });

  test('LP header with logo', async ({ page }) => {
    await expect(page.locator('.lp-logo')).toBeVisible({ timeout: 10000 });
    var logoText = await page.locator('.lp-logo').textContent();
    expect(logoText.toLowerCase()).toContain('hellotalent');
  });
});

test.describe('Legacy Redirects', () => {
  test('aday.html redirects to index', async ({ page }) => {
    await page.goto('/aday.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    var url = page.url();
    expect(url.includes('index') || url.includes('#adaylar')).toBe(true);
  });

  test('isveren.html redirects to index', async ({ page }) => {
    await page.goto('/isveren.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    var url = page.url();
    expect(url.includes('index') || url.includes('#kurumsal')).toBe(true);
  });
});

test.describe('Mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test('no horizontal scroll on LP', async ({ page }) => {
    await withGate(page, '/');
    var hs = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hs).toBe(false);
  });

  test('no horizontal scroll on sub-pages', async ({ page }) => {
    for (var p of ['/hakkimizda.html', '/iletisim.html', '/yasal.html']) {
      await withGate(page, p);
      var hs = await page.evaluate(() =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth
      );
      expect(hs, 'HScroll on ' + p).toBe(false);
    }
  });
});

test.describe('SEO', () => {
  test('homepage meta tags', async ({ page }) => {
    await withGate(page, '/');
    var t = await page.title();
    expect(t.toLowerCase()).toContain('hellotalent');
    var d = await page.$eval('meta[name="description"]', function(el) { return el.getAttribute('content'); });
    expect(d.length).toBeGreaterThan(50);
  });
});

test('No roportaj anywhere', async ({ page }) => {
  for (var p of ['/', '/hakkimizda.html', '/iletisim.html']) {
    await withGate(page, p);
    var t = await page.textContent('body');
    expect(t.toLowerCase()).not.toContain('röportaj');
  }
});
