/**
 * Pass 10 #12 — Pre-deploy local smoke
 * Target: shared-v2.css commit c8c0768 — .stories.verm bg #C94E28 → #A83F1E
 * Scope: kurumsal story section, 4 viewport×tema kombinasyonu
 * Server: http://localhost:3000 (playwright.config webServer)
 *
 * NOTE: Mobile UX tasarımı gereği .stories-grid.is-collapsed .story:nth-child(n+3) { display:none }
 * Mobile'da Orkun (3. kart) CSS ile collapse edilir — bu beklenen davranış.
 * innerText okuyamaz; DOM innerHTML üzerinden kontrol edilir.
 */
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = path.resolve(
  __dirname,
  '../.claude/agent-memory/visual-diff/pass10-12-predeploy'
);

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const BASE_URL = process.env.PW_TARGET_URL || 'http://localhost:3000';

// Expected verm-dark color: #A83F1E = rgb(168, 63, 30)
const VERM_DARK_RGB = { r: 168, g: 63, b: 30 };

async function goKurumsal(page) {
  await page.goto(`${BASE_URL}/index.html#kurumsal`, {
    waitUntil: 'domcontentloaded',
    timeout: 15000,
  });
  await page.waitForTimeout(600);
}

async function applyTheme(page, theme) {
  await page.evaluate((t) => {
    const html = document.documentElement;
    html.setAttribute('data-theme', t);
    if (t === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
    try { localStorage.setItem('theme', t); } catch (_) {}
  }, theme);
  await page.waitForTimeout(300);
}

async function scrollToStories(page) {
  await page.evaluate(() => {
    const el = document.querySelector('.stories.verm') ||
                document.querySelector('section.stories.verm');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await page.waitForTimeout(400);
}

async function checkStoriesBg(page) {
  return await page.evaluate(() => {
    const section = document.querySelector('.stories.verm');
    if (!section) return null;
    return window.getComputedStyle(section).backgroundColor;
  });
}

function parseRGB(cssColor) {
  const m = cssColor && cssColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  return { r: parseInt(m[1]), g: parseInt(m[2]), b: parseInt(m[3]) };
}

function isVermDark(rgb) {
  if (!rgb) return false;
  // Tolerance ±5 for OS/browser gamma differences
  return (
    Math.abs(rgb.r - VERM_DARK_RGB.r) <= 5 &&
    Math.abs(rgb.g - VERM_DARK_RGB.g) <= 5 &&
    Math.abs(rgb.b - VERM_DARK_RGB.b) <= 5
  );
}

// ─── TEST MATRIX: 2 viewports × 2 themes ────────────────────────
const MATRIX = [
  { label: 'mobile-light', vp: { width: 390, height: 844 }, theme: 'light', isMobile: true },
  { label: 'mobile-dark',  vp: { width: 390, height: 844 }, theme: 'dark',  isMobile: true },
  { label: 'desktop-light', vp: { width: 1440, height: 900 }, theme: 'light', isMobile: false },
  { label: 'desktop-dark',  vp: { width: 1440, height: 900 }, theme: 'dark',  isMobile: false },
];

for (const { label, vp, theme, isMobile } of MATRIX) {
  test.describe(`Pass10 #12 — ${label}`, () => {
    test.use({ viewport: vp });

    test(`kurumsal story render — ${label}`, async ({ page }) => {
      await goKurumsal(page);
      await applyTheme(page, theme);
      await scrollToStories(page);

      // 1. .stories.verm section exists
      const storiesSection = page.locator('.stories.verm');
      await expect(storiesSection, '.stories.verm section bulunamadi').toBeVisible();

      // 2. DOM'da 3 hikaye ismi var mı (innerHTML — mobile collapsed'ı bypass eder)
      // Mobile UX: Orkun (3. kart) is-collapsed ile display:none olur — innerText okuyamaz
      // Doğru kontrol: innerHTML içinde isim var mı (DOM'da mevcut, sadece gizli)
      const domHTML = await page.evaluate(() => {
        const s = document.querySelector('.stories.verm');
        return s ? s.innerHTML : '';
      });
      for (const name of ['Defne', 'Burak', 'Orkun']) {
        expect(domHTML, `${name} ismi .stories.verm DOM'unda yok (regression olabilir)`).toContain(name);
      }

      // 3. Visible kartlar: mobile'da ≥2, desktop'ta ≥3
      const visibleStories = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.stories.verm .story'))
          .filter(el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden';
          }).length;
      });
      const minVisible = isMobile ? 2 : 3;
      console.log(`[${label}] görünür story kart sayısı: ${visibleStories}`);
      expect(
        visibleStories,
        `Görünür kart sayısı beklenenin altında: ${visibleStories} < ${minVisible}`
      ).toBeGreaterThanOrEqual(minVisible);

      // 4. Story portreleri (img) DOM'da en az 3 adet
      const portraits = page.locator('.stories.verm .story-portrait img');
      const portraitCount = await portraits.count();
      expect(portraitCount, 'DOM\'da en az 3 portre img bekleniyor').toBeGreaterThanOrEqual(3);

      // 5. Broken image check (tüm img'ler, collapsed dahil)
      const broken = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.stories.verm .story-portrait img'))
          .filter(img => !img.complete || img.naturalWidth === 0)
          .map(img => img.getAttribute('src'));
      });
      expect(broken, `Kırık portre img: ${broken.join(', ')}`).toHaveLength(0);

      // 6. Bg rengi #A83F1E (verm-dark) — commit c8c0768 hedef değişim
      const bgColor = await checkStoriesBg(page);
      const rgb = parseRGB(bgColor);
      console.log(`[${label}] .stories.verm bg: ${bgColor} → parsed:`, rgb);
      expect(
        isVermDark(rgb),
        `bg rengi #A83F1E (verm-dark) olmali — alınan: ${bgColor}`
      ).toBe(true);

      // 7. Screenshot kaydet
      const screenshotPath = path.join(SCREENSHOT_DIR, `${label}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`[${label}] screenshot: ${screenshotPath}`);
    });
  });
}

// ─── SIDE-EFFECT: Diğer section'larda .verm bg yanlışlıkla override var mı ─
test.describe('Pass10 #12 — Side-effect check', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('yalnızca .stories.verm section verm-dark bg alıyor', async ({ page }) => {
    await goKurumsal(page);

    const allStories = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.stories')).map(el => ({
        classes: el.className,
        bg: window.getComputedStyle(el).backgroundColor,
      }));
    });

    console.log('Tüm .stories section\'ları:', JSON.stringify(allStories, null, 2));

    const vermSections = allStories.filter(s => s.classes.split(' ').includes('verm'));
    const nonVermSections = allStories.filter(s => !s.classes.split(' ').includes('verm'));

    for (const s of vermSections) {
      const rgb = parseRGB(s.bg);
      expect(
        isVermDark(rgb),
        `.stories.verm section verm-dark bg almıyor: ${s.bg}`
      ).toBe(true);
    }

    for (const s of nonVermSections) {
      const rgb = parseRGB(s.bg);
      expect(
        isVermDark(rgb),
        `Yan etki: .stories (verm sınıfsız) yanlışlıkla verm-dark bg aldı: ${s.bg}`
      ).toBe(false);
    }
  });
});
