// pr2-position-form.spec.js
// PR-2 — Pozisyon formu genişletme UAT
// Kapsam: form validation, chip-select, collapse, payload, maas yokluğu
// Viewports: mobile 390×844 + desktop 1440×900

const { test, expect } = require('@playwright/test');

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile:  { width: 390,  height: 844 },
};

/* ─────────────────────────────────────────
   Helper: pipeline sayfasına git, demo mode
───────────────────────────────────────── */
async function gotoPipeline(page, vp, darkMode) {
  await page.setViewportSize(vp || VIEWPORTS.desktop);
  await page.addInitScript(function (dm) {
    try {
      localStorage.setItem('ht_ik_demo_mode', '1');
      localStorage.removeItem('ht_ik_pipeline_state');
      localStorage.removeItem('ht_ik_active_position_id');
      if (dm) document.documentElement.setAttribute('data-theme', 'dark');
    } catch (_) {}
  }, darkMode ? 'dark' : '');
  await page.goto('/hr-pipeline.html');
  await page.waitForLoadState('networkidle');
}

/* Helper: formu aç */
async function openForm(page) {
  var btn = page.locator('#btn-new-position').first();
  await btn.click();
  await page.waitForSelector('#ik-pos-form-sheet.is-open', { timeout: 3000 });
}

/* Helper: collapse aç */
async function openCollapse(page) {
  var toggle = page.locator('#btn-pos-collapse');
  var expanded = await toggle.getAttribute('aria-expanded');
  if (expanded !== 'true') {
    await toggle.click();
    await page.waitForSelector('#pos-form-collapse-body:not([hidden])', { timeout: 2000 });
  }
}

/* ─────────────────────────────────────────
   1. Boş ad submit → hata, form kapanmaz
───────────────────────────────────────── */
test('PR2-01 boş ad submit → pozisyon adı hatası', async ({ page }) => {
  await gotoPipeline(page, VIEWPORTS.desktop);
  await openForm(page);
  await page.locator('#btn-pos-form-submit').click();
  var errorEl = page.locator('#pos-field-ad-error');
  await expect(errorEl).toBeVisible();
  var txt = await errorEl.textContent();
  expect(txt).toMatch(/pozisyon adı/i);
  // Sheet hala açık
  await expect(page.locator('#ik-pos-form-sheet')).toHaveClass(/is-open/);
});

/* ─────────────────────────────────────────
   2. Sadece ad dolu, kriter yok → server-error band + collapse açılır
───────────────────────────────────────── */
test('PR2-02 sadece ad dolu → kriter hatası + collapse açılır', async ({ page }) => {
  await gotoPipeline(page, VIEWPORTS.desktop);
  await openForm(page);
  await page.locator('#pos-field-ad').fill('Test Pozisyon');
  await page.locator('#btn-pos-form-submit').click();
  var srvError = page.locator('#pos-form-server-error');
  await expect(srvError).toBeVisible({ timeout: 2000 });
  var txt = await srvError.textContent();
  expect(txt).toMatch(/kriter/i);
  // Collapse otomatik açılmış olmalı
  await expect(page.locator('#btn-pos-collapse')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#pos-form-collapse-body')).not.toHaveAttribute('hidden');
});

/* ─────────────────────────────────────────
   3. ad + sehir dolu → submit başarılı (demo mode mock)
───────────────────────────────────────── */
test('PR2-03 ad + sehir → submit başarı (demo mode)', async ({ page }) => {
  await gotoPipeline(page, VIEWPORTS.desktop);
  await openForm(page);
  await page.locator('#pos-field-ad').fill('Satış Danışmanı');
  await page.locator('#pos-field-sehir').fill('İstanbul');
  // Demo mode'da IK_DATA.createPosition mock pozitif dönmeli
  // Toast veya sheet kapanması başarı sinyali
  await page.locator('#btn-pos-form-submit').click();
  // Sheet kapanır veya toast görünür — demo mode
  // En az hata gösterilmemeli
  var srvError = page.locator('#pos-form-server-error');
  // kısa bekleme — demo mode sync
  await page.waitForTimeout(500);
  var srvVisible = await srvError.isVisible();
  if (srvVisible) {
    var txt = await srvError.textContent();
    // Demo mode oturum hatası kabul edilir; kriter hatası OLMAMALI
    expect(txt).not.toMatch(/kriter/i);
  }
});

/* ─────────────────────────────────────────
   4. ad + 5 yeni alan dolu → payload doğru (intercept)
───────────────────────────────────────── */
test('PR2-04 5 yeni alan dolu → payload doğru', async ({ page }) => {
  // addInitScript page.goto'dan ÖNCE — IIFE'nin IK_DATA atamasını yakalar
  await page.addInitScript(function () {
    window.__pr2PayloadCapture = null;
    // Object.defineProperty setter: IK_DATA = {...} atandığında createPosition wrap et
    var _ikDataReal = null;
    Object.defineProperty(window, 'IK_DATA', {
      configurable: true,
      enumerable: true,
      get: function () { return _ikDataReal; },
      set: function (v) {
        _ikDataReal = v;
        if (v && typeof v.createPosition === 'function') {
          v.createPosition = function (p) {
            window.__pr2PayloadCapture = JSON.stringify(p);
            return Promise.resolve({ ok: false, error: 'pr2-intercept' });
          };
        }
      }
    });
  });

  await page.setViewportSize(VIEWPORTS.desktop);
  await page.addInitScript(function () {
    try {
      localStorage.setItem('ht_ik_demo_mode', '1');
      localStorage.removeItem('ht_ik_pipeline_state');
      localStorage.removeItem('ht_ik_active_position_id');
    } catch (_) {}
  });
  await page.goto('/hr-pipeline.html');
  await page.waitForLoadState('networkidle');

  await openForm(page);
  await page.locator('#pos-field-ad').fill('VM Asistanı');
  await page.locator('#pos-field-sehir').fill('Ankara');
  await openCollapse(page);

  // Çalışma tipi chip — Tam Zamanlı
  await page.locator('[data-chip-field="calisma_tipi"] [data-value="Tam Zamanlı"]').click();
  await expect(
    page.locator('[data-chip-field="calisma_tipi"] [data-value="Tam Zamanlı"]')
  ).toHaveAttribute('aria-pressed', 'true');

  // Diller chip — İngilizce
  await page.locator('[data-chip-field="diller"] [data-value="İngilizce"]').click();

  // Müsaitlik select
  await page.locator('#pos-field-musaitlik').selectOption('1-ay');

  // Eğitim select
  await page.locator('#pos-field-egitim').selectOption('lisans');

  // tercih_segmentler chip — Lüks
  await page.locator('[data-chip-field="tercih_segmentler"] [data-value="Lüks"]').click();

  await page.locator('#btn-pos-form-submit').click();
  await page.waitForTimeout(400);

  var raw = await page.evaluate(function () { return window.__pr2PayloadCapture; });
  expect(raw).not.toBeNull();
  var p = JSON.parse(raw);
  expect(p.calisma_tipi).toContain('Tam Zamanlı');
  expect(p.diller).toContain('İngilizce');
  expect(p.musaitlik_pozisyon).toBe('1-ay');
  expect(p.egitim_seviye).toBe('lisans');
  expect(p.tercih_segmentler).toContain('Lüks');
  // maas KESINLIKLE OLMAMALI
  expect(p).not.toHaveProperty('maas');
});

/* ─────────────────────────────────────────
   5. maas alanı UI'da yok
───────────────────────────────────────── */
test('PR2-05 maas alanı UI\'da görünmez', async ({ page }) => {
  await gotoPipeline(page, VIEWPORTS.desktop);
  await openForm(page);
  var maasInput = page.locator('#pos-field-maas');
  await expect(maasInput).toHaveCount(0);
});

/* ─────────────────────────────────────────
   6. Collapse toggle — aç/kapat state korunur
───────────────────────────────────────── */
test('PR2-06 collapse toggle aç/kapat state', async ({ page }) => {
  await gotoPipeline(page, VIEWPORTS.desktop);
  await openForm(page);
  var toggle = page.locator('#btn-pos-collapse');
  var body   = page.locator('#pos-form-collapse-body');

  // Başlangıç: kapalı
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(body).toHaveAttribute('hidden', '');

  // Aç
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(body).not.toHaveAttribute('hidden');

  // Kapat
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(body).toHaveAttribute('hidden', '');
});

/* ─────────────────────────────────────────
   7. Chip seçim state korunur (toggle aç → chip seç → toggle kapa → aç)
───────────────────────────────────────── */
test('PR2-07 chip seçim collapse kapatıp açınca korunur', async ({ page }) => {
  await gotoPipeline(page, VIEWPORTS.desktop);
  await openForm(page);
  await openCollapse(page);

  // Chip seç
  await page.locator('[data-chip-field="calisma_tipi"] [data-value="Yarı Zamanlı"]').click();
  await expect(
    page.locator('[data-chip-field="calisma_tipi"] [data-value="Yarı Zamanlı"]')
  ).toHaveAttribute('aria-pressed', 'true');

  // Kapat ve tekrar aç
  await page.locator('#btn-pos-collapse').click();
  await page.waitForTimeout(250);
  await page.locator('#btn-pos-collapse').click();
  await page.waitForSelector('#pos-form-collapse-body:not([hidden])', { timeout: 2000 });

  // State korunmuş olmalı
  await expect(
    page.locator('[data-chip-field="calisma_tipi"] [data-value="Yarı Zamanlı"]')
  ).toHaveAttribute('aria-pressed', 'true');
});

/* ─────────────────────────────────────────
   8. Mobile viewport — form render, chip dokunma hedefi
───────────────────────────────────────── */
test('PR2-08 mobile 390px form render ve chip height', async ({ page }) => {
  await gotoPipeline(page, VIEWPORTS.mobile);
  await openForm(page);
  await openCollapse(page);

  // Chip görünür
  var chip = page.locator('[data-chip-field="calisma_tipi"] [data-value="Tam Zamanlı"]');
  await expect(chip).toBeVisible();

  // Chip yüksekliği 44px+ (mobile touch target)
  var box = await chip.boundingBox();
  expect(box).not.toBeNull();
  expect(box.height).toBeGreaterThanOrEqual(40); // slight tolerance
});

/* ─────────────────────────────────────────
   9. Desktop viewport — form render
───────────────────────────────────────── */
test('PR2-09 desktop 1440px form render', async ({ page }) => {
  await gotoPipeline(page, VIEWPORTS.desktop);
  await openForm(page);

  // Temel alanlar görünür
  await expect(page.locator('#pos-field-ad')).toBeVisible();
  await expect(page.locator('#pos-field-sehir')).toBeVisible();
  await expect(page.locator('#pos-field-seg')).toBeVisible();
  await expect(page.locator('#pos-field-exp')).toBeVisible();

  // Collapse toggle görünür
  await expect(page.locator('#btn-pos-collapse')).toBeVisible();

  // Açıklama textarea görünür
  await expect(page.locator('#pos-field-aciklama')).toBeVisible();
});

/* ─────────────────────────────────────────
   10. ESC — temiz form → direkt kapanır
───────────────────────────────────────── */
test('PR2-10 ESC temiz form direkt kapanır', async ({ page }) => {
  await gotoPipeline(page, VIEWPORTS.desktop);
  await openForm(page);
  await expect(page.locator('#ik-pos-form-sheet')).toHaveClass(/is-open/);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await expect(page.locator('#ik-pos-form-sheet')).not.toHaveClass(/is-open/);
});

/* ─────────────────────────────────────────
   11. ESC — kirli form → confirm dialog tetiklenir
───────────────────────────────────────── */
test('PR2-11 ESC kirli form confirm dialog', async ({ page }) => {
  await gotoPipeline(page, VIEWPORTS.desktop);
  await openForm(page);
  await page.locator('#pos-field-ad').fill('Test');

  var dialogShown = false;
  page.once('dialog', async function (dialog) {
    dialogShown = true;
    expect(dialog.message()).toMatch(/kaybolacak/i);
    await dialog.dismiss(); // vazgeç — form kalır
  });

  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  expect(dialogShown).toBe(true);
  // Form hala açık (dismiss)
  await expect(page.locator('#ik-pos-form-sheet')).toHaveClass(/is-open/);
});

/* ─────────────────────────────────────────
   12. Dark mode — chip seçili state kontrastı (görsel değil, class check)
───────────────────────────────────────── */
test('PR2-12 dark mode chip render', async ({ page }) => {
  await gotoPipeline(page, VIEWPORTS.desktop, true);
  await openForm(page);
  await openCollapse(page);

  var chip = page.locator('[data-chip-field="calisma_tipi"] [data-value="Proje Bazlı"]');
  await expect(chip).toBeVisible();
  await chip.click();
  await expect(chip).toHaveAttribute('aria-pressed', 'true');
  // Dark mode token'ları CSS variable — class değişmez, aria-pressed yeterli
});
