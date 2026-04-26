// ik-candidate.spec.js — Asama 86 Sprint B
// Aday Detay sayfasi: header + tab nav + 4 tab + notlar CRUD + match breakdown.

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet:  { width: 1100, height: 900 },
  mobile:  { width: 390,  height: 844 }
};

async function gotoCandidate(page, id, viewport) {
  await page.setViewportSize(viewport || VIEWPORTS.desktop);
  await page.addInitScript((cid) => {
    try {
      localStorage.setItem('ht_ik_demo_mode', '1');
      localStorage.setItem('ht_ik_active_position_id', 'pos-1');
      localStorage.removeItem('ht_ik_notes_' + cid);
    } catch (e) { /* ignore */ }
  }, id || 'c-001');
  const url = '/hr-candidate.html?id=' + (id || 'c-001');
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('.ik-candidate__name, .ik-candidate-404', { timeout: 5000 });
}

test.describe('Asama 86 Sprint B — Aday Detayı', () => {

  test.describe('Markup level', () => {
    test('hr-candidate.html ik-shell.css + ik-candidate.css import eder', () => {
      const html = fs.readFileSync(path.join(__dirname, '..', 'hr-candidate.html'), 'utf8');
      expect(html).toMatch(/<link[^>]*href=["'][^"']*tokens\.css/);
      expect(html).toMatch(/<link[^>]*href=["'][^"']*ik-shell\.css/);
      expect(html).toMatch(/<link[^>]*href=["'][^"']*ik-candidate\.css/);
    });

    test('eski hr-shell / hr-polish CSS yok', () => {
      const html = fs.readFileSync(path.join(__dirname, '..', 'hr-candidate.html'), 'utf8');
      expect(html).not.toMatch(/hr-shell\.css/);
      expect(html).not.toMatch(/hr-polish\.css/);
    });

    test('lp-hdr-ik header markup mevcut', () => {
      const html = fs.readFileSync(path.join(__dirname, '..', 'hr-candidate.html'), 'utf8');
      expect(html).toMatch(/class=["']lp-hdr-ik["']/);
    });

    test('ik-subnav 3 tab markup mevcut', () => {
      const html = fs.readFileSync(path.join(__dirname, '..', 'hr-candidate.html'), 'utf8');
      expect(html).toMatch(/data-subnav=["']pipeline["']/);
      expect(html).toMatch(/data-subnav=["']havuz["']/);
      expect(html).toMatch(/data-subnav=["']aday["']/);
    });

    test('Aday container markup mevcut', () => {
      const html = fs.readFileSync(path.join(__dirname, '..', 'hr-candidate.html'), 'utf8');
      expect(html).toMatch(/id=["']ik-candidate-shell["']/);
      expect(html).toMatch(/data-ik-candidate/);
    });

    test('JS bundle order: ik-shell -> ik-data -> ik-candidate', () => {
      const html = fs.readFileSync(path.join(__dirname, '..', 'hr-candidate.html'), 'utf8');
      const shellIdx     = html.indexOf('js/ik-shell.js');
      const dataIdx      = html.indexOf('js/ik-data.js');
      const candidateIdx = html.indexOf('js/ik-candidate.js');
      expect(shellIdx).toBeGreaterThan(0);
      expect(dataIdx).toBeGreaterThan(shellIdx);
      expect(candidateIdx).toBeGreaterThan(dataIdx);
    });

    test('XSS-safe: ik-candidate.js dom assignment kontrolu', () => {
      const js = fs.readFileSync(path.join(__dirname, '..', 'js', 'ik-candidate.js'), 'utf8');
      const re = new RegExp('\\.' + 'inner' + 'HTML' + '\\s*=', 'g');
      const matches = js.match(re) || [];
      expect(matches.length).toBe(0);
    });

    test('Token-strict: ik-candidate.css hardcoded hex YOK', () => {
      const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'panels', 'ik-candidate.css'), 'utf8');
      const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
      const hexMatches = stripped.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
      expect(hexMatches.length).toBe(0);
    });

    test('XSS-safe: ik-data.js dom assignment kontrolu', () => {
      const js = fs.readFileSync(path.join(__dirname, '..', 'js', 'ik-data.js'), 'utf8');
      const re = new RegExp('\\.' + 'inner' + 'HTML' + '\\s*=', 'g');
      const matches = js.match(re) || [];
      expect(matches.length).toBe(0);
    });
  });

  test.describe('Page level — Desktop (c-001)', () => {
    test('Sayfa yuklenir, aday adi gorunur', async ({ page }) => {
      await gotoCandidate(page, 'c-001');
      await expect(page.locator('.ik-candidate__name')).toContainText(/Ayşe Demir/i);
    });

    test('Header lp-hdr-ik render edilir, Adaylar segment is-active', async ({ page }) => {
      await gotoCandidate(page, 'c-001');
      const active = page.locator('.lp-hdr-ik__segment.is-active');
      await expect(active).toContainText(/Adaylar/i);
    });

    test('Sub-nav goruntu, "Aday detayı" tab is-active', async ({ page }) => {
      await gotoCandidate(page, 'c-001');
      await expect(page.locator('#ik-subnav')).toHaveClass(/is-visible/);
      const tab = page.locator('.ik-subnav__item[data-subnav="aday"]');
      await expect(tab).toHaveClass(/is-active/);
    });

    test('Avatar ve pozisyon meta render edilir', async ({ page }) => {
      await gotoCandidate(page, 'c-001');
      await expect(page.locator('.ik-candidate__avatar')).toBeVisible();
      await expect(page.locator('.ik-candidate__poz')).toContainText(/Satış Danışmanı/i);
    });

    test('Header chip\'leri render edilir (Şehir + Segment + Müsaitlik + Çalışma)', async ({ page }) => {
      await gotoCandidate(page, 'c-001');
      const chips = page.locator('.ik-candidate__chip');
      await expect(chips).toHaveCount(4);
    });

    test('Match block render — pos-1 icin numerik %', async ({ page }) => {
      await gotoCandidate(page, 'c-001');
      const block = page.locator('[data-ik-match-block]');
      await expect(block).toBeVisible();
      const txt = await block.textContent();
      expect(txt).toMatch(/\d+%/);
    });

    test('4 tab nav — Profil, Notlar, Mesajlar, Match Breakdown', async ({ page }) => {
      await gotoCandidate(page, 'c-001');
      const tabs = page.locator('.ik-candidate__tab');
      await expect(tabs).toHaveCount(4);
      await expect(tabs.nth(0)).toContainText(/Profil/i);
      await expect(tabs.nth(1)).toContainText(/Notlar/i);
      await expect(tabs.nth(2)).toContainText(/Mesajlar/i);
      await expect(tabs.nth(3)).toContainText(/Match Breakdown/i);
    });

    test('Default Profil tab is-active', async ({ page }) => {
      await gotoCandidate(page, 'c-001');
      const active = page.locator('.ik-candidate__tab.is-active');
      await expect(active).toContainText(/Profil/i);
    });

    test('Profil tab — section grid render', async ({ page }) => {
      await gotoCandidate(page, 'c-001');
      const sections = page.locator('.ik-candidate-section');
      const count = await sections.count();
      expect(count).toBeGreaterThanOrEqual(3);
    });

    test('Tab switch — Notlar tıklanınca aktif', async ({ page }) => {
      await gotoCandidate(page, 'c-001');
      await page.click('[data-tab="notes"]');
      await page.waitForTimeout(150);
      await expect(page.locator('[data-tab="notes"]')).toHaveClass(/is-active/);
      await expect(page.locator('[data-ik-notes-input]')).toBeVisible();
    });

    test('Notlar — bos durumda empty mesaj gosterir', async ({ page }) => {
      await gotoCandidate(page, 'c-001');
      await page.click('[data-tab="notes"]');
      await page.waitForTimeout(150);
      await expect(page.locator('.ik-notes-empty')).toBeVisible();
    });

    test('Notlar — not ekle butonu bos input\'ta disabled', async ({ page }) => {
      await gotoCandidate(page, 'c-001');
      await page.click('[data-tab="notes"]');
      await page.waitForTimeout(150);
      const btn = page.locator('[data-ik-notes-add]');
      await expect(btn).toBeDisabled();
    });

    test('Notlar — input + buton ile yeni not ekler', async ({ page }) => {
      await gotoCandidate(page, 'c-001');
      await page.click('[data-tab="notes"]');
      await page.waitForTimeout(150);
      const input = page.locator('[data-ik-notes-input]');
      await input.fill('Mülakat sonrası ilk izlenim güçlü.');
      await page.waitForTimeout(150);
      const btn = page.locator('[data-ik-notes-add]');
      await expect(btn).not.toBeDisabled();
      await btn.click();
      await page.waitForTimeout(300);
      const list = page.locator('.ik-note');
      await expect(list).toHaveCount(1);
      await expect(list.first()).toContainText(/Mülakat sonrası/i);
    });

    test('Notlar — silme butonu notu kaldırır', async ({ page }) => {
      await gotoCandidate(page, 'c-001');
      await page.click('[data-tab="notes"]');
      await page.waitForTimeout(150);
      await page.locator('[data-ik-notes-input]').fill('Geçici test notu');
      await page.click('[data-ik-notes-add]');
      await page.waitForTimeout(300);
      const note = page.locator('.ik-note').first();
      await note.locator('[data-ik-note-delete]').click();
      await page.waitForTimeout(300);
      await expect(page.locator('.ik-notes-empty')).toBeVisible();
    });

    test('Mesajlar tab — placeholder + CTA gorunur', async ({ page }) => {
      await gotoCandidate(page, 'c-001');
      await page.click('[data-tab="messages"]');
      await page.waitForTimeout(150);
      await expect(page.locator('.ik-messages-placeholder')).toBeVisible();
      await expect(page.locator('.ik-messages-placeholder__cta')).toBeVisible();
    });

    test('Mesajlar CTA — hr-messages.html\'e dogru aday ID ile baglar', async ({ page }) => {
      await gotoCandidate(page, 'c-001');
      await page.click('[data-tab="messages"]');
      await page.waitForTimeout(150);
      const href = await page.locator('.ik-messages-placeholder__cta').getAttribute('href');
      expect(href).toContain('hr-messages.html');
      expect(href).toContain('aday=c-001');
    });

    test('Match Breakdown tab — 5 satir + summary', async ({ page }) => {
      await gotoCandidate(page, 'c-001');
      await page.click('[data-tab="breakdown"]');
      await page.waitForTimeout(150);
      const rows = page.locator('.ik-match-row');
      await expect(rows).toHaveCount(5);
      await expect(page.locator('.ik-match-summary')).toBeVisible();
    });

    test('Match Breakdown summary numerik % gosterir', async ({ page }) => {
      await gotoCandidate(page, 'c-001');
      await page.click('[data-tab="breakdown"]');
      await page.waitForTimeout(150);
      const txt = await page.locator('.ik-match-summary__value').textContent();
      expect(txt).toMatch(/\d+%/);
    });

    test('CTA bar — 2 buton (Mesaj yaz + Pipeline\'a ekle)', async ({ page }) => {
      await gotoCandidate(page, 'c-001');
      await expect(page.locator('[data-cta-msg]')).toBeVisible();
      await expect(page.locator('[data-cta-add]')).toBeVisible();
    });

    test('CTA primary — Pipeline\'a ekle toast verir', async ({ page }) => {
      await gotoCandidate(page, 'c-001');
      await page.click('[data-cta-add]');
      await page.waitForTimeout(300);
      await expect(page.locator('[data-ik-candidate-toast]')).toHaveClass(/is-visible/);
    });

    test('Breadcrumb — havuza geri donme linki', async ({ page }) => {
      await gotoCandidate(page, 'c-001');
      const crumb = page.locator('.ik-candidate__breadcrumb');
      await expect(crumb).toBeVisible();
      const href = await crumb.getAttribute('href');
      expect(href).toBe('hr-pool.html');
    });

    test('Klavye ArrowRight — Profil tab\'tan Notlar\'a gecis', async ({ page }) => {
      await gotoCandidate(page, 'c-001');
      await page.locator('[data-tab="profile"]').focus();
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(150);
      await expect(page.locator('[data-tab="notes"]')).toHaveClass(/is-active/);
    });
  });

  test.describe('404 — Bulunamayan aday', () => {
    test('Bilinmeyen ID ile 404 render eder', async ({ page }) => {
      await gotoCandidate(page, 'c-9999');
      await expect(page.locator('.ik-candidate-404')).toBeVisible();
      await expect(page.locator('.ik-candidate-404__title')).toContainText(/bulunamadı/i);
    });

    test('404 — Havuza dön CTA href dogru', async ({ page }) => {
      await gotoCandidate(page, 'c-9999');
      const href = await page.locator('.ik-candidate-404__cta').getAttribute('href');
      expect(href).toBe('hr-pool.html');
    });
  });

  test.describe('Mobile — 390x844', () => {
    test('Sayfa mobile\'da render olur', async ({ page }) => {
      await gotoCandidate(page, 'c-001', VIEWPORTS.mobile);
      await expect(page.locator('.ik-candidate__name')).toBeVisible();
    });

    test('Tab nav horizontal scroll edilebilir', async ({ page }) => {
      await gotoCandidate(page, 'c-001', VIEWPORTS.mobile);
      const overflowX = await page.locator('.ik-candidate__tabs').evaluate(el => getComputedStyle(el).overflowX);
      expect(['auto', 'scroll']).toContain(overflowX);
    });

    test('CTA bar — sticky bottom', async ({ page }) => {
      await gotoCandidate(page, 'c-001', VIEWPORTS.mobile);
      const cta = page.locator('.ik-candidate__cta');
      const pos = await cta.evaluate(el => getComputedStyle(el).position);
      expect(pos).toBe('sticky');
    });
  });
});
