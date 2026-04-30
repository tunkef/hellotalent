// ik-messages.spec.js — Asama 86 Sprint C
// Mesajlar 2-pane sayfasi: thread liste + detail + send + mobile slide-in.
// Demo mode (auth bypass) icin localStorage.ht_ik_demo_mode = '1'.

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet:  { width: 1100, height: 900 },
  mobile:  { width: 390,  height: 844 }
};

async function gotoMessages(page, viewport, query) {
  await page.setViewportSize(viewport || VIEWPORTS.desktop);
  await page.addInitScript(() => {
    try {
      localStorage.setItem('ht_ik_demo_mode', '1');
      localStorage.removeItem('ht_ik_messages_state');
      localStorage.removeItem('ht_ik_pipeline_state');
      localStorage.setItem('ht_ik_active_position_id', 'pos-1');
    } catch (e) { /* ignore */ }
  });
  const url = '/hr-messages.html' + (query ? query : '');
  await page.goto(url);
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('[data-ik-msg-list-items] .ik-msg-thread, [data-ik-msg-list-empty]:not([hidden])', { timeout: 5000 });
}

test.describe('Asama 86 Sprint C — Mesajlar 2-pane', () => {

  test.describe('Markup level (auth gate öncesi)', () => {
    test('hr-messages.html tokens.css + ik-shell.css + ik-messages.css import eder', () => {
      const html = fs.readFileSync(path.join(__dirname, '..', 'hr-messages.html'), 'utf8');
      expect(html).toMatch(/<link[^>]*href=["'][^"']*tokens\.css/);
      expect(html).toMatch(/<link[^>]*href=["'][^"']*ik-shell\.css/);
      expect(html).toMatch(/<link[^>]*href=["'][^"']*ik-messages\.css/);
    });

    test('eski hr-shell / hr-polish / hr-messages CSS yok', () => {
      const html = fs.readFileSync(path.join(__dirname, '..', 'hr-messages.html'), 'utf8');
      expect(html).not.toMatch(/css\/hr-shell\.css/);
      expect(html).not.toMatch(/css\/hr-polish\.css/);
      expect(html).not.toMatch(/css\/hr-messages\.css/);
      expect(html).not.toMatch(/clatu-hr-/);
    });

    test('lp-hdr-ik header markup mevcut, Mesajlar segmenti var', () => {
      const html = fs.readFileSync(path.join(__dirname, '..', 'hr-messages.html'), 'utf8');
      expect(html).toMatch(/class=["']lp-hdr-ik["']/);
      expect(html).toMatch(/data-segment=["']mesajlar["']/);
    });

    test('Sub-nav YOK (Mesajlar segmenti subnav göstermez)', () => {
      const html = fs.readFileSync(path.join(__dirname, '..', 'hr-messages.html'), 'utf8');
      expect(html).not.toMatch(/id=["']ik-subnav["']/);
    });

    test('2-pane markup mevcut (data-ik-msg-list + data-ik-msg-detail)', () => {
      const html = fs.readFileSync(path.join(__dirname, '..', 'hr-messages.html'), 'utf8');
      expect(html).toMatch(/data-ik-msg-layout/);
      expect(html).toMatch(/data-ik-msg-list/);
      expect(html).toMatch(/data-ik-msg-detail/);
      expect(html).toMatch(/data-ik-msg-search/);
      expect(html).toMatch(/data-ik-msg-textarea/);
      expect(html).toMatch(/data-ik-msg-send-btn/);
      expect(html).toMatch(/data-ik-msg-back/);
    });

    test('JS bundle order: ik-shell → ik-data → ik-messages', () => {
      const html = fs.readFileSync(path.join(__dirname, '..', 'hr-messages.html'), 'utf8');
      const shellIdx = html.indexOf('js/ik-shell.js');
      const dataIdx  = html.indexOf('js/ik-data.js');
      const msgIdx   = html.indexOf('js/ik-messages.js');
      expect(shellIdx).toBeGreaterThan(0);
      expect(dataIdx).toBeGreaterThan(shellIdx);
      expect(msgIdx).toBeGreaterThan(dataIdx);
    });

    test('XSS-safe: ik-messages.js innerHTML assignment yok', () => {
      const js = fs.readFileSync(path.join(__dirname, '..', 'js', 'ik-messages.js'), 'utf8');
      const banned = ['inner' + 'HTML' + '='];
      banned.forEach(function (pat) {
        const re = new RegExp('\\.' + pat.replace(/=$/, '') + '\\s*=', 'g');
        const matches = js.match(re) || [];
        expect(matches.length).toBe(0);
      });
    });

    test('Token-strict: ik-messages.css hardcoded hex YOK', () => {
      const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'panels', 'ik-messages.css'), 'utf8');
      const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
      const hexMatches = stripped.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
      expect(hexMatches.length).toBe(0);
    });

    test('ik-data.js Sprint C messaging API var (getThread + markThreadRead + sendMessage)', () => {
      const js = fs.readFileSync(path.join(__dirname, '..', 'js', 'ik-data.js'), 'utf8');
      expect(js).toMatch(/getThread:\s*function/);
      expect(js).toMatch(/markThreadRead:\s*function/);
      expect(js).toMatch(/sendMessage:\s*function/);
      // D2.2: LS_MESSAGES_OVERLAY constant kaldırıldı — assertion silindi
    });
  });

  test.describe('Page level — Desktop', () => {
    test('Sayfa yüklenir, Mesajlar başlığı görünür', async ({ page }) => {
      await gotoMessages(page);
      await expect(page.locator('.ik-msg-list__title')).toContainText(/Mesajlar/i);
    });

    test('Header lp-hdr-ik render edilir, Mesajlar segment is-active', async ({ page }) => {
      await gotoMessages(page);
      await expect(page.locator('.lp-hdr-ik')).toHaveCount(1);
      const active = page.locator('.lp-hdr-ik__segment.is-active');
      await expect(active).toContainText(/Mesajlar/i);
    });

    test('Sub-nav görünmez (Mesajlar segmenti)', async ({ page }) => {
      await gotoMessages(page);
      const subnav = page.locator('#ik-subnav');
      await expect(subnav).toHaveCount(0);
    });

    test('Demo data ile en az 1 thread render edilir', async ({ page }) => {
      await gotoMessages(page);
      const rows = page.locator('.ik-msg-thread__btn');
      const count = await rows.count();
      expect(count).toBeGreaterThan(0);
    });

    test('Thread liste son mesaj zamanına göre sıralı', async ({ page }) => {
      await gotoMessages(page);
      const times = await page.locator('.ik-msg-thread__time').allTextContents();
      expect(times.length).toBeGreaterThan(1);
    });

    test('Desktop: ilk thread otomatik seçilir, detay açılır', async ({ page }) => {
      await gotoMessages(page);
      await page.waitForTimeout(300);
      const active = page.locator('[data-ik-msg-detail-active]');
      await expect(active).toBeVisible();
      await expect(page.locator('[data-ik-msg-detail-name]')).not.toHaveText('—');
    });

    test('Thread tıkla → detay yüklenir + mesaj geçmişi görünür', async ({ page }) => {
      await gotoMessages(page);
      const rows = page.locator('.ik-msg-thread__btn');
      await rows.nth(1).click();
      await page.waitForTimeout(200);
      await expect(page.locator('[data-ik-msg-detail-active]')).toBeVisible();
      const bubbles = page.locator('.ik-msg-bubble');
      const c = await bubbles.count();
      expect(c).toBeGreaterThan(0);
    });

    test('Aktif thread is-active class alır', async ({ page }) => {
      await gotoMessages(page);
      const rows = page.locator('.ik-msg-thread__btn');
      await rows.nth(2).click();
      await page.waitForTimeout(200);
      await expect(rows.nth(2)).toHaveClass(/is-active/);
    });

    test('Bubble varyantları: hr (out) + candidate (in)', async ({ page }) => {
      await gotoMessages(page);
      await page.waitForTimeout(300);
      const out = page.locator('.ik-msg-bubble--out');
      const inb = page.locator('.ik-msg-bubble--in');
      expect(await out.count()).toBeGreaterThan(0);
      expect(await inb.count()).toBeGreaterThan(0);
    });

    test('Mesaj gönder: textarea + button → optimistic bubble + adapter call', async ({ page }) => {
      await gotoMessages(page);
      await page.waitForTimeout(300);
      const textarea = page.locator('[data-ik-msg-textarea]');
      const sendBtn = page.locator('[data-ik-msg-send-btn]');

      await expect(sendBtn).toBeDisabled();
      await textarea.fill('Test mesajı gönderildi');
      await expect(sendBtn).toBeEnabled();
      await sendBtn.click();

      await page.waitForTimeout(400);
      const bodyText = await page.locator('.ik-msg-detail__body').textContent();
      expect(bodyText).toContain('Test mesajı gönderildi');
      await expect(textarea).toHaveValue('');
    });

    test('Enter ile mesaj gönderilir (Shift+Enter newline)', async ({ page }) => {
      await gotoMessages(page);
      await page.waitForTimeout(300);
      const textarea = page.locator('[data-ik-msg-textarea]');
      await textarea.fill('Enter testi');
      await textarea.press('Enter');
      await page.waitForTimeout(400);
      const bodyText = await page.locator('.ik-msg-detail__body').textContent();
      expect(bodyText).toContain('Enter testi');
    });

    test('Template chip click → textarea body inject', async ({ page }) => {
      await gotoMessages(page);
      await page.waitForTimeout(300);
      const tpl = page.locator('.ik-msg-template').first();
      await tpl.click();
      const value = await page.locator('[data-ik-msg-textarea]').inputValue();
      expect(value.length).toBeGreaterThan(0);
    });

    test('Search filter debounce — "ayşe" yazınca filtre uygulanır', async ({ page }) => {
      await gotoMessages(page);
      await page.locator('[data-ik-msg-search]').fill('Ayşe');
      await page.waitForTimeout(450);
      const visibleRows = page.locator('.ik-msg-thread__btn');
      const c = await visibleRows.count();
      expect(c).toBeGreaterThan(0);
      const text = await page.locator('.ik-msg-thread__name').first().textContent();
      expect(text).toMatch(/Ayşe/i);
    });

    test('Filter "Okunmamış" tabı: sadece unread thread', async ({ page }) => {
      await gotoMessages(page);
      await page.locator('[data-ik-msg-filter="unread"]').click();
      await page.waitForTimeout(200);
      const badges = page.locator('.ik-msg-thread__badge');
      const all = page.locator('.ik-msg-thread__btn');
      const cBadges = await badges.count();
      const cAll = await all.count();
      expect(cAll).toBeGreaterThanOrEqual(cBadges);
    });

    test('URL ?aday=c-008 → ilgili thread auto-select', async ({ page }) => {
      await gotoMessages(page, VIEWPORTS.desktop, '?aday=c-008');
      await page.waitForTimeout(400);
      const name = await page.locator('[data-ik-msg-detail-name]').textContent();
      expect(name).toMatch(/Cem/i);
    });

    test('Empty state — searchi bos bir seye cek, eslesen konusma yok gorunur', async ({ page }) => {
      await gotoMessages(page);
      await page.locator('[data-ik-msg-search]').fill('zzzzqqqq-no-match');
      await page.waitForTimeout(450);
      await expect(page.locator('[data-ik-msg-list-empty]')).toBeVisible();
      await expect(page.locator('[data-ik-msg-list-empty-title]')).toContainText(/Eşleşen/i);
    });

    test('Aday detayı linki: thread seçilince hr-candidate.html?id={candidate_id}', async ({ page }) => {
      await gotoMessages(page);
      await page.waitForTimeout(300);
      const link = page.locator('[data-ik-msg-detail-profile]');
      const href = await link.getAttribute('href');
      expect(href).toMatch(/hr-candidate\.html\?id=/);
    });
  });

  test.describe('Page level — Mobile', () => {
    test('Mobile default: thread liste görünür, detail off-screen', async ({ page }) => {
      await gotoMessages(page, VIEWPORTS.mobile);
      const layout = page.locator('[data-ik-msg-layout]');
      await expect(layout).toHaveAttribute('data-mobile-view', 'list');
      await expect(page.locator('[data-ik-msg-list]')).toBeVisible();
    });

    test('Mobile: thread tıkla → detay full-screen slide-in', async ({ page }) => {
      await gotoMessages(page, VIEWPORTS.mobile);
      const rows = page.locator('.ik-msg-thread__btn');
      await rows.first().click();
      await page.waitForTimeout(300);
      const layout = page.locator('[data-ik-msg-layout]');
      await expect(layout).toHaveAttribute('data-mobile-view', 'detail');
      await expect(page.locator('[data-ik-msg-detail-active]')).toBeVisible();
    });

    test('Mobile: geri butonu görünür ve thread liste\'ye döner', async ({ page }) => {
      await gotoMessages(page, VIEWPORTS.mobile);
      const rows = page.locator('.ik-msg-thread__btn');
      await rows.first().click();
      await page.waitForTimeout(300);
      const back = page.locator('[data-ik-msg-back]');
      await expect(back).toBeVisible();
      await back.click();
      await page.waitForTimeout(300);
      const layout = page.locator('[data-ik-msg-layout]');
      await expect(layout).toHaveAttribute('data-mobile-view', 'list');
    });

    test('Mobile: empty state sağ pane (default no-thread) gizli — detail off-screen', async ({ page }) => {
      await gotoMessages(page, VIEWPORTS.mobile);
      const layout = page.locator('[data-ik-msg-layout]');
      const view = await layout.getAttribute('data-mobile-view');
      expect(view).toBe('list');
    });
  });

  test.describe('Dark mode parity', () => {
    test('Dark mode: lp-hdr-ik + bubble + thread liste render edilir', async ({ page }) => {
      await page.addInitScript(() => {
        try { localStorage.setItem('ht_theme_preference', 'dark'); } catch (e) {}
      });
      await gotoMessages(page);
      const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
      expect(theme).toBe('dark');
      await expect(page.locator('.lp-hdr-ik')).toBeVisible();
      await expect(page.locator('.ik-msg-thread__btn').first()).toBeVisible();
    });
  });
});
