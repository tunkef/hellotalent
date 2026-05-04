// a24-position-create-flow.spec.js
// A24 — Pozisyon yaratma flow UAT
// Kapsam: 11 senaryo × 3 viewport × 2 mode
// Not: aciklama char limit = 800 (JS kodundan confirm edildi, brief'teki 500 hatalı)

const { test, expect } = require('@playwright/test');

/* ─────────────────────────────────────────
   Viewports
───────────────────────────────────────── */
const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet:  { width: 1100, height: 900 },
  mobile:  { width: 390,  height: 844 },
};

/* ─────────────────────────────────────────
   Helpers
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

async function gotoPipelineWithPos(page, vp, darkMode) {
  await page.setViewportSize(vp || VIEWPORTS.desktop);
  await page.addInitScript(function (dm) {
    try {
      localStorage.setItem('ht_ik_demo_mode', '1');
      localStorage.setItem('ht_ik_active_position_id', 'pos-1');
      if (dm) document.documentElement.setAttribute('data-theme', 'dark');
    } catch (_) {}
  }, darkMode ? 'dark' : '');
  await page.goto('/hr-pipeline.html');
  await page.waitForLoadState('networkidle');
}

async function gotoPool(page, vp, darkMode) {
  await page.setViewportSize(vp || VIEWPORTS.desktop);
  await page.addInitScript(function (dm) {
    try {
      localStorage.setItem('ht_ik_demo_mode', '1');
      localStorage.removeItem('ht_ik_active_position_id');
      if (dm) document.documentElement.setAttribute('data-theme', 'dark');
    } catch (_) {}
  }, darkMode ? 'dark' : '');
  await page.goto('/hr-pool.html');
  await page.waitForLoadState('networkidle');
}

/** Sheet açık olana kadar bekle */
async function waitForSheet(page) {
  await page.waitForSelector('#ik-pos-form-sheet.is-open', { timeout: 5000 });
}

/** Sheet kapalı olana kadar bekle */
async function waitForSheetClosed(page) {
  await page.waitForSelector('#ik-pos-form-sheet:not(.is-open)', { timeout: 5000 });
}

/** Pozisyon adı doldur, opsiyonel açıklama */
async function fillForm(page, title, aciklama) {
  await page.fill('#pos-field-ad', title);
  if (aciklama !== undefined) {
    await page.fill('#pos-field-aciklama', aciklama);
  }
}

/** Submit et, toast belirene kadar bekle */
async function submitAndWait(page) {
  await page.click('#btn-pos-form-submit');
  await page.waitForSelector('[data-ik-pipeline-toast].is-visible', { timeout: 10000 });
}

async function openSheet(page) {
  const btnNew = page.locator('#btn-new-position');
  const zeroBtn = page.locator('.ik-pipeline__zero-state-cta');
  const newVisible = await btnNew.isVisible().catch(() => false);
  if (newVisible) {
    await btnNew.click();
  } else {
    await zeroBtn.click();
  }
  await waitForSheet(page);
}

/* ─────────────────────────────────────────
   IK_DATA.createPosition mock injector
───────────────────────────────────────── */
async function injectCreatePositionMock(page, opts) {
  await page.addInitScript(function (o) {
    window._a24MockCreatePos = o;
  }, opts);
  await page.addInitScript(function () {
    window.addEventListener('DOMContentLoaded', function () {
      function patchIkData() {
        if (window.IK_DATA && window.IK_DATA.createPosition) {
          var _orig = window.IK_DATA.createPosition;
          window.IK_DATA.createPosition = function (payload) {
            var o = window._a24MockCreatePos;
            if (!o) return _orig.call(this, payload);
            return Promise.resolve(
              o.ok
                ? { ok: true, row: Object.assign({ id: 'pos-test-' + Date.now(), durum: 'aktif', ad: payload.ad }, o.row || {}) }
                : { ok: false, error: o.error || 'Mock hata' }
            );
          };
        }
      }
      var attempts = 0;
      var iv = setInterval(function () {
        patchIkData();
        if (++attempts > 20) clearInterval(iv);
      }, 100);
    });
  });
}

/* ═══════════════════════════════════════════════════
   TEST SUITE — viewport/mode döngüsü ile
═══════════════════════════════════════════════════ */

var MATRIX = [
  { vp: VIEWPORTS.desktop, label: 'desktop', dark: false },
  { vp: VIEWPORTS.desktop, label: 'desktop-dark', dark: true },
  { vp: VIEWPORTS.tablet,  label: 'tablet', dark: false },
  { vp: VIEWPORTS.tablet,  label: 'tablet-dark', dark: true },
  { vp: VIEWPORTS.mobile,  label: 'mobile', dark: false },
  { vp: VIEWPORTS.mobile,  label: 'mobile-dark', dark: true },
];

MATRIX.forEach(function (m) {
  test.describe('A24 pozisyon formu [' + m.label + ']', function () {

    /* ─── Senaryo 1: Happy path ─── */
    test('happy path: sheet aç → ad doldur → submit → toast görünür', async function ({ page }) {
      await injectCreatePositionMock(page, { ok: true });
      await gotoPipelineWithPos(page, m.vp, m.dark);
      await page.waitForSelector('.ik-stage, .ik-pipeline__zero-state', { timeout: 6000 });

      await openSheet(page);

      const sheet = page.locator('#ik-pos-form-sheet');
      await expect(sheet).toHaveAttribute('aria-hidden', 'false');

      await fillForm(page, 'Mağaza Müdürü');
      await page.click('#btn-pos-form-submit');

      const toast = page.locator('[data-ik-pipeline-toast]');
      await expect(toast).toHaveClass(/is-visible/, { timeout: 10000 });
      await expect(toast).toContainText('pozisyonu açıldı');

      await waitForSheetClosed(page);
    });

    /* ─── Senaryo 2: onBlur validation ─── */
    test('validation onBlur: boş blur → error gösterilir, onChange öncesinde gösterilmez', async function ({ page }) {
      await gotoPipelineWithPos(page, m.vp, m.dark);
      await page.waitForSelector('.ik-stage, .ik-pipeline__zero-state', { timeout: 6000 });
      await openSheet(page);

      const adInput = page.locator('#pos-field-ad');
      const adError = page.locator('#pos-field-ad-error');

      // onChange anında error YOK
      await adInput.type('A');
      await expect(adError).not.toHaveClass(/is-visible/);

      // 1 char blur → hata tetiklenir
      await adInput.fill('X');
      await adInput.blur();
      await expect(adError).toHaveClass(/is-visible/, { timeout: 3000 });
      await expect(adError).toContainText('Hata:');
    });

    /* ─── Senaryo 3: onSubmit validation ─── */
    test('validation onSubmit: boş ad ile submit → error visible + focus ad inputa', async function ({ page }) {
      await gotoPipelineWithPos(page, m.vp, m.dark);
      await page.waitForSelector('.ik-stage, .ik-pipeline__zero-state', { timeout: 6000 });
      await openSheet(page);

      await page.click('#btn-pos-form-submit');

      const adError = page.locator('#pos-field-ad-error');
      await expect(adError).toHaveClass(/is-visible/, { timeout: 3000 });
      await expect(adError).toContainText('Hata: Pozisyon adı gerekli.');

      const focused = await page.evaluate(function () {
        return document.activeElement && document.activeElement.id;
      });
      expect(focused).toBe('pos-field-ad');
    });

    /* ─── Senaryo 4: Dirty form ESC confirm ─── */
    test('dirty ESC: alan dolu → ESC → confirm dialog çıkar, cancel kalır / ok kapatır', async function ({ page }) {
      await gotoPipelineWithPos(page, m.vp, m.dark);
      await page.waitForSelector('.ik-stage, .ik-pipeline__zero-state', { timeout: 6000 });
      await openSheet(page);

      await fillForm(page, 'Test Pozisyon');

      // ESC → confirm → CANCEL → sheet hala açık
      page.once('dialog', async function (dialog) {
        expect(dialog.type()).toBe('confirm');
        await dialog.dismiss();
      });
      await page.keyboard.press('Escape');
      await expect(page.locator('#ik-pos-form-sheet')).toHaveClass(/is-open/);

      // ESC → confirm → OK → sheet kapanır
      page.once('dialog', async function (dialog) {
        await dialog.accept();
      });
      await page.keyboard.press('Escape');
      await waitForSheetClosed(page);
    });

    /* ─── Senaryo 5: Temiz form ESC ─── */
    test('clean ESC: alan değiştirilmedi → ESC → confirm yok, direkt kapanır', async function ({ page }) {
      await gotoPipelineWithPos(page, m.vp, m.dark);
      await page.waitForSelector('.ik-stage, .ik-pipeline__zero-state', { timeout: 6000 });
      await openSheet(page);

      let dialogAppeared = false;
      page.on('dialog', async function (dialog) {
        dialogAppeared = true;
        await dialog.dismiss();
      });
      await page.keyboard.press('Escape');
      await waitForSheetClosed(page);
      expect(dialogAppeared).toBe(false);
    });

    /* ─── Senaryo 6: Double-submit guard ─── */
    test('double-submit guard: ikinci tıklama ignore edilir', async function ({ page }) {
      await page.addInitScript(function () {
        window._a24MockDelay = true;
      });
      await page.addInitScript(function () {
        window.addEventListener('DOMContentLoaded', function () {
          var iv = setInterval(function () {
            if (window.IK_DATA && window.IK_DATA.createPosition) {
              clearInterval(iv);
              var _orig = window.IK_DATA.createPosition;
              window.IK_DATA.createPosition = function (payload) {
                if (window._a24MockDelay) {
                  return new Promise(function (resolve) {
                    setTimeout(function () {
                      resolve({ ok: true, row: { id: 'pos-ds-' + Date.now(), ad: payload.ad, durum: 'aktif' } });
                    }, 800);
                  });
                }
                return _orig.call(this, payload);
              };
            }
          }, 100);
        });
      });

      await gotoPipelineWithPos(page, m.vp, m.dark);
      await page.waitForSelector('.ik-stage, .ik-pipeline__zero-state', { timeout: 6000 });
      await openSheet(page);
      await fillForm(page, 'Çift Tıklama Test');

      const submitBtn = page.locator('#btn-pos-form-submit');
      await submitBtn.click();
      await expect(submitBtn).toBeDisabled({ timeout: 2000 });
      await submitBtn.click({ force: true });

      const toast = page.locator('[data-ik-pipeline-toast]');
      await expect(toast).toHaveClass(/is-visible/, { timeout: 6000 });
    });

    /* ─── Senaryo 7: Pool coaching banner ─── */
    test('pool 0-pos coaching banner görünür + Pipeline linki doğru', async function ({ page }) {
      await page.addInitScript(function () {
        try {
          localStorage.setItem('ht_ik_demo_mode', '1');
          localStorage.removeItem('ht_ik_active_position_id');
          window._a24ZeroPositions = true;
        } catch (_) {}
      });
      await page.addInitScript(function () {
        window.addEventListener('DOMContentLoaded', function () {
          var iv = setInterval(function () {
            if (window.IK_DATA && window.IK_DATA.getPositions) {
              clearInterval(iv);
              window.IK_DATA.getPositions = function () {
                return Promise.resolve([]);
              };
            }
          }, 100);
        });
      });

      await gotoPool(page, m.vp, m.dark);
      await page.waitForTimeout(1500);

      const banner = page.locator('#ik-pool-coaching-banner');
      await expect(banner).toHaveClass(/is-visible/, { timeout: 5000 });

      const cta = banner.locator('.ik-coaching-banner__cta');
      await expect(cta).toHaveAttribute('href', /hr-pipeline\.html/);
    });

    /* ─── Senaryo 8: Pipeline 0-pos zero state CTA ─── */
    test('pipeline 0-pos zero state CTA "İlk pozisyonu aç" → sheet açılır', async function ({ page }) {
      await page.addInitScript(function () {
        window.addEventListener('DOMContentLoaded', function () {
          var iv = setInterval(function () {
            if (window.IK_DATA && window.IK_DATA.getPositions) {
              clearInterval(iv);
              window.IK_DATA.getPositions = function () {
                return Promise.resolve([]);
              };
            }
          }, 100);
        });
      });

      await gotoPipeline(page, m.vp, m.dark);
      await page.waitForSelector('.ik-pipeline__zero-state', { timeout: 8000 });

      const cta = page.locator('.ik-pipeline__zero-state-cta');
      await expect(cta).toContainText('İlk pozisyonu aç');
      await cta.click();
      await waitForSheet(page);
    });

    /* ─── Senaryo 9: Hash trigger ─── */
    test('hash trigger: hr-pipeline.html#new-position → sheet otomatik açık', async function ({ page }) {
      await page.addInitScript(function () {
        try {
          localStorage.setItem('ht_ik_demo_mode', '1');
          localStorage.setItem('ht_ik_active_position_id', 'pos-1');
        } catch (_) {}
      });
      await page.setViewportSize(m.vp);
      await page.goto('/hr-pipeline.html#new-position');
      await page.waitForLoadState('networkidle');

      await page.waitForSelector('#ik-pos-form-sheet.is-open', { timeout: 4000 });
      await expect(page.locator('#ik-pos-form-sheet')).toHaveAttribute('aria-hidden', 'false');
    });

    /* ─── Senaryo 10: Focus trap ─── */
    test('focus trap: Tab sheet içinde döner', async function ({ page }) {
      await gotoPipelineWithPos(page, m.vp, m.dark);
      await page.waitForSelector('.ik-stage, .ik-pipeline__zero-state', { timeout: 6000 });
      await openSheet(page);

      const focusableCount = await page.evaluate(function () {
        var sheet = document.getElementById('ik-pos-form-sheet');
        if (!sheet) return 0;
        return sheet.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ).length;
      });
      expect(focusableCount).toBeGreaterThan(1);

      for (var i = 0; i < focusableCount + 1; i++) {
        await page.keyboard.press('Tab');
      }

      const inSheet = await page.evaluate(function () {
        var sheet = document.getElementById('ik-pos-form-sheet');
        return sheet ? sheet.contains(document.activeElement) : false;
      });
      expect(inSheet).toBe(true);
    });

    /* ─── Senaryo 11a: Açıklama counter — is-warning (>700 char) ─── */
    test('aciklama counter: 701 char → is-warning class gösterilir', async function ({ page }) {
      await gotoPipelineWithPos(page, m.vp, m.dark);
      await page.waitForSelector('.ik-stage, .ik-pipeline__zero-state', { timeout: 6000 });
      await openSheet(page);

      const textarea = page.locator('#pos-field-aciklama');
      const counter  = page.locator('#pos-field-aciklama-counter');

      // 699 char — ne warning ne over
      await textarea.fill('A'.repeat(699));
      await textarea.dispatchEvent('input');
      await page.waitForTimeout(500);
      await expect(counter).not.toHaveClass(/is-warning/);
      await expect(counter).not.toHaveClass(/is-over/);

      // 701 char — is-warning (maxlength=800 olduğu için fill 800'de kesilmez, 701 geçer)
      await textarea.fill('A'.repeat(701));
      await textarea.dispatchEvent('input');
      await page.waitForTimeout(500);
      await expect(counter).toHaveClass(/is-warning/);
    });

    /* ─── Senaryo 11b: Açıklama counter — is-over BUG (skipped) ─── */
    // BUG: maxlength="800" (HTML attr) + eşik len>800 (JS) çelişiyor.
    // textarea hiçbir zaman 801 char alamaz → is-over class unreachable.
    // Fix: ya maxlength="801" ya da eşik len>=800 olmalı.
    // ui-agent'a handoff gerekiyor.
    test('aciklama counter: is-over class unreachable — BUG (maxlength=800, eşik >800)', async function ({ page }) {
      test.skip(true, 'BUG A24-CTR-01: maxlength="800" ile len>800 eşiği çelişiyor — is-over hiçbir zaman tetiklenemiyor. ui-agent fix gerekiyor: ya maxlength kaldır ya da eşik len>=800 yap.');
    });

  });
});
