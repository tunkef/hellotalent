// ik-settings.spec.js — Asama 86 Sprint D
// Ayarlar: hesap + sifre + MFA + bildirim toggle + tema + KVKK md.11 freeze/delete.

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 }
};

async function gotoDemoSettings(page) {
  /* Demo flag persist edilir, settings/account/theme TEK SEFER reset edilir.
     Reload-aware: sentinel kullan, ikinci goto'da silme. */
  await page.addInitScript(() => {
    try {
      localStorage.setItem('ht_ik_demo_mode', '1');
      if (!sessionStorage.getItem('__ik_demo_init')) {
        localStorage.removeItem('ht_ik_settings_state');
        localStorage.removeItem('ht_ik_account_state');
        localStorage.removeItem('ht_theme_preference');
        sessionStorage.setItem('__ik_demo_init', '1');
      }
    } catch (e) { /* ignore */ }
  });
  await page.goto('/hr-settings.html');
  await page.waitForLoadState('networkidle');
}

test.describe('Asama 86 Sprint D — IK Settings', () => {
  test.describe('Markup-level (auth-walled bypass)', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'hr-settings.html'), 'utf8');

    test('hr-settings.html ik-shell + ik-settings panel CSS yükler', () => {
      expect(html).toMatch(/<link[^>]*href=["'][^"']*ik-shell\.css/);
      expect(html).toMatch(/<link[^>]*href=["'][^"']*ik-settings\.css/);
    });
    test('ik-settings.js script tag mevcut', () => {
      expect(html).toMatch(/<script[^>]*src=["'][^"']*ik-settings\.js/);
    });
    test('Eski hr-forms.css yok, data-ik-page="settings"', () => {
      expect(html).not.toMatch(/hr-forms\.css/);
      expect(html).toMatch(/data-ik-page=["']settings["']/);
    });
    test('aria-current="page" Ayarlar dropdown linkinde', () => {
      expect(html).toMatch(/href=["']hr-settings\.html["'][^>]*aria-current=["']page["']/);
    });
    test('5 section: account/security/notify/theme/danger', () => {
      expect(html).toMatch(/id=["']ik-set-section-account["']/);
      expect(html).toMatch(/id=["']ik-set-section-security["']/);
      expect(html).toMatch(/id=["']ik-set-section-notify["']/);
      expect(html).toMatch(/id=["']ik-set-section-theme["']/);
      expect(html).toMatch(/id=["']ik-set-section-danger["']/);
    });
    test('KVKK md.11 metni danger zone\'da', () => {
      expect(html).toMatch(/KVKK md\.11/i);
      expect(html).toMatch(/30 gün/i);
    });
    test('Skip link #ik-set-shell', () => {
      expect(html).toMatch(/href=["']#ik-set-shell["']/);
    });
  });

  test.describe('Hero + TOC + sections', () => {
    test('Hero render: eyebrow + headline + subline', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoSettings(page);
      await expect(page.locator('.ik-set-hero')).toHaveCount(1);
      await expect(page.locator('.ik-set-headline')).toContainText(/Ayarlar/i);
    });
    test('TOC 5 tab', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoSettings(page);
      await expect(page.locator('.ik-set-toc__tab')).toHaveCount(5);
    });
    test('5 section render', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoSettings(page);
      await expect(page.locator('.ik-set-section')).toHaveCount(5);
    });
  });

  test.describe('Account section (01)', () => {
    test('4 input: fullname, email, phone, role', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoSettings(page);
      await expect(page.locator('#ik-set-fullname')).toBeVisible();
      await expect(page.locator('#ik-set-email')).toBeVisible();
      await expect(page.locator('#ik-set-phone')).toBeVisible();
      await expect(page.locator('#ik-set-role')).toBeVisible();
    });
    test('Email read-only', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoSettings(page);
      await expect(page.locator('#ik-set-email')).toBeDisabled();
    });
  });

  test.describe('Security (02) — sifre + MFA', () => {
    test('Sifre form: 3 input + buton', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoSettings(page);
      await expect(page.locator('#ik-set-pw-current')).toBeVisible();
      await expect(page.locator('#ik-set-pw-new')).toBeVisible();
      await expect(page.locator('#ik-set-pw-confirm')).toBeVisible();
      await expect(page.locator('#ik-set-pw-change-btn')).toContainText(/güncelle/i);
    });
    test('Bos mevcut sifre error', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoSettings(page);
      await page.click('#ik-set-pw-change-btn');
      await expect(page.locator('#ik-set-pw-msg')).toContainText(/zorunlu/i);
    });
    test('Kisa yeni sifre error', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoSettings(page);
      await page.fill('#ik-set-pw-current', 'x');
      await page.fill('#ik-set-pw-new', '12345');
      await page.click('#ik-set-pw-change-btn');
      await expect(page.locator('#ik-set-pw-msg')).toContainText(/8 karakter/i);
    });
    test('Sifre confirm uyusmaz error', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoSettings(page);
      await page.fill('#ik-set-pw-current', 'demo123');
      await page.fill('#ik-set-pw-new', 'newpass123');
      await page.fill('#ik-set-pw-confirm', 'farkli');
      await page.click('#ik-set-pw-change-btn');
      await expect(page.locator('#ik-set-pw-msg')).toContainText(/eşleşmiyor/i);
    });
    test('MFA buton disabled (MVP 2 ile)', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoSettings(page);
      await expect(page.locator('#ik-set-mfa-btn')).toBeDisabled();
    });
  });

  test.describe('Bildirim toggles (03)', () => {
    test('3 toggle render', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoSettings(page);
      await expect(page.locator('input[data-ik-set-toggle]')).toHaveCount(3);
    });
    test('Default: msg + pipeline checked, weekly unchecked', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoSettings(page);
      await expect(page.locator('#ik-set-notify-msg')).toBeChecked();
      await expect(page.locator('#ik-set-notify-pipeline')).toBeChecked();
      await expect(page.locator('#ik-set-notify-weekly')).not.toBeChecked();
    });
    test('Weekly toggle persist edilir', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoSettings(page);
      /* Toggle input width/height:0 hidden — programatik check + change event */
      await page.evaluate(() => {
        var el = document.getElementById('ik-set-notify-weekly');
        if (el) {
          el.checked = true;
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      await expect(page.locator('#ik-set-notify-weekly')).toBeChecked();
      /* Wait for IK_DATA.updateSettings → localStorage flush */
      await page.waitForFunction(() => {
        try {
          var raw = localStorage.getItem('ht_ik_settings_state');
          return raw && JSON.parse(raw).notify_weekly === true;
        } catch (e) { return false; }
      });
      /* Reload + persist verify */
      await page.reload();
      await page.waitForLoadState('networkidle');
      await expect(page.locator('#ik-set-notify-weekly')).toBeChecked();
    });
  });

  test.describe('Tema (04)', () => {
    test('3 tema radio', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoSettings(page);
      await expect(page.locator('input[name="ik-set-theme"]')).toHaveCount(3);
    });
    test('System default', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoSettings(page);
      const sys = page.locator('input[name="ik-set-theme"][value="system"]');
      await expect(sys).toBeChecked();
    });
    test('Dark sec, html data-theme dark olur', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoSettings(page);
      await page.locator('input[name="ik-set-theme"][value="dark"]').check();
      const themeAttr = await page.getAttribute('html', 'data-theme');
      expect(themeAttr).toBe('dark');
    });
    test('Light sec, html data-theme light olur', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoSettings(page);
      await page.locator('input[name="ik-set-theme"][value="light"]').check();
      const themeAttr = await page.getAttribute('html', 'data-theme');
      expect(themeAttr).toBe('light');
    });
  });

  test.describe('Hesap yonetimi (05) — KVKK md.11', () => {
    test('Freeze + Delete buton render', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoSettings(page);
      await expect(page.locator('#ik-set-freeze-btn')).toContainText(/Hesabı dondur/i);
      await expect(page.locator('#ik-set-delete-btn')).toContainText(/Hesabı sil/i);
    });
    test('Freeze tikla, confirm modal acilir', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoSettings(page);
      await page.click('#ik-set-freeze-btn');
      await expect(page.locator('#ik-set-confirm-modal')).toHaveClass(/is-open/);
      await expect(page.locator('#ik-set-confirm-msg')).toContainText(/dondurmak/i);
    });
    test('Vazgec confirm modal kapatir', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoSettings(page);
      await page.click('#ik-set-freeze-btn');
      await page.click('#ik-set-confirm-cancel');
      await expect(page.locator('#ik-set-confirm-modal')).not.toHaveClass(/is-open/);
    });
    test('Freeze onayla, banner frozen', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoSettings(page);
      await page.click('#ik-set-freeze-btn');
      await page.click('#ik-set-confirm-ok');
      await expect(page.locator('#ik-set-account-banner')).toBeVisible();
      await expect(page.locator('#ik-set-account-banner')).toContainText(/dondurulmuş/i);
    });
    test('Delete tikla, KVKK 30 gun mesaji', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoSettings(page);
      await page.click('#ik-set-delete-btn');
      await expect(page.locator('#ik-set-confirm-msg')).toContainText(/30 gün/i);
      await expect(page.locator('#ik-set-confirm-msg')).toContainText(/KVKK md\.11/i);
    });
    test('Delete onayla, banner pending_deletion', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoSettings(page);
      await page.click('#ik-set-delete-btn');
      await page.click('#ik-set-confirm-ok');
      await expect(page.locator('#ik-set-account-banner')).toContainText(/silinecek/i);
    });
  });

  test.describe('Footer', () => {
    test('Cikis + kaydet buton', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoSettings(page);
      await expect(page.locator('#ik-set-signout')).toContainText(/Çıkış/i);
      await expect(page.locator('#ik-set-save')).toContainText(/Tercihleri kaydet/i);
    });
    test('Tercihleri kaydet toast cikar', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoSettings(page);
      await page.click('#ik-set-save');
      await expect(page.locator('#ik-toast')).toHaveClass(/is-visible/);
    });
  });

  test.describe('Mobile viewport', () => {
    test('Mobile: TOC scroll + form responsive', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await gotoDemoSettings(page);
      await expect(page.locator('.ik-set-hero')).toBeVisible();
      await expect(page.locator('.ik-set-toc')).toBeVisible();
      await expect(page.locator('.ik-set-section')).toHaveCount(5);
    });
  });
});
