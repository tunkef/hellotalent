// auth-onboarding-flow.spec.js — Asama 84 smoke
// Auth-gated onboarding wizard yapısal kontroller (full E2E auth dışında).
// Auth flow tam E2E testi setup-employer dependency gerektirir; bu spec
// public-side (oturumsuz) davranışı doğrular: redirect + landing kaldırma + CTA.

const { test, expect } = require('@playwright/test');

test.describe('Asama 84 — auth-gated onboarding', () => {
  test('isveren-onboarding.html oturumsuzken giris.html?tab=ik adresine yönlendirir', async ({ page }) => {
    // Supabase clientı boot olur, getSession() boş döner → loadStateAndResume → redirect
    await page.goto('/isveren-onboarding.html');
    // Network idle bekle (Supabase auth init)
    await page.waitForLoadState('networkidle');
    // 5 saniyeye kadar redirect bekle
    await page.waitForURL(/\/giris\.html(\?.*)?$/, { timeout: 8000 }).catch(() => {});
    expect(page.url()).toMatch(/\/giris\.html(\?.*)?$/);
  });

  test('index.html hero CTA "Kurumsal hesap aç" → uye-ol.html?tab=kurumsal', async ({ page }) => {
    await page.goto('/index.html');
    // Kurumsal segmente geç
    await page.click('button.seg-btn[data-seg="kurumsal"]');
    await page.waitForTimeout(300);
    const heroCta = page.locator('a.btn.btn-verm[href="uye-ol.html?tab=kurumsal"]').first();
    await expect(heroCta).toBeVisible();
    await expect(heroCta).toHaveText(/Kurumsal hesap aç/);
  });

  test('isveren-onboarding.html landing parts (lf-hero, lf-social) kaldırılmış', async ({ page }) => {
    await page.goto('/isveren-onboarding.html');
    // lf-hero yok
    await expect(page.locator('section.lf-hero')).toHaveCount(0);
    // lf-social yok
    await expect(page.locator('section.lf-social')).toHaveCount(0);
    // lf-topnav var (premium minimal)
    await expect(page.locator('nav.lf-topnav')).toHaveCount(1);
  });

  test('isveren-onboarding.html welcome step (eski 1) kaldırılmış, step 1 = segment_type', async ({ page }) => {
    await page.goto('/isveren-onboarding.html');
    // obh-step--hero (welcome) kaldırılmış
    await expect(page.locator('.obh-step--hero')).toHaveCount(0);
    // Step 1 segment cards içerir
    const step1 = page.locator('.obh-step[data-step="1"]');
    await expect(step1).toHaveCount(1);
    await expect(step1.locator('.obh-card[data-segment]')).toHaveCount(4);
  });

  test('isveren-onboarding.html toplam 8 step + success', async ({ page }) => {
    await page.goto('/isveren-onboarding.html');
    // 8 numaralı step + success
    for (let i = 1; i <= 8; i++) {
      await expect(page.locator(`.obh-step[data-step="${i}"]`)).toHaveCount(1);
    }
    await expect(page.locator('.obh-step[data-step="success"]')).toHaveCount(1);
    await expect(page.locator('.obh-step[data-step="9"]')).toHaveCount(0);
  });

  test('isveren-onboarding.html step counter "1 / 8"', async ({ page }) => {
    await page.goto('/isveren-onboarding.html');
    const counter = page.locator('#obh-counter');
    await expect(counter).toContainText('/ 8');
  });

  test('isveren-onboarding.html logout button mevcut', async ({ page }) => {
    await page.goto('/isveren-onboarding.html');
    const logoutBtn = page.locator('#obh-logout');
    await expect(logoutBtn).toHaveCount(1);
    await expect(logoutBtn).toContainText(/Çıkış/);
  });

  test('uye-ol.html?tab=kurumsal kurumsal tab açık geliyor', async ({ page }) => {
    await page.goto('/uye-ol.html?tab=kurumsal');
    await page.waitForLoadState('networkidle');
    const kForm = page.locator('#form-kurumsal');
    await expect(kForm).toBeVisible({ timeout: 5000 });
    // Kurumsal tab aktif
    await expect(page.locator('#tab-kurumsal')).toHaveClass(/active-ik/);
  });

  test('admin.html "Kurumsal Onboarding" navItem mevcut (oturumsuz - DOM kontrolü)', async ({ page }) => {
    await page.goto('/admin.html');
    // Auth wall login modalı açar ama nav DOM'da render olur
    const navItem = page.locator('.nav-item[data-panel="hr-signups"]');
    await expect(navItem).toContainText(/Kurumsal Onboarding/);
  });
});
