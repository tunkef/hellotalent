// tests/lead-form.spec.js
//
// Lead form (isveren-onboarding.html + isveren-demo-yakinda.html) E2E matrix.
// Multi-agent zincir test gate'i (chief-of-staff orchestration, 25 Nisan 2026).
//
// Matrix: 4 viewport × 2 theme × 4 senaryo = 32 test.
//
// Senaryolar:
//   1. load          — sayfa yüklenir, hero görünür, topbar/progress/copy doğru
//   2. validation    — required step error mesajı, Devam butonu engellenir
//   3. full-flow     — 1→9 boyunca tüm cevaplar girilir, mock submit
//   4. mobile-svg    — <=480px gizli, >480px görünür (cream stroke)
//
// Çalıştır: npx playwright test tests/lead-form.spec.js --reporter=list
// playwright.config.js webServer otomatik python3 -m http.server 3000 açar.

const { test, expect } = require('@playwright/test');

const VIEWPORTS = [
  { name: 'mobile-390',   width: 390,  height: 844  },
  { name: 'tablet-768',   width: 768,  height: 1024 },
  { name: 'laptop-1100',  width: 1100, height: 800  },
  { name: 'desktop-1440', width: 1440, height: 900  },
];

const THEMES = ['light', 'dark'];

// Edge Function mock — gerçek aday inserti riskli (PII, DB kirliliği)
async function mockEdgeFn(page) {
  await page.route('**/functions/v1/notify-hr-lead', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        demo_token: '00000000-0000-0000-0000-' + String(Date.now()).padStart(12, '0'),
      }),
    });
  });
}

async function setTheme(page, theme) {
  // addInitScript: her navigation'dan ÖNCE çalışır. DOM henüz yok olduğu için
  // documentElement'i hemen değil, ilk script çalışmasında <html>'e attribute koy.
  await page.addInitScript((t) => {
    try {
      // documentElement her zaman var (HTMLDocument.documentElement)
      if (document && document.documentElement) {
        document.documentElement.setAttribute('data-theme', t);
      } else {
        // fallback — HTML parse'a kadar bekle
        document.addEventListener('readystatechange', function once(){
          if (document.documentElement) {
            document.documentElement.setAttribute('data-theme', t);
            document.removeEventListener('readystatechange', once);
          }
        });
      }
    } catch (_) {}
  }, theme);
}

async function ensureTheme(page, theme) {
  // goto sonrası net set — race-condition guard
  await page.evaluate((t) => {
    document.documentElement.setAttribute('data-theme', t);
  }, theme);
}

for (const vp of VIEWPORTS) {
  for (const theme of THEMES) {
    test.describe(`lead-form · ${vp.name} · ${theme}`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test.beforeEach(async ({ page }) => {
        await setTheme(page, theme);
        await mockEdgeFn(page);
      });

      // ── 1. LOAD ─────────────────────────────────────────────────
      test('load: landing+wizard yüklenir, sticky nav + progress doğru', async ({ page }) => {
        await page.goto('/isveren-onboarding.html');
        await ensureTheme(page, theme);

        // Landing layer — yeni mimari
        const topnav = page.locator('.lf-topnav');
        await expect(topnav).toBeVisible();
        await expect(topnav.locator('.lf-logo')).toContainText('HelloTalent');
        await expect(topnav.locator('#lf-counter')).toContainText('Adım 1 / 9');

        // Hero section — landing intro
        const lfHero = page.locator('.lf-hero');
        await expect(lfHero).toBeVisible();
        await expect(lfHero.locator('.lf-hero__h1')).toContainText('Türkiye perakendesinin');
        await expect(lfHero.locator('.lf-hero__h1 em')).toContainText('aday tarafı');
        await expect(lfHero.locator('.lf-hero__kpi')).toContainText('KVKK');

        // Wizard step 1 — kart içi welcome panel (kısa, çift hero değil)
        const wizardHero = page.locator('.obh-step--hero.is-active');
        await expect(wizardHero).toBeVisible();
        await expect(wizardHero.locator('.obh-hero-h1')).toContainText('Hazırsanız başlayalım');
        await expect(wizardHero.locator('.obh-btn--hero-primary')).toHaveText(/Soruları başlat/);
        await expect(wizardHero.locator('.obh-hero-bullets')).toContainText(/KVKK/);

        // Wizard step counter (kart içi)
        await expect(page.locator('#obh-counter')).toHaveText('1 / 9');

        // Social proof + footer landing layer'ında render
        await expect(page.locator('.lf-social .lf-quote').first()).toBeVisible();
        await expect(page.locator('.lf-footer__brand')).toContainText('HelloTalent');

        // Theme attribute doğru set
        const dt = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
        expect(dt).toBe(theme);
      });

      // ── 1b. ANCHOR SCROLL — Hero CTA → Form section ─────────────
      test('anchor-scroll: hero CTA tıklayınca form section görünür', async ({ page }) => {
        await page.goto('/isveren-onboarding.html');
        await ensureTheme(page, theme);

        await page.click('.lf-hero .lf-cta-primary');
        // smooth scroll bekle
        await page.waitForTimeout(700);

        const formSec = page.locator('#basvuru');
        await expect(formSec).toBeInViewport({ ratio: 0.2 });
      });

      // ── 2. VALIDATION ────────────────────────────────────────────
      test('validation: required step error gösterir', async ({ page }) => {
        await page.goto('/isveren-onboarding.html');
        await ensureTheme(page, theme);

        // Hero → Step 2
        await page.click('.obh-btn--hero-primary');
        await expect(page.locator('.obh-step[data-step="2"]')).toBeVisible();

        // Step 2 — boş Devam → error
        await page.click('.obh-step[data-step="2"] [data-action="next"]');
        await expect(page.locator('#err-segment')).toHaveClass(/is-shown/);

        // Hala step 2'de
        await expect(page.locator('.obh-step[data-step="2"]')).toBeVisible();
        await expect(page.locator('.obh-step[data-step="3"]')).toBeHidden();

        // Bir kart seç → step 3'e geç
        await page.click('.obh-card[data-segment="single_brand"]');
        await page.click('.obh-step[data-step="2"] [data-action="next"]');
        await expect(page.locator('.obh-step[data-step="3"]')).toBeVisible();
      });

      // ── 3. FULL FLOW ─────────────────────────────────────────────
      test('full-flow: 1→9 doldur, mock submit, success', async ({ page }) => {
        test.setTimeout(60000);
        await page.goto('/isveren-onboarding.html');
        await ensureTheme(page, theme);

        // 1 hero
        await page.click('.obh-btn--hero-primary');
        // 2 segment
        await page.click('.obh-card[data-segment="holding"]');
        await page.click('.obh-step[data-step="2"] [data-action="next"]');
        // 3 contact
        await page.fill('#f-company', 'Playwright Holding');
        await page.fill('#f-fullname', 'Test Yılmaz');
        await page.fill('#f-email', `pw-${Date.now()}@hellotalent.local`);
        await page.click('.obh-step[data-step="3"] [data-action="next"]');
        // 4 brand skip
        await page.click('.obh-step[data-step="4"] [data-action="skip"]');
        // 5 team
        await page.click('.obh-chip[data-team="2-5"]');
        await page.click('.obh-step[data-step="5"] [data-action="next"]');
        // 6 positions skip
        await page.click('.obh-step[data-step="6"] [data-action="skip"]');
        // 7 monthly
        await page.click('.obh-chip[data-monthly="4-10"]');
        await page.click('.obh-step[data-step="7"] [data-action="next"]');
        // 8 urgency skip
        await page.click('.obh-step[data-step="8"] [data-action="skip"]');
        // 9 consent + submit
        await expect(page.locator('.obh-step[data-step="9"]')).toBeVisible();
        await page.fill('#f-phone', '0555 123 4567');
        await page.check('#f-marketing');

        const respPromise = page.waitForResponse((r) => r.url().includes('/functions/v1/notify-hr-lead'));
        await page.click('#obh-submit');
        const resp = await respPromise;
        expect(resp.status()).toBe(200);

        const json = await resp.json();
        expect(json.demo_token).toBeTruthy();

        await expect(page.locator('.obh-step[data-step="success"]')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('.obh-step[data-step="success"] .obh-h1')).toHaveText(/Teşekkürler/);
      });

      // ── 4. MOBILE SVG ────────────────────────────────────────────
      test('mobile-svg: <=480 gizli, >480 cream stroke görünür', async ({ page }) => {
        await page.goto('/isveren-onboarding.html');
        const mark = page.locator('.obh-hero-mark');

        if (vp.width <= 480) {
          await expect(mark).toBeHidden();
        } else {
          await expect(mark).toBeVisible();
          const stroke = await mark.locator('circle').getAttribute('stroke');
          expect(stroke).toBe('#F2F1EE');
        }
      });
    });
  }
}
