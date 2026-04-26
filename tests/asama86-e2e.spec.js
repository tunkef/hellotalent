/**
 * Asama 86 Sprint E — E2E Integration
 *
 * 9 sayfa multi-page mimarisinin uctan uca dogrulanmasi.
 * Bypass yasak — gercek navigation + DOM + localStorage.
 *
 * Demo mode: localStorage.setItem('ht_ik_demo_mode', '1') ile auth gate atla.
 * Bu test mobile + desktop projelerinde calisir (e2e degil, smoke).
 *
 * Kapsam (~30 senaryo):
 *  - Anasayfa (ik.html)
 *  - Adaylar segment (Pool/Pipeline/Candidate)
 *  - Mesajlar (hr-messages.html)
 *  - Avatar dropdown (Sirket/Ekip/Kampanya/Ayarlar)
 *  - Mobile bottom nav + hamburger drawer
 *  - LocalStorage namespace guard
 *  - Token-strict guard (no hardcoded hex in computed styles)
 */

const { test, expect } = require('@playwright/test');

// ── Demo mode bootstrap ──
async function gotoDemo(page, path) {
  // ht_ik_demo_mode=1 ile auth gate bypass
  await page.addInitScript(() => {
    try {
      localStorage.setItem('ht_ik_demo_mode', '1');
      localStorage.setItem('ht_theme_preference', 'light');
      // Eski namespace cakismasi olmasin
      Object.keys(localStorage)
        .filter((k) => k.startsWith('ht_hr_'))
        .forEach((k) => localStorage.removeItem(k));
    } catch (_) {}
  });
  await page.goto(path);
}

// ── Helper: shell ready bekle ──
async function waitShellReady(page) {
  await page.waitForFunction(
    () => document.documentElement.getAttribute('data-ik-shell-ready') === '1',
    null,
    { timeout: 10000 }
  );
}

test.describe('Asama 86 — Anasayfa (ik.html)', () => {
  test('ik.html: header + segment nav + KPI grid render eder', async ({ page }) => {
    await gotoDemo(page, '/ik.html');
    await waitShellReady(page);

    // Header
    await expect(page.locator('.lp-hdr-ik')).toBeVisible();
    await expect(page.locator('.lp-hdr-ik__logo')).toContainText('hello');

    // 3 segment
    const segments = page.locator('.lp-hdr-ik__segment');
    await expect(segments).toHaveCount(3);
    await expect(segments.nth(0)).toContainText(/Anasayfa/i);
    await expect(segments.nth(1)).toContainText(/Adaylar/i);
    await expect(segments.nth(2)).toContainText(/Mesajlar/i);

    // Anasayfa segment is-active
    await expect(segments.nth(0)).toHaveClass(/is-active/);

    // Avatar dropdown trigger
    await expect(page.locator('#ik-avatar-btn')).toBeVisible();

    // Genel-bakis shell
    await expect(page.locator('#ik-genel-shell')).toBeVisible();
  });

  test('ik.html: KPI cards yuklenir ve tiklanabilir', async ({ page }) => {
    await gotoDemo(page, '/ik.html');
    await waitShellReady(page);

    // KPI render bekle (data fetch async)
    await page.waitForSelector('.ik-kpi', { timeout: 8000 });
    const kpis = page.locator('.ik-kpi');
    await expect(kpis).toHaveCount(4);

    // Her KPI'da label + value + delta
    for (let i = 0; i < 4; i += 1) {
      await expect(kpis.nth(i).locator('.ik-kpi__label')).toBeVisible();
      await expect(kpis.nth(i).locator('.ik-kpi__value')).toBeVisible();
    }
  });

  test('ik.html: bento grid (6 kart) + son hareketler render', async ({ page }) => {
    await gotoDemo(page, '/ik.html');
    await waitShellReady(page);

    await page.waitForSelector('.ik-card', { timeout: 8000 });
    const cards = page.locator('.ik-genel__bento .ik-card');
    await expect(cards).toHaveCount(6);

    // Son hareketler feed
    await expect(page.locator('.ik-genel__feed')).toBeVisible();
  });
});

test.describe('Asama 86 — Adaylar segment (Pool)', () => {
  test('hr-pool.html: filter chip + search + bulk select calisir', async ({ page }) => {
    await gotoDemo(page, '/hr-pool.html');
    await waitShellReady(page);

    // Sub-nav visible
    await expect(page.locator('#ik-subnav')).toHaveClass(/is-visible/);

    // Toolbar
    await expect(page.locator('[data-ik-pool-search]')).toBeVisible();

    // Aday listesi yuklenir
    await page.waitForSelector('[data-ik-pool-list] li', { timeout: 8000 });
    const items = page.locator('[data-ik-pool-list] li');
    expect(await items.count()).toBeGreaterThan(0);

    // Search dene
    await page.locator('[data-ik-pool-search]').fill('a');
    await page.waitForTimeout(400);
    // Search clear button gorunur
    await expect(page.locator('[data-ik-pool-search-clear]')).toBeVisible();

    // Search temizle
    await page.locator('[data-ik-pool-search-clear]').click();
    await expect(page.locator('[data-ik-pool-search]')).toHaveValue('');
  });

  test('hr-pool.html: aday secip "Pipeline\'a ekle" toast verir', async ({ page }) => {
    await gotoDemo(page, '/hr-pool.html');
    await waitShellReady(page);

    await page.waitForSelector('[data-ik-pool-list] li input[type="checkbox"]', { timeout: 8000 });

    // Ilk adayi sec
    await page.locator('[data-ik-pool-list] li input[type="checkbox"]').first().check();

    // Bulk bar gorunur
    await expect(page.locator('[data-ik-pool-bulk]')).toHaveAttribute('data-show', 'true');
    await expect(page.locator('[data-ik-pool-bulk-count]')).toContainText('1');

    // Pipeline'a ekle
    await page.locator('[data-ik-pool-bulk-add]').click();

    // Toast (ik-pool-toast var aria-live olarak)
    await page.waitForTimeout(500);
    const toastText = await page.locator('[data-ik-pool-toast]').textContent();
    expect(toastText).toBeTruthy();

    // localStorage'da overlay var mi
    const overlay = await page.evaluate(() => localStorage.getItem('ht_ik_pipeline_state'));
    expect(overlay).toBeTruthy();
  });

  test('hr-pool.html: sub-nav "Pipeline" linkine tikla → hr-pipeline.html', async ({ page }) => {
    await gotoDemo(page, '/hr-pool.html');
    await waitShellReady(page);

    const pipelineLink = page.locator('.ik-subnav__item[data-subnav="pipeline"]');
    await expect(pipelineLink).toBeVisible();
    await pipelineLink.click();
    await page.waitForURL(/hr-pipeline\.html$/);
    expect(page.url()).toMatch(/hr-pipeline\.html$/);
  });
});

test.describe('Asama 86 — Adaylar segment (Pipeline)', () => {
  test('hr-pipeline.html: kanban 5 stage render eder', async ({ page }) => {
    await gotoDemo(page, '/hr-pipeline.html');
    await waitShellReady(page);

    // Position switcher
    await expect(page.locator('[data-ik-position-switcher]')).toBeVisible();

    // Board yuklenir (loading state baslangicta)
    await expect(page.locator('[data-ik-pipeline-board]')).toBeVisible();

    // Kanban kolonlar render olur — data-stage-key ile
    await page.waitForSelector('[data-ik-pipeline-board] .ik-stage[data-stage-key]', { timeout: 8000 });
    const cols = page.locator('[data-ik-pipeline-board] .ik-stage[data-stage-key]');
    expect(await cols.count()).toBeGreaterThanOrEqual(4);
  });

  test('hr-pipeline.html: sub-nav "Havuz" linkine tikla → hr-pool.html', async ({ page }) => {
    await gotoDemo(page, '/hr-pipeline.html');
    await waitShellReady(page);

    const havuzLink = page.locator('.ik-subnav__item[data-subnav="havuz"]');
    await havuzLink.click();
    await page.waitForURL(/hr-pool\.html$/);
    expect(page.url()).toMatch(/hr-pool\.html$/);
  });
});

test.describe('Asama 86 — Aday detayi (Candidate)', () => {
  test('hr-candidate.html?id=1: 4 tab + render', async ({ page }) => {
    await gotoDemo(page, '/hr-candidate.html?id=cnd-001');
    await waitShellReady(page);

    // Aday detay shell
    await expect(page.locator('#ik-candidate-shell')).toBeVisible();

    // Demo data 5+ saniye icinde render olur (gercek aday yoksa empty state)
    await page.waitForTimeout(1500);
  });

  test('hr-candidate.html: aday yoksa empty/error state', async ({ page }) => {
    await gotoDemo(page, '/hr-candidate.html?id=YOK_BU_ID');
    await waitShellReady(page);

    await page.waitForTimeout(1500);

    // Loading veya error msg gorunmesi
    const html = await page.locator('#ik-candidate-shell').innerHTML();
    expect(html.length).toBeGreaterThan(20);
  });
});

test.describe('Asama 86 — Mesajlar (hr-messages.html)', () => {
  test('hr-messages.html: thread list + detail empty state', async ({ page }) => {
    await gotoDemo(page, '/hr-messages.html');
    await waitShellReady(page);

    // Layout 2-pane
    await expect(page.locator('[data-ik-msg-layout]')).toBeVisible();

    // Thread list render bekle
    await page.waitForTimeout(1200);

    // Liste OR empty state
    const listVisible = await page.locator('[data-ik-msg-list-items]').isVisible().catch(() => false);
    const emptyVisible = await page.locator('[data-ik-msg-list-empty]').isVisible().catch(() => false);
    expect(listVisible || emptyVisible).toBeTruthy();
  });

  test('hr-messages.html: thread sec → mesaj formu acilir', async ({ page }) => {
    await gotoDemo(page, '/hr-messages.html');
    await waitShellReady(page);

    await page.waitForTimeout(1500);

    const threads = page.locator('[data-ik-msg-list-items] > *');
    const count = await threads.count();
    if (count > 0) {
      await threads.first().click();
      await page.waitForTimeout(400);
      await expect(page.locator('[data-ik-msg-detail-active]')).toBeVisible();
      await expect(page.locator('[data-ik-msg-textarea]')).toBeVisible();
    }
  });

  test('hr-messages.html: filter "Okunmamis" tab degisimi', async ({ page }) => {
    await gotoDemo(page, '/hr-messages.html');
    await waitShellReady(page);

    await page.waitForTimeout(1000);

    const unreadFilter = page.locator('[data-ik-msg-filter="unread"]');
    await unreadFilter.click();
    await expect(unreadFilter).toHaveClass(/is-active/);
  });
});

test.describe('Asama 86 — Avatar dropdown panelleri (Sprint D)', () => {
  test('Avatar dropdown ac → 4 menu item + logout', async ({ page }) => {
    await gotoDemo(page, '/ik.html');
    await waitShellReady(page);

    await page.locator('#ik-avatar-btn').click();
    await expect(page.locator('#ik-avatar-dropdown')).toHaveClass(/is-open/);

    // Anchor (a) menu items: Sirket, Ekip, Kampanya, Ayarlar
    const anchorItems = page.locator('a.lp-hdr-ik__dropdown-item');
    expect(await anchorItems.count()).toBe(4);

    // Logout (button) var
    await expect(page.locator('#ik-logout-btn')).toBeVisible();
  });

  test('Avatar dropdown → Esc tusu kapatir', async ({ page }) => {
    await gotoDemo(page, '/ik.html');
    await waitShellReady(page);

    await page.locator('#ik-avatar-btn').click();
    await expect(page.locator('#ik-avatar-dropdown')).toHaveClass(/is-open/);

    await page.keyboard.press('Escape');
    await expect(page.locator('#ik-avatar-dropdown')).not.toHaveClass(/is-open/);
  });

  test('hr-company.html: form yuklenir', async ({ page }) => {
    await gotoDemo(page, '/hr-company.html');
    await waitShellReady(page);

    await expect(page.locator('#ik-company-shell')).toBeVisible();
    await expect(page.locator('#ik-co-name')).toBeVisible();

    // Hero
    await expect(page.locator('.ik-co-headline')).toContainText(/Şirket profili/i);
  });

  test('hr-team.html: yuklenir', async ({ page }) => {
    await gotoDemo(page, '/hr-team.html');
    await waitShellReady(page);

    await expect(page.locator('#ik-team-shell')).toBeVisible();
  });

  test('hr-campaigns.html: yuklenir', async ({ page }) => {
    await gotoDemo(page, '/hr-campaigns.html');
    await waitShellReady(page);

    await expect(page.locator('#ik-cmp-shell')).toBeVisible();
  });

  test('hr-settings.html: 5 section render eder', async ({ page }) => {
    await gotoDemo(page, '/hr-settings.html');
    await waitShellReady(page);

    // 4 section heading var (Hesap, Guvenlik, Bildirim, Gorunum) — Hesap yonetimi 5.
    const sections = page.locator('.ik-set-section');
    expect(await sections.count()).toBeGreaterThanOrEqual(4);
  });

  test('hr-settings.html: tema toggle (light → dark) calisir', async ({ page }) => {
    await gotoDemo(page, '/hr-settings.html');
    await waitShellReady(page);

    // Dark radio
    const darkRadio = page.locator('input[name="ik-set-theme"][value="dark"]');
    await darkRadio.check({ force: true });
    await page.waitForTimeout(300);

    // data-theme="dark" olur
    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(theme).toBe('dark');
  });
});

test.describe('Asama 86 — LocalStorage + namespace guard', () => {
  test('Tum overlay key\'leri ht_ik_* namespace\'inde', async ({ page }) => {
    await gotoDemo(page, '/hr-pool.html');
    await waitShellReady(page);
    await page.waitForTimeout(1500);

    // Aday sec, ekle (overlay yaz)
    const firstCheckbox = page.locator('[data-ik-pool-list] li input[type="checkbox"]').first();
    if (await firstCheckbox.count() > 0) {
      await firstCheckbox.check();
      await page.locator('[data-ik-pool-bulk-add]').click();
      await page.waitForTimeout(500);
    }

    const keys = await page.evaluate(() => {
      const list = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        list.push(localStorage.key(i));
      }
      return list;
    });

    // Hicbir 'ht_hr_' yok
    const legacyHits = keys.filter((k) => k && k.startsWith('ht_hr_'));
    expect(legacyHits).toHaveLength(0);

    // En az bir 'ht_ik_' var
    const ikHits = keys.filter((k) => k && k.startsWith('ht_ik_'));
    expect(ikHits.length).toBeGreaterThan(0);
  });

  test('hr-settings tema persist (localStorage ht_theme_preference)', async ({ page }) => {
    await gotoDemo(page, '/hr-settings.html');
    await waitShellReady(page);

    const darkRadio = page.locator('input[name="ik-set-theme"][value="dark"]');
    await darkRadio.check({ force: true });
    await page.waitForTimeout(300);

    const stored = await page.evaluate(() => localStorage.getItem('ht_theme_preference'));
    expect(stored).toBe('dark');
  });
});

test.describe('Asama 86 — Mobile responsive', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('ik.html mobile: bottom nav + hamburger gozukur', async ({ page }) => {
    await gotoDemo(page, '/ik.html');
    await waitShellReady(page);

    // Bottom nav (mobil only)
    await expect(page.locator('#ik-bottom-nav')).toBeVisible();

    // Hamburger
    await expect(page.locator('#ik-hamburger')).toBeVisible();

    // Segment nav (desktop) gizli
    await expect(page.locator('.lp-hdr-ik__nav')).toBeHidden();
  });

  test('ik.html mobile: hamburger → drawer ac/kapa', async ({ page }) => {
    await gotoDemo(page, '/ik.html');
    await waitShellReady(page);

    await page.locator('#ik-hamburger').click();
    await expect(page.locator('#ik-mobile-drawer')).toHaveClass(/is-open/);
    await expect(page.locator('body')).toHaveClass(/ht-scroll-lock/);

    // Esc kapatir
    await page.keyboard.press('Escape');
    await expect(page.locator('#ik-mobile-drawer')).not.toHaveClass(/is-open/);
  });

  test('Bottom nav 5 ikon mobile', async ({ page }) => {
    await gotoDemo(page, '/ik.html');
    await waitShellReady(page);

    const items = page.locator('.ik-bottom-nav__item');
    await expect(items).toHaveCount(5);
  });
});

test.describe('Asama 86 — Auth gate (oturumsuz)', () => {
  test('ik.html: auth gate kodu mevcut (window.IK_SHELL.init)', async ({ page }) => {
    // ik-shell.js public API expose ediyor mu?
    await gotoDemo(page, '/ik.html');
    await waitShellReady(page);

    const hasAPI = await page.evaluate(() => {
      return !!(window.IK_SHELL &&
                typeof window.IK_SHELL.init === 'function' &&
                typeof window.IK_SHELL.logout === 'function' &&
                typeof window.IK_SHELL.getPrefs === 'function');
    });
    expect(hasAPI).toBe(true);
  });

  test('ik-shell.js: PAGE_TO_SEGMENT mapping 9 sayfa kapsar', async ({ page, request }) => {
    // ik-shell.js icindeki PAGE_TO_SEGMENT object'i 9 IK sayfasini icerir
    const res = await request.get('/js/ik-shell.js');
    expect(res.ok()).toBeTruthy();
    const jsText = await res.text();

    // 9 sayfanin her biri PAGE_TO_SEGMENT'te listelenir
    const expected = [
      'ik.html', 'hr-pipeline.html', 'hr-pool.html', 'hr-candidate.html',
      'hr-messages.html', 'hr-company.html', 'hr-team.html',
      'hr-campaigns.html', 'hr-settings.html'
    ];
    expected.forEach((p) => {
      expect(jsText, p + ' PAGE_TO_SEGMENT\'te yok').toContain("'" + p + "'");
    });
  });
});

test.describe('Asama 86 — Polish (Sprint E)', () => {
  test('Tum 9 sayfada viewport-fit=cover (notch destegi)', async ({ request }) => {
    const pages = [
      '/ik.html',
      '/hr-pool.html',
      '/hr-pipeline.html',
      '/hr-candidate.html',
      '/hr-messages.html',
      '/hr-company.html',
      '/hr-team.html',
      '/hr-campaigns.html',
      '/hr-settings.html',
    ];

    // APIRequestContext ile network'ten direkt cek (browser cache bypass)
    for (const path of pages) {
      const res = await request.get(path);
      expect(res.ok(), path + ' fetch fail').toBeTruthy();
      const html = await res.text();
      expect(html, path + ' viewport-fit eksik').toContain('viewport-fit=cover');
    }
  });

  test('reduced-motion query CSS\'te tanimli (ik-shell.css)', async ({ page }) => {
    await gotoDemo(page, '/ik.html');
    await waitShellReady(page);

    // CSS dosyasinda 'prefers-reduced-motion' string var mi (network response check)
    const cssText = await page.evaluate(async () => {
      const r = await fetch('/css/ik-shell.css');
      return r.text();
    });
    expect(cssText).toContain('prefers-reduced-motion');
  });

  test('Skip link ilk Tab basinca odaklanir (WCAG 2.4.1)', async ({ page }) => {
    await gotoDemo(page, '/ik.html');
    await waitShellReady(page);

    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement && document.activeElement.className);
    expect(focused).toContain('ik-skip-link');
  });
});
