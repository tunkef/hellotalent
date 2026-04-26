// ik-pool.spec.js — Asama 86 Sprint B
// Aday Havuzu sayfasi: filter + sort + bulk + pagination + row menu.
// Demo mode (auth bypass) icin localStorage.ht_ik_demo_mode = '1'.

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet:  { width: 1100, height: 900 },
  mobile:  { width: 390,  height: 844 }
};

async function gotoPool(page, viewport) {
  await page.setViewportSize(viewport || VIEWPORTS.desktop);
  await page.addInitScript(() => {
    try {
      localStorage.setItem('ht_ik_demo_mode', '1');
      localStorage.removeItem('ht_ik_pipeline_state');
      localStorage.setItem('ht_ik_active_position_id', 'pos-1');
    } catch (e) { /* ignore */ }
  });
  await page.goto('/hr-pool.html');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('.ik-pool-row, [data-ik-pool-empty]:not([hidden])', { timeout: 5000 });
}

test.describe('Asama 86 Sprint B — Aday Havuzu', () => {

  test.describe('Markup level (auth gate öncesi)', () => {
    test('hr-pool.html ik-shell.css + ik-pool.css import eder', () => {
      const html = fs.readFileSync(path.join(__dirname, '..', 'hr-pool.html'), 'utf8');
      expect(html).toMatch(/<link[^>]*href=["'][^"']*tokens\.css/);
      expect(html).toMatch(/<link[^>]*href=["'][^"']*ik-shell\.css/);
      expect(html).toMatch(/<link[^>]*href=["'][^"']*ik-pool\.css/);
    });

    test('eski hr-shell / hr-polish CSS yok', () => {
      const html = fs.readFileSync(path.join(__dirname, '..', 'hr-pool.html'), 'utf8');
      expect(html).not.toMatch(/hr-shell\.css/);
      expect(html).not.toMatch(/hr-polish\.css/);
      expect(html).not.toMatch(/clatu-hr-/);
    });

    test('lp-hdr-ik header markup mevcut', () => {
      const html = fs.readFileSync(path.join(__dirname, '..', 'hr-pool.html'), 'utf8');
      expect(html).toMatch(/class=["']lp-hdr-ik["']/);
      expect(html).toMatch(/data-segment=["']adaylar["']/);
    });

    test('ik-subnav 3 tab markup mevcut', () => {
      const html = fs.readFileSync(path.join(__dirname, '..', 'hr-pool.html'), 'utf8');
      expect(html).toMatch(/data-subnav=["']pipeline["']/);
      expect(html).toMatch(/data-subnav=["']havuz["']/);
      expect(html).toMatch(/data-subnav=["']aday["']/);
    });

    test('ik-pool-shell ve filter toolbar markup mevcut', () => {
      const html = fs.readFileSync(path.join(__dirname, '..', 'hr-pool.html'), 'utf8');
      expect(html).toMatch(/id=["']ik-pool-shell["']/);
      expect(html).toMatch(/data-ik-pool-search/);
      expect(html).toMatch(/data-ik-pool-filters/);
      expect(html).toMatch(/data-ik-pool-sort-btn/);
      expect(html).toMatch(/data-ik-pool-bulk/);
      expect(html).toMatch(/data-ik-pool-list/);
    });

    test('JS bundle order: ik-shell -> ik-data -> ik-pool', () => {
      const html = fs.readFileSync(path.join(__dirname, '..', 'hr-pool.html'), 'utf8');
      const shellIdx = html.indexOf('js/ik-shell.js');
      const dataIdx  = html.indexOf('js/ik-data.js');
      const poolIdx  = html.indexOf('js/ik-pool.js');
      expect(shellIdx).toBeGreaterThan(0);
      expect(dataIdx).toBeGreaterThan(shellIdx);
      expect(poolIdx).toBeGreaterThan(dataIdx);
    });

    test('XSS-safe: ik-pool.js dom assignment kontrolu', () => {
      const js = fs.readFileSync(path.join(__dirname, '..', 'js', 'ik-pool.js'), 'utf8');
      const banned = ['inner' + 'HTML' + '='];
      banned.forEach(function (pat) {
        const re = new RegExp('\\.' + pat.replace(/=$/, '') + '\\s*=', 'g');
        const matches = js.match(re) || [];
        expect(matches.length).toBe(0);
      });
    });

    test('Token-strict: ik-pool.css hardcoded hex YOK', () => {
      const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'panels', 'ik-pool.css'), 'utf8');
      const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
      const hexMatches = stripped.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
      expect(hexMatches.length).toBe(0);
    });
  });

  test.describe('Page level — Desktop', () => {
    test('Sayfa yüklenir, başlık ve subline görünür', async ({ page }) => {
      await gotoPool(page);
      await expect(page.locator('.ik-pool__title')).toContainText(/Doğru adayı bul/i);
      await expect(page.locator('.ik-pool__subline')).toBeVisible();
    });

    test('Header lp-hdr-ik render edilir, Adaylar segment is-active', async ({ page }) => {
      await gotoPool(page);
      await expect(page.locator('.lp-hdr-ik')).toHaveCount(1);
      const active = page.locator('.lp-hdr-ik__segment.is-active');
      await expect(active).toContainText(/Adaylar/i);
    });

    test('Sub-nav görünür ve "Havuz" tab is-active', async ({ page }) => {
      await gotoPool(page);
      await expect(page.locator('#ik-subnav')).toHaveClass(/is-visible/);
      const havuzTab = page.locator('.ik-subnav__item[data-subnav="havuz"]');
      await expect(havuzTab).toHaveClass(/is-active/);
    });

    test('Demo data ile en az 1 satır render edilir', async ({ page }) => {
      await gotoPool(page);
      const rows = page.locator('.ik-pool-row');
      const count = await rows.count();
      expect(count).toBeGreaterThan(0);
    });

    test('Pagination — sayfa basinda 20\'den fazla aday varsa "Daha goster" gorunur', async ({ page }) => {
      await gotoPool(page);
      const total = await page.locator('[data-ik-pool-total]').textContent();
      const totalNum = parseInt(total, 10);
      if (totalNum > 20) {
        await expect(page.locator('[data-ik-pool-paginate]')).toBeVisible();
      }
    });

    test('"Daha goster" tıklandığında daha çok satır yüklenir', async ({ page }) => {
      await gotoPool(page);
      const initial = await page.locator('.ik-pool-row').count();
      const btn = page.locator('[data-ik-pool-more]');
      const visible = await btn.isVisible().catch(() => false);
      if (visible) {
        await btn.click();
        await page.waitForTimeout(200);
        const after = await page.locator('.ik-pool-row').count();
        expect(after).toBeGreaterThan(initial);
      }
    });

    test('Search input — debounced query "Ayşe" bir aday bulur', async ({ page }) => {
      await gotoPool(page);
      await page.fill('[data-ik-pool-search]', 'Ayşe');
      await page.waitForTimeout(450);
      const rows = page.locator('.ik-pool-row');
      const count = await rows.count();
      expect(count).toBeGreaterThan(0);
      await expect(rows.first()).toContainText(/Ayşe/i);
    });

    test('Search clear butonu aramayı sıfırlar', async ({ page }) => {
      await gotoPool(page);
      await page.fill('[data-ik-pool-search]', 'Mehmet');
      await page.waitForTimeout(400);
      const clearBtn = page.locator('[data-ik-pool-search-clear]');
      await expect(clearBtn).toBeVisible();
      await clearBtn.click();
      await page.waitForTimeout(200);
      await expect(page.locator('[data-ik-pool-search]')).toHaveValue('');
    });

    test('Filter chip — Şehir İstanbul seçimi listeyi daraltir', async ({ page }) => {
      await gotoPool(page);
      const chip = page.locator('[data-ik-pool-chip="city"]');
      await chip.click();
      const menu = page.locator('[data-chip-menu="city"]');
      await expect(menu).toHaveClass(/is-open/);
      const istItem = menu.locator('[data-chip-value="İstanbul"]');
      await istItem.click();
      await page.waitForTimeout(200);
      await expect(page.locator('[data-ik-pool-active]')).toContainText(/İstanbul/i);
    });

    test('Sort dropdown — açılır ve 4 secenek listede mevcut', async ({ page }) => {
      await gotoPool(page);
      await page.click('[data-ik-pool-sort-btn]');
      const menu = page.locator('[data-ik-pool-sort-menu]');
      await expect(menu).toHaveClass(/is-open/);
      const items = menu.locator('.ik-pool-sort__item');
      const count = await items.count();
      expect(count).toBe(4);
    });

    test('Sort by name — listede ilk satir A/B/C ile baslar', async ({ page }) => {
      await gotoPool(page);
      await page.click('[data-ik-pool-sort-btn]');
      await page.click('[data-sort-value="name"]');
      await page.waitForTimeout(200);
      const firstRow = page.locator('.ik-pool-row').first();
      const text = await firstRow.locator('.ik-pool-row__name').textContent();
      expect(text.trim().charAt(0).toLowerCase()).toMatch(/^[abç]/);
    });

    test('Bulk select — checkbox tıklandığında bulk bar görünür', async ({ page }) => {
      await gotoPool(page);
      const cb = page.locator('[data-row-check]').first();
      await cb.click();
      await expect(page.locator('[data-ik-pool-bulk]')).toHaveAttribute('data-show', 'true');
      await expect(page.locator('[data-ik-pool-bulk-count]')).toContainText('1');
    });

    test('Select-all checkbox sayfa\'daki tüm satırlari seçer', async ({ page }) => {
      await gotoPool(page);
      await page.click('[data-ik-pool-select-all]');
      await page.waitForTimeout(150);
      const selected = await page.locator('.ik-pool-row.is-selected').count();
      const visible  = await page.locator('.ik-pool-row').count();
      expect(selected).toBe(visible);
    });

    test('Bulk add — pipeline\'a ekleme toast verir', async ({ page }) => {
      await gotoPool(page);
      await page.locator('[data-row-check]').first().click();
      await page.locator('[data-row-check]').nth(1).click();
      await page.click('[data-ik-pool-bulk-add]');
      await page.waitForTimeout(400);
      await expect(page.locator('[data-ik-pool-toast]')).toHaveClass(/is-visible/);
    });

    test('Pipeline\'a ekle idempotent — aynı aday tekrar eklenmez', async ({ page }) => {
      await gotoPool(page);
      const firstRow = page.locator('.ik-pool-row').first();
      const firstCid = await firstRow.getAttribute('data-row-id');
      /* IK_DATA dogrudan: ilk ekleme + ikinci tekrar deneme */
      const result = await page.evaluate(async (cid) => {
        const r1 = await window.IK_DATA.addToPipeline(cid, 'pos-1');
        const r2 = await window.IK_DATA.addToPipeline(cid, 'pos-1');
        return { r1: r1, r2: r2 };
      }, firstCid);
      expect(result.r1.ok).toBe(true);
      expect(result.r2.ok).toBe(true);
      expect(result.r2.duplicate).toBe(true);
    });

    test('Row menu — 3-dot butonu menu acar', async ({ page }) => {
      await gotoPool(page);
      const menuBtn = page.locator('[data-row-menu-btn]').first();
      await menuBtn.click();
      const cid = await menuBtn.getAttribute('data-row-menu-btn');
      await expect(page.locator('[data-row-menu="' + cid + '"]')).toHaveClass(/is-open/);
    });

    test('Row click — detay sayfasina yonlendirir', async ({ page }) => {
      await gotoPool(page);
      const firstRow = page.locator('.ik-pool-row').first();
      const cid = await firstRow.getAttribute('data-row-id');
      const main = firstRow.locator('.ik-pool-row__main');
      await main.click();
      await page.waitForURL(new RegExp('hr-candidate\\.html\\?id=' + cid));
      expect(page.url()).toContain('hr-candidate.html');
      expect(page.url()).toContain('id=' + cid);
    });

    test('Empty state — gercek dısı arama "zzzzzz" empty render eder', async ({ page }) => {
      await gotoPool(page);
      await page.fill('[data-ik-pool-search]', 'zzzzzz');
      await page.waitForTimeout(400);
      await expect(page.locator('[data-ik-pool-empty]')).toBeVisible();
      await expect(page.locator('[data-ik-pool-empty]')).toContainText(/Filtrelere uyan aday yok/i);
    });

    test('Filtreleri sıfırla butonu state\'i temizler', async ({ page }) => {
      await gotoPool(page);
      await page.fill('[data-ik-pool-search]', 'zzzzzz');
      await page.waitForTimeout(400);
      await page.click('[data-ik-pool-reset]');
      await page.waitForTimeout(200);
      await expect(page.locator('[data-ik-pool-search]')).toHaveValue('');
    });

    test('Match pill render edilir (numerik %)', async ({ page }) => {
      await gotoPool(page);
      const pill = page.locator('.ik-pool-row__match').first();
      await expect(pill).toBeVisible();
      const txt = await pill.textContent();
      expect(txt).toMatch(/\d+%/);
    });

    test('Skip link DOM\'da var ve href ik-pool-shell\'e işaret eder', async ({ page }) => {
      await gotoPool(page);
      const skip = page.locator('.ik-skip-link');
      await expect(skip).toHaveCount(1);
      await expect(skip).toHaveAttribute('href', '#ik-pool-shell');
    });
  });

  test.describe('Mobile — 390x844', () => {
    test('Header hamburger görünür, segment nav gizli', async ({ page }) => {
      await gotoPool(page, VIEWPORTS.mobile);
      await expect(page.locator('#ik-hamburger')).toBeVisible();
      await expect(page.locator('.lp-hdr-ik__nav')).not.toBeVisible();
    });

    test('Bottom nav 5 item görünür', async ({ page }) => {
      await gotoPool(page, VIEWPORTS.mobile);
      await expect(page.locator('#ik-bottom-nav')).toBeVisible();
      const items = page.locator('.ik-bottom-nav__item');
      await expect(items).toHaveCount(5);
    });

    test('Filter chips horizontal scroll bar (overflow-x: auto)', async ({ page }) => {
      await gotoPool(page, VIEWPORTS.mobile);
      const filters = page.locator('[data-ik-pool-filters]');
      const overflowX = await filters.evaluate(el => getComputedStyle(el).overflowX);
      expect(['auto', 'scroll']).toContain(overflowX);
    });

    test('Bulk bar — secim varsa fixed bottom konumlanir', async ({ page }) => {
      await gotoPool(page, VIEWPORTS.mobile);
      await page.locator('[data-row-check]').first().click();
      const bulk = page.locator('[data-ik-pool-bulk]');
      await expect(bulk).toHaveAttribute('data-show', 'true');
      const pos = await bulk.evaluate(el => getComputedStyle(el).position);
      expect(pos).toBe('fixed');
    });
  });

  test.describe('Tablet — 1100x900', () => {
    test('Sayfa başarıyla render olur', async ({ page }) => {
      await gotoPool(page, VIEWPORTS.tablet);
      await expect(page.locator('.ik-pool-row').first()).toBeVisible();
    });
  });
});
