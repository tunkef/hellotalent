var { test, expect } = require('@playwright/test');

/**
 * Asama 84.2 — Clatu Master Layout Consistency
 * (Asama 84.1 v2 ROLLBACK sonrası — index.html master pattern align)
 *
 * Hedef: 3 HR/auth sayfası (giris, uye-ol, isveren-onboarding) index.html'in
 * birebir aynı header (.lp-hdr) + footer (.ht-foot) + lp-logo markup'ını mı
 * kullanıyor?
 *
 * Yasak: hr-page-header / hr-page-footer / clatu-hr-*.css import.
 * Hard-block: 'Kurumsal başvuru' subtitle isveren-onboarding'de YOK.
 *
 * Kapsam:
 * - 3 sayfa
 * - 4 viewport (390/768/1024/1440)
 * - master pattern selector match (index ile aynı)
 */

// NOT: isveren-onboarding auth-gated — page.goto'da JS redirect /giris.html'e atar.
// Bu spec public sayfaları test eder. isveren-onboarding için ayrı auth-mock test sprint'e bırakıldı.
var STANDARDIZED_PAGES = [
  { path: '/giris.html',  rightSlotText: /Hesabın yok mu/ },
  { path: '/uye-ol.html', rightSlotText: /Hesabın var mı/ }
];

var VIEWPORTS = [
  { name: 'mobile',  width: 390,  height: 844  },
  { name: 'tablet',  width: 768,  height: 1024 },
  { name: 'laptop',  width: 1024, height: 768  },
  { name: 'desktop', width: 1440, height: 900  }
];

STANDARDIZED_PAGES.forEach(function(p) {
  test.describe('Clatu Master Layout: ' + p.path, function() {

    test('header.lp-hdr markup mevcut (index master pattern)', async function({ page }) {
      await page.goto(p.path, { waitUntil: 'domcontentloaded' });
      var header = page.locator('header.lp-hdr');
      await expect(header).toHaveCount(1);
      await expect(header).toBeVisible();
    });

    test('lp-logo doğru markup ve href (index master pattern)', async function({ page }) {
      await page.goto(p.path, { waitUntil: 'domcontentloaded' });
      var logo = page.locator('header.lp-hdr a.lp-logo');
      await expect(logo).toHaveCount(1);
      await expect(logo).toHaveAttribute('href', 'index.html');
      await expect(logo).toContainText(/hello/);
      await expect(logo).toContainText(/talent/);
    });

    test('lp-logo em tag içeriyor (markup parite — index master)', async function({ page }) {
      await page.goto(p.path, { waitUntil: 'domcontentloaded' });
      var em = page.locator('header.lp-hdr a.lp-logo em').first();
      await expect(em).toHaveCount(1);
      await expect(em).toContainText(/talent/);
    });

    test('lp-cta sağ slot doğru içerik (sayfa-spesifik)', async function({ page }) {
      await page.goto(p.path, { waitUntil: 'domcontentloaded' });
      var right = page.locator('header.lp-hdr .lp-cta');
      await expect(right).toHaveCount(1);
      await expect(right).toContainText(p.rightSlotText);
    });

    test('footer YOK (auth sayfaları endustri standardi: Stripe/Linear/Notion pattern)', async function({ page }) {
      await page.goto(p.path, { waitUntil: 'domcontentloaded' });
      var footer = page.locator('footer.ht-foot');
      await expect(footer).toHaveCount(0);
    });

    test('shared-v2.css yüklenmiş (index master fonts + tokens)', async function({ page }) {
      await page.goto(p.path, { waitUntil: 'domcontentloaded' });
      var hasMaster = await page.evaluate(function() {
        return Array.prototype.some.call(
          document.querySelectorAll('link[rel="stylesheet"]'),
          function(l) { return /shared-v2\.css/.test(l.href); }
        );
      });
      expect(hasMaster).toBe(true);
    });

    test('clatu-hr-*.css import EDİLMEMİŞ (Asama 84.2 rollback)', async function({ page }) {
      await page.goto(p.path, { waitUntil: 'domcontentloaded' });
      var hasOldCss = await page.evaluate(function() {
        return Array.prototype.some.call(
          document.querySelectorAll('link[rel="stylesheet"]'),
          function(l) { return /clatu-hr-(tokens|components)\.css/.test(l.href); }
        );
      });
      expect(hasOldCss).toBe(false);
    });

    test('hr-page-header/hr-page-footer markup YOK (Asama 84.2 rollback)', async function({ page }) {
      await page.goto(p.path, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('header.hr-page-header')).toHaveCount(0);
      await expect(page.locator('footer.hr-page-footer')).toHaveCount(0);
    });

    test('body font-family Plus Jakarta Sans (master pattern)', async function({ page }) {
      await page.goto(p.path, { waitUntil: 'domcontentloaded' });
      var fontFam = await page.evaluate(function() {
        return window.getComputedStyle(document.body).fontFamily;
      });
      expect(fontFam).toMatch(/Plus Jakarta Sans/);
    });

    test('lp-logo font-family Bricolage Grotesque (master pattern)', async function({ page }) {
      await page.goto(p.path, { waitUntil: 'domcontentloaded' });
      var fontFam = await page.evaluate(function() {
        var el = document.querySelector('header.lp-hdr a.lp-logo');
        return el ? window.getComputedStyle(el).fontFamily : '';
      });
      expect(fontFam).toMatch(/Bricolage Grotesque/);
    });

    VIEWPORTS.forEach(function(vp) {
      test('viewport ' + vp.name + ' (' + vp.width + 'x' + vp.height + ') header görünür', async function({ page }) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(p.path, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('header.lp-hdr')).toBeVisible();
        await expect(page.locator('header.lp-hdr a.lp-logo').first()).toBeVisible();
      });
    });
  });
});

/* ═══════════════════════════════════════════════════════════
   REGRESSION GUARD — isveren-onboarding "Kurumsal başvuru"
   Tuna feedback (2026-04-25): subtitle KALDIRILDI, geri gelmesin.
   NOT: isveren-onboarding auth-gated — page.goto'da redirect olur.
   Markup-level regression için file-system grep test yapılır
   (page render'a bağımsız, kesin sonuç).
   ═══════════════════════════════════════════════════════════ */
var fs = require('fs');
var path = require('path');

test.describe('Regression: isveren-onboarding subtitle (markup-level)', function() {

  var ONBOARDING_HTML;
  test.beforeAll(function() {
    ONBOARDING_HTML = fs.readFileSync(
      path.join(__dirname, '..', 'isveren-onboarding.html'),
      'utf8'
    );
  });

  test('Header görünür markup içinde "Kurumsal başvuru" subtitle YOK', function() {
    // Sadece header'a render edilen text — aria-label ve yorumlar dışında.
    // header.lp-hdr ... </header> arasında "Kurumsal başvuru" görünür text aranır.
    var headerMatch = ONBOARDING_HTML.match(/<header class="lp-hdr"[\s\S]*?<\/header>/);
    if (headerMatch) {
      // Yorumları temizle
      var headerClean = headerMatch[0].replace(/<!--[\s\S]*?-->/g, '');
      expect(headerClean).not.toMatch(/Kurumsal başvuru/);
    }
  });

  test('lp-logo ::after "Kurumsal" pseudo content yok (CSS-level)', function() {
    // CSS'te lp-logo:after { content: "Kurumsal..." } pattern aranır
    var styleMatch = ONBOARDING_HTML.match(/<style[\s\S]*?<\/style>/g) || [];
    styleMatch.forEach(function(block) {
      // Yorumları temizle
      var clean = block.replace(/\/\*[\s\S]*?\*\//g, '');
      expect(clean).not.toMatch(/lp-logo[^{]*::?after[^}]*content[^}]*Kurumsal/i);
    });
  });

  test('Step counter "Adım" markup mevcut (header lp-hdr-mid)', function() {
    expect(ONBOARDING_HTML).toMatch(/lp-hdr-mid[\s\S]*Adım/);
  });

  test('Çıkış butonu lp-cta içinde mevcut', function() {
    expect(ONBOARDING_HTML).toMatch(/lp-cta[\s\S]*?(Çıkış|obh-logout)/);
  });

  test('shared-v2.css import edilmiş', function() {
    expect(ONBOARDING_HTML).toMatch(/shared-v2\.css/);
  });

  test('clatu-hr-*.css import EDİLMEMİŞ (Asama 84.2 rollback)', function() {
    // Sadece <link rel="stylesheet" href=...clatu-hr-...> aranır, yorum değil.
    expect(ONBOARDING_HTML).not.toMatch(/<link[^>]*href=["'][^"']*clatu-hr-(tokens|components)\.css/);
  });

  test('hr-page-header / hr-page-footer markup YOK', function() {
    expect(ONBOARDING_HTML).not.toMatch(/class=["']hr-page-header["']/);
    expect(ONBOARDING_HTML).not.toMatch(/class=["']hr-page-footer["']/);
  });
});
