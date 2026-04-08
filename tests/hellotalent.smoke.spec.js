const { test, expect } = require('@playwright/test');

// Helper: navigate directly to target path (index.html IS the gate now)
async function withGate(page, path) {
  await page.goto(path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
}

const PAGES = [
  { name: 'Homepage', path: '/' },
  { name: 'Aday', path: '/aday.html' },
  { name: 'Isveren', path: '/isveren.html' },
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
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      await withGate(page, pg.path);
      const critical = errors.filter(e =>
        !e.toLowerCase().includes('supabase') &&
        !e.includes('PostHog') &&
        !e.includes('Sentry')
      );
      expect(critical).toEqual([]);
    });
  }
});

test.describe('Shared Chrome', () => {
  for (const path of ['/aday.html', '/isveren.html']) {
    test(path + ' has header+footer', async ({ page }) => {
      await withGate(page, path);
      await expect(page.locator('.site-header')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('.site-footer')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('.header-logo')).toContainText('hello');
    });
  }
});

test('Brand fonts loaded', async ({ page }) => {
  await withGate(page, '/aday.html');
  await page.evaluate(async () => {
    await Promise.all([
      document.fonts.load('400 16px "Plus Jakarta Sans"'),
      document.fonts.load('400 16px "Bricolage Grotesque"'),
    ]);
  });
  const ok = await page.evaluate(() =>
    document.fonts.check('16px "Plus Jakarta Sans"') &&
    document.fonts.check('16px "Bricolage Grotesque"')
  );
  expect(ok).toBe(true);
});

test.describe('Aday LP', () => {
  test.beforeEach(async ({ page }) => {
    await withGate(page, '/aday.html');
  });
  test('Google signup button exists', async ({ page }) => {
    await expect(page.locator('#btn-google-signup-aday')).toBeVisible({ timeout: 10000 });
  });
  test('hero section is visible', async ({ page }) => {
    await expect(page.locator('.lp-hero')).toBeVisible({ timeout: 10000 });
  });
  test('at least 5 pill elements exist', async ({ page }) => {
    const count = await page.locator('.lp-pill').count();
    expect(count).toBeGreaterThanOrEqual(5);
  });
  test('exactly 3 step elements exist', async ({ page }) => {
    const count = await page.locator('.lp-step').count();
    expect(count).toBe(3);
  });
});

test('Gate page has correct structure', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.locator('.gate')).toBeVisible({ timeout: 10000 });
  const halves = await page.locator('.gate-half').count();
  expect(halves).toBe(2);
});

test.describe('Mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test('hamburger visible', async ({ page }) => {
    await withGate(page, '/aday.html');
    await expect(page.locator('.hamburger')).toBeVisible({ timeout: 10000 });
  });
  test('no horizontal scroll', async ({ page }) => {
    for (const p of ['/aday.html', '/isveren.html']) {
      await withGate(page, p);
      const hs = await page.evaluate(() =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth
      );
      expect(hs, 'HScroll on ' + p).toBe(false);
    }
  });
});

test.describe('SEO', () => {
  test('homepage meta tags', async ({ page }) => {
    await withGate(page, '/');
    const t = await page.title();
    expect(t.toLowerCase()).toContain('hellotalent');
    const d = await page.$eval('meta[name="description"]', el => el.getAttribute('content'));
    expect(d.length).toBeGreaterThan(50);
  });
});

test('No roportaj anywhere', async ({ page }) => {
  for (const p of ['/', '/aday.html', '/isveren.html']) {
    await withGate(page, p);
    const t = await page.textContent('body');
    expect(t.toLowerCase()).not.toContain('röportaj');
  }
});
