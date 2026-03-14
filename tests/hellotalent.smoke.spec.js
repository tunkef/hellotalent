const { test, expect } = require('@playwright/test');

// Helper: set gate before every navigation
async function withGate(page, path) {
  await page.goto('https://hellotalent.ai/gate.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.evaluate(() => sessionStorage.setItem('ht_gate', 'ok'));
  await page.goto('https://hellotalent.ai' + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
}

const PAGES = [
  { name: 'Homepage', path: '/' },
  { name: 'Aday', path: '/aday.html' },
  { name: 'Isveren', path: '/isveren.html' },
  { name: 'Kariyer', path: '/kariyer.html' },
  { name: 'Pozisyonlar', path: '/pozisyonlar.html' },
  { name: 'Yetkinlik', path: '/yetkinlik.html' },
  { name: 'Blog', path: '/blog.html' },
  { name: 'Hakkimizda', path: '/hakkimizda.html' },
  { name: 'Iletisim', path: '/iletisim.html' },
  { name: 'Isalim', path: '/isalim-rotasi.html' },
  { name: 'Gizlilik', path: '/gizlilik.html' },
  { name: 'KVKK', path: '/kvkk.html' },
  { name: 'Kullanim', path: '/kullanim-sartlari.html' },
  { name: 'Cerez', path: '/cerez-politikasi.html' },
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
  for (const path of ['/', '/aday.html', '/isveren.html', '/kariyer.html']) {
    test(path + ' has header+footer', async ({ page }) => {
      await withGate(page, path);
      await expect(page.locator('.site-header')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('.site-footer')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('.header-logo')).toContainText('hello');
    });
  }
});

test('Brand fonts loaded', async ({ page }) => {
  await withGate(page, '/');
  await page.waitForTimeout(3000);
  const ok = await page.evaluate(() =>
    document.fonts.check('16px "Plus Jakarta Sans"') &&
    document.fonts.check('16px "Bricolage Grotesque"')
  );
  expect(ok).toBe(true);
});

test.describe('Aday Form', () => {
  test.beforeEach(async ({ page }) => {
    await withGate(page, '/aday.html');
  });
  test('signup form visible', async ({ page }) => {
    await expect(page.locator('#form-kayit')).toBeVisible({ timeout: 10000 });
  });
  test('tab switch works', async ({ page }) => {
    await page.click('#tab-giris');
    await expect(page.locator('#form-giris')).toBeVisible();
    await page.click('#tab-kayit');
    await expect(page.locator('#form-kayit')).toBeVisible();
  });
  test('phone has Turkish pattern', async ({ page }) => {
    const p = await page.locator('#reg-telefon').getAttribute('pattern');
    expect(p).toBe('0[0-9]{10}');
  });
  test('inputs have aria-labels', async ({ page }) => {
    for (const s of ['#reg-isim','#reg-email','#reg-sifre','#reg-telefon']) {
      const a = await page.locator(s).getAttribute('aria-label');
      expect(a).toBeTruthy();
    }
    await page.click('#tab-giris');
    for (const s of ['#giris-email','#giris-sifre']) {
      const a = await page.locator(s).getAttribute('aria-label');
      expect(a).toBeTruthy();
    }
  });
  test('brand marquee has will-change', async ({ page }) => {
    const wc = await page.locator('.brands-track').evaluate(el => getComputedStyle(el).willChange);
    expect(wc).toBe('transform');
  });
});

test('Gate sets sessionStorage', async ({ page }) => {
  await page.goto('https://hellotalent.ai/gate.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const v = await page.evaluate(() => sessionStorage.getItem('ht_gate'));
  expect(v).toBe('ok');
});

test.describe('Mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test('hamburger visible', async ({ page }) => {
    await withGate(page, '/');
    await expect(page.locator('.hamburger')).toBeVisible({ timeout: 10000 });
  });
  test('no horizontal scroll', async ({ page }) => {
    for (const p of ['/aday.html', '/kariyer.html']) {
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
  for (const p of ['/', '/aday.html', '/kariyer.html', '/isveren.html']) {
    await withGate(page, p);
    const t = await page.textContent('body');
    expect(t.toLowerCase()).not.toContain('röportaj');
  }
});
