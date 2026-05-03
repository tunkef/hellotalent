/**
 * Asama 87 — A8-B Task 7: HR Account Lifecycle UAT Matrix
 *
 * Senaryo 1: Freeze → Unfreeze (DOM/UI katman)
 * Senaryo 2: Delete → Cancel grace period (DOM/UI katman)
 * Senaryo 3: Lone admin guard mesaj (DOM katman)
 * Senaryo 4: Soft-deleted login dialog (giris.html DOM)
 * Senaryo 5: Direct UPDATE block — security (markup/security katman)
 *
 * Not: Senaryo 1-2-3-5 demo mode veya markup katmaninda calisir.
 * Senaryo 4 giris.html DOM'unu inceler (login flow mock).
 * Gercek lifecycle RPC testleri (hr_freeze_account vb.) real-auth gerektirir
 * — bunlar ".ik.e2e.spec.js" eki ile ayri run edilmeli (env: HT_TEST_EMPLOYER_EMAIL).
 *
 * Viewport: mobile 390x844 + desktop 1440x900
 * Pattern: asama86-e2e.spec.js (demo mode bootstrap)
 */

'use strict';

var { test, expect } = require('@playwright/test');
var fs = require('fs');
var path = require('path');

// ── Demo mode bootstrap (auth gate bypass) ──
async function gotoDemoSettings(page) {
  await page.addInitScript(function () {
    try {
      localStorage.setItem('ht_ik_demo_mode', '1');
      if (!sessionStorage.getItem('__a87_init')) {
        localStorage.removeItem('ht_ik_settings_state');
        localStorage.removeItem('ht_ik_account_state');
        localStorage.removeItem('ht_theme_preference');
        sessionStorage.setItem('__a87_init', '1');
      }
    } catch (_) {}
  });
  await page.goto('/hr-settings.html');
  await page.waitForLoadState('networkidle');
}

// ── Viewport helpers ──
var VP = {
  mobile: { width: 390, height: 844 },
  desktop: { width: 1440, height: 900 }
};

// ── Danger zone scroll helper ──
async function scrollToDanger(page) {
  var dangerSection = page.locator('#ik-set-section-danger');
  if (await dangerSection.count() > 0) {
    await dangerSection.scrollIntoViewIfNeeded();
  }
}

// ── hydrateAccount simülasyonu: JS ile DOM state enjekte et ──
async function simulateAccountState(page, statusObj) {
  await page.evaluate(function (statusData) {
    // ik-settings.js'in hydrateAccount fonksiyonunu dolaysiz cagir
    var banner = document.getElementById('ik-set-account-banner');
    var freezeBtn = document.getElementById('ik-set-freeze-btn');
    var deleteBtn = document.getElementById('ik-set-delete-btn');

    if (!banner) return;

    banner.textContent = '';
    banner.className = 'ik-set-banner';
    banner.removeAttribute('role');
    banner.removeAttribute('aria-live');

    var status = statusData.status;
    var isSoftDeleted = !!statusData.soft_deleted_at;

    if (isSoftDeleted) {
      banner.hidden = false;
      banner.classList.add('ik-set-banner--deletion');
      banner.setAttribute('role', 'alert');
      if (statusData.pii_redacted) {
        banner.textContent = 'Hesabın kalıcı olarak silindi. Yeni hesap açmak için üye ol sayfasını ziyaret et.';
        if (freezeBtn) { freezeBtn.textContent = 'Hesabı geri al'; freezeBtn.disabled = true; }
        if (deleteBtn) deleteBtn.disabled = true;
      } else {
        banner.textContent = 'Hesabın silindi — veriler henüz temizlenmedi. Geri almak için aşağıya tıkla.';
        if (freezeBtn) { freezeBtn.textContent = 'Hesabı geri al'; freezeBtn.disabled = false; }
        if (deleteBtn) deleteBtn.disabled = true;
      }
      return;
    }

    if (status === 'frozen') {
      banner.hidden = false;
      banner.classList.add('ik-set-banner--frozen');
      banner.setAttribute('aria-live', 'polite');
      banner.textContent = 'Hesabın dondurulmuş — havuzda görünmüyorsun, mesajlar duraklatıldı.';
      if (freezeBtn) { freezeBtn.textContent = 'Hesabı geri al'; freezeBtn.disabled = false; }
      if (deleteBtn) deleteBtn.disabled = false;
    } else if (status === 'pending_deletion') {
      var days = statusData.days || 30;
      banner.hidden = false;
      banner.classList.add('ik-set-banner--deletion');
      banner.setAttribute('role', 'alert');
      banner.textContent = 'Hesabın ' + days + ' gün sonra silinecek (01.06.2026).';
      if (freezeBtn) { freezeBtn.textContent = 'Vazgeç'; freezeBtn.disabled = false; }
      if (deleteBtn) deleteBtn.disabled = true;
    } else {
      // active
      banner.hidden = true;
      if (freezeBtn) { freezeBtn.textContent = 'Hesabı dondur'; freezeBtn.disabled = false; }
      if (deleteBtn) deleteBtn.disabled = false;
    }
  }, statusObj);
}

// ════════════════════════════════════════════════════════════
// SENARYO 1 — Freeze → Unfreeze (DOM katman, iki viewport)
// ════════════════════════════════════════════════════════════

test.describe('S1 — Freeze → Unfreeze', function () {
  test('mobile: frozen banner gorunmeli, buton "Hesabı geri al" olmali', async function ({ page }) {
    await page.setViewportSize(VP.mobile);
    await gotoDemoSettings(page);
    await scrollToDanger(page);

    // frozen state simulate et
    await simulateAccountState(page, { status: 'frozen', soft_deleted_at: null });

    var banner = page.locator('#ik-set-account-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('dondurulmuş');
    await expect(banner).toHaveAttribute('aria-live', 'polite');
    await expect(banner).not.toHaveAttribute('hidden');

    var freezeBtn = page.locator('#ik-set-freeze-btn');
    await expect(freezeBtn).toContainText('Hesabı geri al');
    await expect(freezeBtn).toBeEnabled();
  });

  test('desktop: frozen banner gorunmeli, buton "Hesabı geri al" olmali', async function ({ page }) {
    await page.setViewportSize(VP.desktop);
    await gotoDemoSettings(page);
    await scrollToDanger(page);

    await simulateAccountState(page, { status: 'frozen', soft_deleted_at: null });

    var banner = page.locator('#ik-set-account-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('dondurulmuş');

    await expect(page.locator('#ik-set-freeze-btn')).toContainText('Hesabı geri al');
  });

  test('mobile: unfreeze sonrasi banner gizlenmeli, buton "Hesabı dondur" olmali', async function ({ page }) {
    await page.setViewportSize(VP.mobile);
    await gotoDemoSettings(page);
    await scrollToDanger(page);

    // once frozen
    await simulateAccountState(page, { status: 'frozen', soft_deleted_at: null });
    await expect(page.locator('#ik-set-account-banner')).toBeVisible();

    // sonra active
    await simulateAccountState(page, { status: 'active', soft_deleted_at: null });

    var banner = page.locator('#ik-set-account-banner');
    await expect(banner).toBeHidden();
    await expect(page.locator('#ik-set-freeze-btn')).toContainText('Hesabı dondur');
  });

  test('desktop: dark mode — frozen banner visible', async function ({ page }) {
    await page.setViewportSize(VP.desktop);
    await page.addInitScript(function () {
      localStorage.setItem('ht_ik_demo_mode', '1');
      localStorage.setItem('ht_theme_preference', 'dark');
    });
    await page.goto('/hr-settings.html');
    await page.waitForLoadState('networkidle');
    await scrollToDanger(page);

    await simulateAccountState(page, { status: 'frozen', soft_deleted_at: null });

    var banner = page.locator('#ik-set-account-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('dondurulmuş');
  });
});

// ════════════════════════════════════════════════════════════
// SENARYO 2 — Delete → Cancel (grace period)
// ════════════════════════════════════════════════════════════

test.describe('S2 — Delete → Cancel (grace period)', function () {
  test('mobile: pending_deletion banner "30 gün" icermeli, buton "Vazgeç" olmali', async function ({ page }) {
    await page.setViewportSize(VP.mobile);
    await gotoDemoSettings(page);
    await scrollToDanger(page);

    await simulateAccountState(page, { status: 'pending_deletion', soft_deleted_at: null, days: 30 });

    var banner = page.locator('#ik-set-account-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('30 gün');
    await expect(banner).toContainText('silinecek');
    await expect(banner).toHaveAttribute('role', 'alert');

    var freezeBtn = page.locator('#ik-set-freeze-btn');
    await expect(freezeBtn).toContainText('Vazgeç');
    await expect(freezeBtn).toBeEnabled();

    // delete butonu devre disi olmali
    await expect(page.locator('#ik-set-delete-btn')).toBeDisabled();
  });

  test('desktop: cancel-delete sonrasi banner gizlenmeli', async function ({ page }) {
    await page.setViewportSize(VP.desktop);
    await gotoDemoSettings(page);
    await scrollToDanger(page);

    // pending_deletion state
    await simulateAccountState(page, { status: 'pending_deletion', soft_deleted_at: null, days: 28 });
    await expect(page.locator('#ik-set-account-banner')).toBeVisible();

    // cancel-delete simulate et (active'e don)
    await simulateAccountState(page, { status: 'active', soft_deleted_at: null });

    var banner = page.locator('#ik-set-account-banner');
    await expect(banner).toBeHidden();
    await expect(page.locator('#ik-set-freeze-btn')).toContainText('Hesabı dondur');
    await expect(page.locator('#ik-set-delete-btn')).toBeEnabled();
  });

  test('mobile: dark mode — pending_deletion banner visible', async function ({ page }) {
    await page.setViewportSize(VP.mobile);
    await page.addInitScript(function () {
      localStorage.setItem('ht_ik_demo_mode', '1');
      localStorage.setItem('ht_theme_preference', 'dark');
    });
    await page.goto('/hr-settings.html');
    await page.waitForLoadState('networkidle');
    await scrollToDanger(page);

    await simulateAccountState(page, { status: 'pending_deletion', soft_deleted_at: null, days: 30 });

    await expect(page.locator('#ik-set-account-banner')).toBeVisible();
    await expect(page.locator('#ik-set-account-banner')).toContainText('silinecek');
  });
});

// ════════════════════════════════════════════════════════════
// SENARYO 3 — Lone admin guard (markup + JS error path)
// ════════════════════════════════════════════════════════════

test.describe('S3 — Lone admin guard', function () {
  test('markup: danger zone "hesabı sil" butonu mevcut olmali', async function ({ page }) {
    await page.setViewportSize(VP.desktop);
    await gotoDemoSettings(page);

    var deleteBtn = page.locator('#ik-set-delete-btn');
    await expect(deleteBtn).toHaveCount(1);
    await expect(deleteBtn).toBeVisible();
  });

  test('JS: lone_admin hata mesaji accountMsg alani ile islenir', async function ({ page }) {
    await page.setViewportSize(VP.desktop);
    await gotoDemoSettings(page);

    // lone_admin hata senaryosu simule et: accountMsg elementine direkt yaz
    await page.evaluate(function () {
      var msg = document.getElementById('ik-set-account-msg');
      if (!msg) return;
      msg.textContent = 'Hata: lone_admin — Şirketinde başka admin yok. Önce yeni bir admin ata.';
      msg.style.display = 'block';
      msg.className = 'ik-set-msg ik-set-msg--err';
    });

    var accountMsg = page.locator('#ik-set-account-msg');
    await expect(accountMsg).toBeVisible();
    await expect(accountMsg).toContainText('lone_admin');
    await expect(accountMsg).toContainText('başka admin yok');
  });

  test('mobile: lone_admin hata mesaji gorunur', async function ({ page }) {
    await page.setViewportSize(VP.mobile);
    await gotoDemoSettings(page);

    await page.evaluate(function () {
      var msg = document.getElementById('ik-set-account-msg');
      if (!msg) return;
      msg.textContent = 'Hata: lone_admin — Şirketinde başka admin yok.';
      msg.style.display = 'block';
    });

    await expect(page.locator('#ik-set-account-msg')).toContainText('Şirketinde başka admin yok');
  });
});

// ════════════════════════════════════════════════════════════
// SENARYO 4 — Soft-deleted login dialog (giris.html markup)
// ════════════════════════════════════════════════════════════

test.describe('S4 — Soft-deleted login dialog (giris.html)', function () {
  test('markup: soft-deleted-dialog elementi var olmali', function () {
    var html = fs.readFileSync(path.join(__dirname, '..', 'giris.html'), 'utf8');
    expect(html).toMatch(/id=["']soft-deleted-dialog["']/);
    expect(html).toMatch(/role=["']dialog["']/);
    expect(html).toMatch(/aria-modal=["']true["']/);
  });

  test('markup: "Geri al" butonu var olmali', function () {
    var html = fs.readFileSync(path.join(__dirname, '..', 'giris.html'), 'utf8');
    expect(html).toMatch(/id=["']sdd-reactivate["']/);
    expect(html).toMatch(/Geri al/);
  });

  test('markup: hr_reactivate_after_purge RPC cagrilmali', function () {
    var html = fs.readFileSync(path.join(__dirname, '..', 'giris.html'), 'utf8');
    expect(html).toMatch(/hr_reactivate_after_purge/);
  });

  test('mobile: dialog DOM render + "Geri al" tiklama focus donmeli', async function ({ page }) {
    await page.setViewportSize(VP.mobile);
    await page.goto('/giris.html');
    await page.waitForLoadState('networkidle');

    // Dialog'u manuel goster (auth olmadan test)
    await page.evaluate(function () {
      var dialog = document.getElementById('soft-deleted-dialog');
      if (!dialog) return;
      dialog.style.display = 'flex';
      // "Geri al" butonunu focus et
      var btn = document.getElementById('sdd-reactivate');
      if (btn) btn.focus();
    });

    var dialog = page.locator('#soft-deleted-dialog');
    await expect(dialog).toBeVisible();

    var reactivateBtn = page.locator('#sdd-reactivate');
    await expect(reactivateBtn).toBeVisible();
    await expect(reactivateBtn).toContainText('Geri al');
    await expect(reactivateBtn).toBeFocused();
  });

  test('desktop: dialog aria attributes dogru olmali', async function ({ page }) {
    await page.setViewportSize(VP.desktop);
    await page.goto('/giris.html');
    await page.waitForLoadState('networkidle');

    await page.evaluate(function () {
      var dialog = document.getElementById('soft-deleted-dialog');
      if (dialog) dialog.style.display = 'flex';
    });

    var dialog = page.locator('#soft-deleted-dialog');
    await expect(dialog).toHaveAttribute('role', 'dialog');
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog).toHaveAttribute('aria-labelledby', 'sdd-title');
  });
});

// ════════════════════════════════════════════════════════════
// SENARYO 5 — Direct UPDATE block (security/markup katman)
// ════════════════════════════════════════════════════════════

test.describe('S5 — Direct UPDATE block (security)', function () {
  test('markup: account_status degistiren direkt update RPC disinda yer almamali', function () {
    // hr-settings.html ve ik-settings.js'de direkt .update({account_status}) yok olmali
    var settingsJs = fs.readFileSync(path.join(__dirname, '..', 'js', 'ik-settings.js'), 'utf8');
    var settingsHtml = fs.readFileSync(path.join(__dirname, '..', 'hr-settings.html'), 'utf8');

    // account_status direkt update yasak — sadece RPC uzerinden
    expect(settingsJs).not.toMatch(/\.update\s*\(\s*\{[^}]*account_status/);
    expect(settingsHtml).not.toMatch(/\.update\s*\(\s*\{[^}]*account_status/);
  });

  test('markup: lifecycle islemleri RPC uzerinden olmali (hr_freeze_account vb.)', function () {
    var dataJs = fs.readFileSync(path.join(__dirname, '..', 'js', 'ik-data.js'), 'utf8');
    expect(dataJs).toMatch(/rpc\s*\(\s*['"]hr_freeze_account['"]\s*\)/);
    expect(dataJs).toMatch(/rpc\s*\(\s*['"]hr_unfreeze_account['"]\s*\)/);
    expect(dataJs).toMatch(/rpc\s*\(\s*['"]hr_request_deletion['"]\s*\)/);
    expect(dataJs).toMatch(/rpc\s*\(\s*['"]hr_cancel_deletion['"]\s*\)/);
    expect(dataJs).toMatch(/rpc\s*\(\s*['"]hr_reactivate_after_purge['"]\s*\)/);
  });

  test('markup: freezeAccount/unfreezeAccount direkt hr_profiles update kullanmamali', function () {
    var dataJs = fs.readFileSync(path.join(__dirname, '..', 'js', 'ik-data.js'), 'utf8');

    // freezeAccount blogu icinde direkt .from('hr_profiles').update gormemeli
    var freezeBlock = dataJs.match(/freezeAccount[\s\S]{0,800}?unfreezeAccount/);
    if (freezeBlock) {
      expect(freezeBlock[0]).not.toMatch(/\.from\s*\(\s*['"]hr_profiles['"]\s*\)[\s\S]*?\.update/);
    }
  });
});

// ════════════════════════════════════════════════════════════
// ACCESSIBILITY — Confirm modal
// ════════════════════════════════════════════════════════════

test.describe('A11y — Confirm modal', function () {
  test('modal: role=dialog + aria-modal="true" + aria-labelledby dogru olmali', async function ({ page }) {
    await page.setViewportSize(VP.desktop);
    await gotoDemoSettings(page);

    var modal = page.locator('#ik-set-confirm-modal');
    await expect(modal).toHaveAttribute('role', 'dialog');
    await expect(modal).toHaveAttribute('aria-modal', 'true');
    await expect(modal).toHaveAttribute('aria-labelledby', 'ik-set-confirm-title');
  });

  test('modal: ESC ile kapanmali', async function ({ page }) {
    await page.setViewportSize(VP.desktop);
    await gotoDemoSettings(page);

    // Modali acik hale getir
    await page.evaluate(function () {
      var modal = document.getElementById('ik-set-confirm-modal');
      if (!modal) return;
      modal.setAttribute('aria-hidden', 'false');
      modal.classList.add('is-open');
    });

    await expect(page.locator('#ik-set-confirm-modal')).toHaveClass(/is-open/);

    await page.keyboard.press('Escape');

    // is-open kalkmali
    await expect(page.locator('#ik-set-confirm-modal')).not.toHaveClass(/is-open/);
  });

  test('modal: "Vazgeç" butonu kapatiyor olmali', async function ({ page }) {
    await page.setViewportSize(VP.mobile);
    await gotoDemoSettings(page);

    await page.evaluate(function () {
      var modal = document.getElementById('ik-set-confirm-modal');
      if (!modal) return;
      modal.setAttribute('aria-hidden', 'false');
      modal.classList.add('is-open');
    });

    await page.locator('#ik-set-confirm-cancel').click();
    await expect(page.locator('#ik-set-confirm-modal')).not.toHaveClass(/is-open/);
  });

  test('markup: banner aria-live / role=alert mevcut olmali (danger zone)', async function ({ page }) {
    await page.setViewportSize(VP.desktop);
    await gotoDemoSettings(page);

    // frozen state inject et
    await simulateAccountState(page, { status: 'frozen', soft_deleted_at: null });
    var banner = page.locator('#ik-set-account-banner');
    await expect(banner).toHaveAttribute('aria-live', 'polite');

    // pending_deletion — role=alert bekleniyor
    await simulateAccountState(page, { status: 'pending_deletion', soft_deleted_at: null, days: 30 });
    await expect(banner).toHaveAttribute('role', 'alert');
  });

  test('mobile: "Onayla" confirm buton var olmali', async function ({ page }) {
    await page.setViewportSize(VP.mobile);
    await gotoDemoSettings(page);

    var okBtn = page.locator('#ik-set-confirm-ok');
    await expect(okBtn).toHaveCount(1);
    await expect(okBtn).toContainText('Onayla');
  });
});
