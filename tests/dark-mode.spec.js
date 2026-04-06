var test = require('@playwright/test').test;
var expect = require('@playwright/test').expect;
var fs = require('fs');
var path = require('path');

function readFromRepo(relPath) {
  return fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
}

test.describe('Dark mode system — profil.html', function () {
  var profilHtml;
  var profilCss;
  var tokensCss;
  var profilCoreJs;

  test.beforeAll(function () {
    profilHtml = readFromRepo('profil.html');
    // Kademe 1: CSS is split across multiple files. Concatenate all for test assertions.
    var cssFiles = [
      'profil.css',
      'css/tokens.css',
      'css/layout.css',
      'css/components.css',
      'css/wizard.css',
      'css/panels/genel-bakis.css',
      'css/panels/merkezi.css',
      'css/panels/sirketler.css'
    ];
    profilCss = '';
    cssFiles.forEach(function (f) {
      try { profilCss += readFromRepo(f); } catch (e) { /* file may not exist yet */ }
    });
    tokensCss = '';
    try { tokensCss = readFromRepo('css/tokens.css'); } catch (e) {}
    profilCoreJs = readFromRepo('profil-core.js');
  });

  // 1. Pre-paint bootstrap exists in <head>
  test('pre-paint theme bootstrap inline script in <head>', function () {
    var headEnd = profilHtml.indexOf('</head>');
    var headSection = profilHtml.substring(0, headEnd);
    // Must contain inline script that sets data-theme before CSS loads
    expect(headSection).toContain('ht_theme_preference');
    expect(headSection).toContain("setAttribute('data-theme'");
    // Must come before first <link rel="stylesheet">
    var bootstrapIdx = headSection.indexOf('ht_theme_preference');
    var firstCssLink = headSection.indexOf('fonts.googleapis.com');
    expect(bootstrapIdx).toBeLessThan(firstCssLink);
  });

  // 2. meta theme-color tag exists
  test('meta theme-color tag present and synced', function () {
    expect(profilHtml).toContain('name="theme-color"');
    expect(profilHtml).toContain('id="meta-theme-color"');
    // profil-core.js updates it on theme change
    expect(profilCoreJs).toContain('meta-theme-color');
  });

  // 3. color-scheme CSS property set (tokens.css or profil.css)
  test('CSS color-scheme property in :root and dark', function () {
    var allCss = profilCss + tokensCss;
    expect(allCss).toContain('color-scheme: light');
    expect(allCss).toContain('color-scheme: dark');
  });

  // 4. data-theme="dark" token block exists with key tokens (tokens.css or profil.css)
  test('dark theme token block defines critical semantic tokens', function () {
    // Check tokens.css first (Kademe 0+), fall back to profil.css (legacy)
    var src = tokensCss || profilCss;
    var darkIdx = src.indexOf('html[data-theme="dark"]');
    var darkBlock = src.substring(
      darkIdx,
      src.indexOf('}', darkIdx + 50) + 1
    );
    expect(darkBlock).toContain('--bg-app:');
    expect(darkBlock).toContain('--bg-surface:');
    expect(darkBlock).toContain('--text-primary:');
    expect(darkBlock).toContain('--text-muted:');
    expect(darkBlock).toContain('--border-subtle:');
    expect(darkBlock).toContain('--input-bg:');
  });

  // 5. Command palette modal uses token, not hardcoded white
  test('command palette modal uses var(--bg-surface), not hardcoded white', function () {
    var cmdkArea = profilHtml.substring(
      profilHtml.indexOf('modal-cmdk'),
      profilHtml.indexOf('cmdk-results') + 200
    );
    expect(cmdkArea).not.toContain('background:white');
    expect(cmdkArea).toContain('--bg-surface');
  });

  // 6. Account wizard overlay uses token
  test('account wizard overlay uses var(--bg-surface), not hardcoded white', function () {
    var wizArea = profilHtml.substring(
      profilHtml.indexOf('account-wizard-overlay'),
      profilHtml.indexOf('account-wizard-overlay') + 500
    );
    expect(wizArea).not.toContain('background:white');
    expect(wizArea).toContain('--bg-surface');
  });

  // 7. Preview drawer uses token in CSS
  test('preview drawer (pp-drawer) background uses token', function () {
    var ppIdx = profilCss.indexOf('.pp-drawer');
    var ppBlock = profilCss.substring(ppIdx, ppIdx + 300);
    expect(ppBlock).not.toContain('background: #ffffff');
    expect(ppBlock).toContain('--bg-surface');
  });

  // 8. Markalar panel key elements use tokens
  test('markalar panel: follow counter, search, seg-pill use bg-surface token', function () {
    // Follow counter
    var fcIdx = profilCss.indexOf('.brand-follow-counter');
    var fcBlock = profilCss.substring(fcIdx, fcIdx + 300);
    expect(fcBlock).toContain('--bg-surface');

    // Search input
    var siIdx = profilCss.indexOf('.brand-search-wrap input');
    var siBlock = profilCss.substring(siIdx, siIdx + 300);
    expect(siBlock).toContain('--bg-surface');

    // Segment pill
    var spIdx = profilCss.indexOf('.seg-pill{');
    var spBlock = profilCss.substring(spIdx, spIdx + 300);
    expect(spBlock).toContain('--bg-surface');
  });

  // 9. No primitive token leakage in color properties
  test('no primitive --text token in color declarations (use --text-primary)', function () {
    // Match color:var(--text) but NOT color:var(--text-primary) etc
    var matches = profilCss.match(/color:\s*var\(--text\)[;)]/g) || [];
    expect(matches.length).toBe(0);
  });

  // 10. Dark contrast: navy override exists for dark theme (tokens.css or profil.css)
  test('dark theme overrides --navy for sufficient contrast', function () {
    var allCss = profilCss + tokensCss;
    var darkBlock = allCss.substring(
      allCss.indexOf('html[data-theme="dark"]')
    );
    // Navy should be remapped to lighter value in dark theme
    expect(darkBlock).toContain('--navy:');
  });

  // 11. Deletion banner uses semantic tokens
  test('deletion warning banner uses danger tokens, not hardcoded colors', function () {
    var bannerArea = profilHtml.substring(
      profilHtml.indexOf('deletion-warning-banner'),
      profilHtml.indexOf('deletion-warning-banner') + 500
    );
    expect(bannerArea).toContain('--danger');
    // Fallback values inside var() are OK; raw hardcoded without var() is not
    var rawHardcoded = bannerArea.match(/background:#FEE2E2[^)]/g) || [];
    expect(rawHardcoded.length).toBe(0);
  });

  // 12. Brand follows popup uses token background
  test('brand-follows-popup uses var(--bg-surface)', function () {
    var popIdx = profilCss.indexOf('.brand-follows-popup{');
    var popBlock = profilCss.substring(popIdx, popIdx + 200);
    expect(popBlock).toContain('--bg-surface');
  });

  // Allowlist: logo wrap areas may legitimately use #fff
  // (brand logos need white background for visibility)
});
