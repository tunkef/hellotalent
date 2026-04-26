// ik-company.spec.js — Asama 86 Sprint D
// Sirket profili formu: hero + 3 section + brand chips + cta + dark mode.
// Auth-walled: bazi test'ler markup-level grep, page-level demo bypass.

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 }
};

async function gotoDemoCompany(page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('ht_ik_demo_mode', '1');
      localStorage.removeItem('ht_ik_company_state');
    } catch (e) { /* ignore */ }
  });
  await page.goto('/hr-company.html');
  await page.waitForLoadState('networkidle');
}

test.describe('Asama 86 Sprint D — IK Company', () => {
  test.describe('Markup-level (auth-walled bypass)', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'hr-company.html'), 'utf8');

    test('hr-company.html ik-shell + ik-company panel CSS yükler', () => {
      expect(html).toMatch(/<link[^>]*href=["'][^"']*ik-shell\.css/);
      expect(html).toMatch(/<link[^>]*href=["'][^"']*ik-company\.css/);
    });
    test('ik-company.js script tag mevcut', () => {
      expect(html).toMatch(/<script[^>]*src=["'][^"']*ik-company\.js/);
    });
    test('ik- prefix kullanır, eski hr-shell yok', () => {
      expect(html).not.toMatch(/hr-shell\.css/);
      expect(html).not.toMatch(/hr-forms\.css/);
      expect(html).toMatch(/data-ik-page=["']company["']/);
    });
    test('lp-hdr-ik header + segment nav var', () => {
      expect(html).toMatch(/class=["'][^"']*lp-hdr-ik\b/);
      expect(html).toMatch(/data-segment=["']anasayfa["']/);
      expect(html).toMatch(/data-segment=["']adaylar["']/);
      expect(html).toMatch(/data-segment=["']mesajlar["']/);
    });
    test('avatar dropdown 5 menu item icerir', () => {
      expect(html).toMatch(/href=["']hr-company\.html["']/);
      expect(html).toMatch(/href=["']hr-team\.html["']/);
      expect(html).toMatch(/href=["']hr-campaigns\.html["']/);
      expect(html).toMatch(/href=["']hr-settings\.html["']/);
      expect(html).toMatch(/id=["']ik-logout-btn["']/);
    });
    test('aria-current="page" Sirket profili dropdown linkinde', () => {
      expect(html).toMatch(/href=["']hr-company\.html["'][^>]*aria-current=["']page["']/);
    });
    test('skip link + WCAG semantic (#ik-company-shell)', () => {
      expect(html).toMatch(/class=["']ik-skip-link["'][^>]*href=["']#ik-company-shell["']/);
    });
  });

  test.describe('Hero + form structure', () => {
    test('hero render: eyebrow + headline + subline', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoCompany(page);
      await expect(page.locator('.ik-co-hero')).toHaveCount(1);
      await expect(page.locator('.ik-co-headline')).toContainText(/Şirket profili/i);
      await expect(page.locator('.ik-co-eyebrow')).toBeVisible();
      await expect(page.locator('.ik-co-subline')).toBeVisible();
    });
    test('demo notice gozukur', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoCompany(page);
      await expect(page.locator('#ik-co-notice')).toContainText(/Demo modunda/i);
    });
    test('3 section render: Genel + Marka + Iletisim', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoCompany(page);
      const sections = page.locator('.ik-co-section');
      await expect(sections).toHaveCount(3);
      await expect(page.locator('#ik-co-section-general')).toBeVisible();
      await expect(page.locator('#ik-co-section-brands')).toBeVisible();
      await expect(page.locator('#ik-co-section-contact')).toBeVisible();
    });
    test('Genel bilgi: 4 input + textarea', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoCompany(page);
      await expect(page.locator('#ik-co-name')).toBeVisible();
      await expect(page.locator('#ik-co-website')).toBeVisible();
      await expect(page.locator('#ik-co-sector')).toBeVisible();
      await expect(page.locator('#ik-co-region')).toBeVisible();
      await expect(page.locator('#ik-co-about')).toBeVisible();
    });
    test('Iletisim: 4 input', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoCompany(page);
      await expect(page.locator('#ik-co-contact-name')).toBeVisible();
      await expect(page.locator('#ik-co-contact-email')).toBeVisible();
      await expect(page.locator('#ik-co-contact-phone')).toBeVisible();
      await expect(page.locator('#ik-co-contact-role')).toBeVisible();
    });
    test('CTA bar: vazgec + kaydet', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoCompany(page);
      await expect(page.locator('#ik-co-reset')).toContainText(/Vazgeç/i);
      await expect(page.locator('#ik-co-save')).toContainText(/Profili kaydet/i);
    });
  });

  test.describe('Brand chips', () => {
    test('Brand input + ekle butonu render edilir', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoCompany(page);
      await expect(page.locator('#ik-co-brand-input')).toBeVisible();
      await expect(page.locator('#ik-co-brand-add')).toContainText(/Ekle/i);
    });
    test('Marka ekle: Enter ile chip olustu', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoCompany(page);
      await page.fill('#ik-co-brand-input', 'Mavi Jeans');
      await page.press('#ik-co-brand-input', 'Enter');
      await expect(page.locator('.ik-co-chip')).toHaveCount(1);
      await expect(page.locator('.ik-co-chip__label').first()).toContainText(/Mavi Jeans/i);
    });
    test('Marka cikar: × tiklayinca chip silinir', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoCompany(page);
      await page.fill('#ik-co-brand-input', 'Beymen');
      await page.press('#ik-co-brand-input', 'Enter');
      await expect(page.locator('.ik-co-chip')).toHaveCount(1);
      await page.click('.ik-co-chip__rm');
      await expect(page.locator('.ik-co-chip')).toHaveCount(0);
    });
    test('Duplicate marka eklenmez', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoCompany(page);
      await page.fill('#ik-co-brand-input', 'Sephora');
      await page.press('#ik-co-brand-input', 'Enter');
      await page.fill('#ik-co-brand-input', 'Sephora');
      await page.press('#ik-co-brand-input', 'Enter');
      await expect(page.locator('.ik-co-chip')).toHaveCount(1);
    });
    test('Virgulle birden fazla marka tek seferde eklenir', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoCompany(page);
      await page.fill('#ik-co-brand-input', 'Zara, Bershka, Pull&Bear');
      await page.press('#ik-co-brand-input', ',');
      await expect(page.locator('.ik-co-chip')).toHaveCount(3);
    });
  });

  test.describe('Validation + save', () => {
    test('Bos sirket adi error gosterir', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoCompany(page);
      await page.fill('#ik-co-name', '');
      await page.click('#ik-co-save');
      await expect(page.locator('#ik-co-msg')).toContainText(/zorunlu/i);
    });
    test('Gecersiz email format error', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoCompany(page);
      await page.fill('#ik-co-name', 'Demo Sirket');
      await page.fill('#ik-co-contact-email', 'gecersizemail');
      await page.click('#ik-co-save');
      await expect(page.locator('#ik-co-msg')).toContainText(/e-posta/i);
    });
    test('Gecerli payload kaydedilir, toast cikar', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoCompany(page);
      await page.fill('#ik-co-name', 'ABC Perakende A.Ş.');
      await page.click('#ik-co-save');
      await expect(page.locator('#ik-toast')).toHaveClass(/is-visible/);
      await expect(page.locator('#ik-co-msg')).toContainText(/kaydedildi/i);
    });
  });

  test.describe('About counter', () => {
    test('500 / 0 baslangic + input ile artar', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await gotoDemoCompany(page);
      await expect(page.locator('#ik-co-about-counter')).toContainText(/0 \/ 500/);
      await page.fill('#ik-co-about', 'Hello');
      await expect(page.locator('#ik-co-about-counter')).toContainText(/5 \/ 500/);
    });
  });

  test.describe('Dark mode', () => {
    test('Dark theme: hero + section + chip render', async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('ht_ik_demo_mode', '1');
        localStorage.setItem('ht_theme_preference', 'dark');
      });
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.goto('/hr-company.html');
      await page.waitForLoadState('networkidle');
      const themeAttr = await page.getAttribute('html', 'data-theme');
      expect(themeAttr).toBe('dark');
      await expect(page.locator('.ik-co-hero')).toBeVisible();
      await expect(page.locator('#ik-co-section-general')).toBeVisible();
    });
  });

  test.describe('Mobile viewport', () => {
    test('Mobile: hero + form responsive', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await gotoDemoCompany(page);
      await expect(page.locator('.ik-co-hero')).toBeVisible();
      await expect(page.locator('.ik-co-section')).toHaveCount(3);
    });
  });
});
