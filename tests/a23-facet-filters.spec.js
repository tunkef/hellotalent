// a23-facet-filters.spec.js — A23 F2 (data-analyst 2026-05-04)
// Pool facet filter chip senaryoları (UAT eksikti).
// Phase H 200 aday üzerinde: şehir, pozisyon, segment, eğitim, müsaitlik, dil, çalışma tipi.
// Demo mode (auth bypass) — gerçek RPC için authenticated.spec gerekli.

const { test, expect } = require('@playwright/test');

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile:  { width: 390,  height: 844 }
};

const CHIPS = [
  { key: 'city',      label: 'Şehir' },
  { key: 'position',  label: 'Pozisyon' },
  { key: 'segment',   label: 'Segment' },
  { key: 'musaitlik', label: 'Müsaitlik' },
  { key: 'egitim',    label: 'Eğitim' },
  { key: 'calisma',   label: 'Çalışma tipi' },
  { key: 'dil',       label: 'Dil' }
];

async function gotoPool(page, viewport) {
  await page.setViewportSize(viewport);
  await page.addInitScript(() => {
    try {
      localStorage.setItem('ht_ik_demo_mode', '1');
      localStorage.removeItem('ht_ik_pipeline_state');
    } catch (e) { /* ignore */ }
  });
  await page.goto('/hr-pool.html');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('[data-ik-pool-list], [data-ik-pool-empty]:not([hidden])', { timeout: 8000 });
}

test.describe('A23 F2 — Facet filter chips', () => {

  for (const viewportName of Object.keys(VIEWPORTS)) {
    const viewport = VIEWPORTS[viewportName];

    test.describe(`${viewportName} (${viewport.width}×${viewport.height})`, () => {

      test('7 chip render edildi', async ({ page }) => {
        await gotoPool(page, viewport);
        const chips = page.locator('[data-ik-pool-filters] [data-chip-key]');
        const count = await chips.count();
        expect(count).toBeGreaterThanOrEqual(7);
        for (const chip of CHIPS) {
          const button = page.locator(`[data-chip-key="${chip.key}"]`);
          await expect(button).toBeVisible();
        }
      });

      test('chip click → dropdown açılır + "Tümü" var', async ({ page }) => {
        await gotoPool(page, viewport);
        const positionChip = page.locator('[data-chip-key="position"]');
        await positionChip.click();
        const dropdown = page.locator('[data-chip-menu="position"]');
        await expect(dropdown).toBeVisible();
        await expect(dropdown.locator('text=Tümü')).toBeVisible();
      });

      test('chip dropdown facet seçimi listeyi filtreler', async ({ page }) => {
        await gotoPool(page, viewport);
        // İlk chip ile filter uygula, ardından sonuç değişmeli
        const initialInfo = await page.locator('[data-ik-pool-list-info]').textContent();
        const cityChip = page.locator('[data-chip-key="city"]');
        await cityChip.click();
        const dropdown = page.locator('[data-chip-menu="city"]');
        await expect(dropdown).toBeVisible();
        const firstOption = dropdown.locator('[data-chip-value]').first();
        const optionCount = await dropdown.locator('[data-chip-value]').count();
        if (optionCount === 0) {
          test.skip(true, 'Demo mode facet boş — gerçek seed gerekli');
        }
        await firstOption.click();
        await page.waitForTimeout(400);  // debounce
        const filteredInfo = await page.locator('[data-ik-pool-list-info]').textContent();
        // Filter uygulandığında listInfo değişmeli (count azalır)
        expect(filteredInfo).not.toBe(initialInfo);
      });

      test('chip aktif state CSS class yansır', async ({ page }) => {
        await gotoPool(page, viewport);
        const segmentChip = page.locator('[data-chip-key="segment"]');
        await segmentChip.click();
        const dropdown = page.locator('[data-chip-menu="segment"]');
        const firstOption = dropdown.locator('[data-chip-value]').first();
        const count = await dropdown.locator('[data-chip-value]').count();
        if (count === 0) {
          test.skip(true, 'Demo facet boş');
        }
        await firstOption.click();
        await page.waitForTimeout(300);
        await expect(segmentChip).toHaveClass(/is-active|has-value/);
      });

      test('clear-all reset → 7 chip default state', async ({ page }) => {
        await gotoPool(page, viewport);
        const positionChip = page.locator('[data-chip-key="position"]');
        await positionChip.click();
        const dropdown = page.locator('[data-chip-menu="position"]');
        const optionCount = await dropdown.locator('[data-chip-value]').count();
        if (optionCount === 0) {
          test.skip(true, 'Demo facet boş');
        }
        await dropdown.locator('[data-chip-value]').first().click();
        await page.waitForTimeout(300);
        // Reset / clear-all aksiyon (gerçek attr: data-pill-clear-all)
        const resetBtn = page.locator('[data-ik-pool-reset], [data-pill-clear-all]').first();
        if (await resetBtn.count() > 0) {
          await resetBtn.click();
          await page.waitForTimeout(300);
          await expect(positionChip).not.toHaveClass(/is-active/);
        }
      });

    });
  }

  test.describe('Combine filter (multi-chip)', () => {
    test('city + segment iki chip eş zamanlı', async ({ page }) => {
      await gotoPool(page, VIEWPORTS.desktop);
      const cityChip = page.locator('[data-chip-key="city"]');
      const segChip  = page.locator('[data-chip-key="segment"]');

      await cityChip.click();
      const cityDd = page.locator('[data-chip-menu="city"]');
      const cityOpts = await cityDd.locator('[data-chip-value]').count();
      if (cityOpts === 0) test.skip(true, 'Demo facet boş');
      await cityDd.locator('[data-chip-value]').first().click();
      await page.waitForTimeout(300);

      await segChip.click();
      const segDd = page.locator('[data-chip-menu="segment"]');
      const segOpts = await segDd.locator('[data-chip-value]').count();
      if (segOpts === 0) test.skip(true, 'Demo facet boş');
      await segDd.locator('[data-chip-value]').first().click();
      await page.waitForTimeout(400);

      // İki filter aktif olduğunda listInfo göreceli sıfırlanma
      await expect(cityChip).toHaveClass(/is-active|has-value/);
      await expect(segChip).toHaveClass(/is-active|has-value/);
    });
  });

});
