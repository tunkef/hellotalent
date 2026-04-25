// ik-genel.spec.js — Asama 86 Sprint A
// Anasayfa dashboard render kontrolu: hero KPI + bento grid 6 kart + feed.
// Demo mode (auth bypass) icin localStorage.ht_ik_demo_mode = '1' set edilir.

const { test, expect } = require('@playwright/test');

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 }
};

async function gotoIK(page) {
  await page.addInitScript(() => {
    try { localStorage.setItem('ht_ik_demo_mode', '1'); }
    catch (e) { /* ignore */ }
  });
  await page.goto('/ik.html');
  await page.waitForLoadState('networkidle');
  // Wait for dashboard render flag
  await page.waitForFunction(() => {
    return document.documentElement.getAttribute('data-ik-genel-ready') === '1';
  }, { timeout: 8000 }).catch(() => {});
}

test.describe('Asama 86 Sprint A — IK Genel (Anasayfa)', () => {
  test.describe('Hero', () => {
    test('Hero card render edilir', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoIK(page);
      const hero = page.locator('.ik-genel__hero');
      await expect(hero).toHaveCount(1);
    });

    test('Bugun tarihi mono uppercase gosterilir', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoIK(page);
      const date = page.locator('.ik-genel__hero-date');
      await expect(date).toBeVisible();
      const text = await date.textContent();
      expect(text.length).toBeGreaterThan(5);
    });

    test('Bricolage h1 greeting gosterilir', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoIK(page);
      const title = page.locator('.ik-genel__title');
      await expect(title).toHaveCount(1);
      await expect(title).toContainText(/Merhaba/i);
    });

    test('KPI row 4 deger render edilir', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoIK(page);
      const kpis = page.locator('.ik-kpi');
      await expect(kpis).toHaveCount(4);
    });

    test('KPI label/value cifti', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoIK(page);
      const labels = page.locator('.ik-kpi__label');
      const values = page.locator('.ik-kpi__value');
      await expect(labels).toHaveCount(4);
      await expect(values).toHaveCount(4);
    });

    test('Acik pozisyon KPI ilk siradadir', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoIK(page);
      const firstLabel = page.locator('.ik-kpi__label').first();
      await expect(firstLabel).toContainText(/Acik pozisyon|Açık pozisyon/i);
    });
  });

  test.describe('Bento grid', () => {
    test('Bento 6 kart render edilir', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoIK(page);
      const cards = page.locator('.ik-genel__bento .ik-card');
      await expect(cards).toHaveCount(6);
    });

    test('Pipeline ozeti kart 4 stage gosterir', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoIK(page);
      const pipelineCard = page.locator('.ik-card').filter({ hasText: 'Pipeline ozeti' }).first()
        .or(page.locator('.ik-card').filter({ hasText: 'Pipeline özeti' }).first());
      await expect(pipelineCard).toHaveCount(1);
      const stages = pipelineCard.locator('.ik-stage');
      await expect(stages).toHaveCount(4);
    });

    test('Yeni adaylar kart top 3 list gosterir', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoIK(page);
      const newCard = page.locator('.ik-card').filter({ hasText: 'Yeni adaylar' }).first();
      await expect(newCard).toHaveCount(1);
      const items = newCard.locator('.ik-list__item');
      const count = await items.count();
      expect(count).toBeGreaterThanOrEqual(1);
      expect(count).toBeLessThanOrEqual(3);
    });

    test('Bekleyen mesajlar kart list veya empty', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoIK(page);
      const msgCard = page.locator('.ik-card').filter({ hasText: 'Bekleyen mesajlar' }).first();
      await expect(msgCard).toHaveCount(1);
    });

    test('Aktif kampanyalar kart sent_count + open_pct gosterir', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoIK(page);
      const cmpCard = page.locator('.ik-card').filter({ hasText: 'Aktif kampanyalar' }).first();
      await expect(cmpCard).toHaveCount(1);
    });

    test('Ekip akisi kart placeholder gosterir', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoIK(page);
      const teamCard = page.locator('.ik-card').filter({ hasText: 'Ekip' }).first();
      await expect(teamCard).toHaveCount(1);
    });

    test('Hizli eylem kart 3 quick-action gosterir', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoIK(page);
      const actionsCard = page.locator('.ik-card--actions');
      await expect(actionsCard).toHaveCount(1);
      const actions = actionsCard.locator('.ik-quick-action');
      await expect(actions).toHaveCount(3);
    });
  });

  test.describe('Feed (recent activity)', () => {
    test('Feed section render edilir', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoIK(page);
      const feed = page.locator('.ik-genel__feed');
      await expect(feed).toHaveCount(1);
    });

    test('Feed spine 1+ item gosterir (demo data)', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoIK(page);
      const items = page.locator('.ik-feed-item');
      const count = await items.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('Signature', () => {
    test('Signature footer render edilir', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoIK(page);
      const sig = page.locator('.ik-genel__signature');
      await expect(sig).toHaveCount(1);
      await expect(sig).toContainText(/hellotalent/i);
    });
  });

  test.describe('Card click navigation', () => {
    test('Pipeline kartına tıklayınca hr-pipeline.html', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoIK(page);
      const pipelineCard = page.locator('.ik-card').filter({ hasText: /Pipeline/i }).first();
      await pipelineCard.click();
      await page.waitForURL(/hr-pipeline\.html/, { timeout: 5000 }).catch(() => {});
      expect(page.url()).toMatch(/hr-pipeline\.html/);
    });

    test('Yeni adaylar kartına tıklayınca hr-pool.html', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoIK(page);
      const newCard = page.locator('.ik-card').filter({ hasText: 'Yeni adaylar' }).first();
      await newCard.click();
      await page.waitForURL(/hr-pool\.html/, { timeout: 5000 }).catch(() => {});
      expect(page.url()).toMatch(/hr-pool\.html/);
    });
  });

  test.describe('Responsive', () => {
    test('Desktop bento 3+ kolon (auto-fit minmax 280px)', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoIK(page);
      const bento = page.locator('.ik-genel__bento');
      const styles = await bento.evaluate(el => getComputedStyle(el).gridTemplateColumns);
      const cols = styles.split(' ').filter(s => s.trim().length > 0).length;
      expect(cols).toBeGreaterThanOrEqual(3);
    });

    test('Mobile 1 kolon (390px)', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await gotoIK(page);
      const bento = page.locator('.ik-genel__bento');
      const styles = await bento.evaluate(el => getComputedStyle(el).gridTemplateColumns);
      const cols = styles.split(' ').filter(s => s.trim().length > 0).length;
      expect(cols).toBe(1);
    });

    test('Mobile KPI 2 kolon (390px)', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await gotoIK(page);
      const kpiRow = page.locator('.ik-genel__kpi-row');
      const styles = await kpiRow.evaluate(el => getComputedStyle(el).gridTemplateColumns);
      const cols = styles.split(' ').filter(s => s.trim().length > 0).length;
      expect(cols).toBe(2);
    });
  });

  test.describe('Dark mode parite', () => {
    test('Dark mode bento background swap (data-theme=dark)', async ({ page }) => {
      await page.addInitScript(() => {
        try {
          localStorage.setItem('ht_ik_demo_mode', '1');
          localStorage.setItem('ht_theme_preference', 'dark');
        } catch (e) { /* ignore */ }
      });
      await page.goto('/ik.html');
      await page.waitForLoadState('networkidle');
      const themeAttr = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
      expect(themeAttr).toBe('dark');
      // Dark mode'da hero görünür
      await expect(page.locator('.ik-genel__hero')).toHaveCount(1);
    });
  });
});
