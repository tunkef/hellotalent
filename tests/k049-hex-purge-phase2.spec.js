/* K049 — Hex purge Faz 2 structural guard.
 * components.css + studio.css + wizard-editorial.css + duyurular.css raw hex'ten arındırılmış olmalı.
 * İstisnalar:
 *   - #fff / #FFFFFF / #000 (theme-invariant)
 *   - var(--X, #hex) fallback (K067 dark mode pattern)
 *   - tokens.css raw hex barındırır — kapsam dışı
 *   - wizard-editorial.css :root içindeki --wz-* primitive defs (local design system)
 */
var test = require('@playwright/test').test;
var expect = require('@playwright/test').expect;
var fs = require('fs');
var path = require('path');

function readCss(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

function stripFallbacks(src) {
  return src.replace(/var\([^)]+?,\s*#[0-9A-Fa-f]{3,8}\)/g, 'var(--x)');
}

function stripWzRoot(src) {
  // wizard-editorial.css :root { --wz-*: #hex; ... } kapsam dışı (local primitives)
  return src.replace(/:root\s*\{[^}]*\}/g, ':root{}');
}

function findRawHex(src) {
  var stripped = stripFallbacks(src);
  var matches = stripped.match(/#[0-9A-Fa-f]{3,8}\b/g) || [];
  return matches.filter(function (h) {
    var low = h.toLowerCase();
    return low !== '#fff' && low !== '#ffffff' && low !== '#000' && low !== '#000000';
  });
}

var SCOPED = [
  'css/components.css',
  'css/studio.css',
  'css/duyurular.css',
];

test.describe('K049 — Hex purge Faz 2 (components + studio + duyurular)', function () {
  SCOPED.forEach(function (rel) {
    test(rel + ' has zero raw hex outside var() fallbacks', function () {
      var src = readCss(rel);
      var raw = findRawHex(src);
      expect(raw, rel + ' raw hex: ' + raw.slice(0, 8).join(',')).toEqual([]);
    });
  });

  test('css/wizard-editorial.css has zero raw hex outside :root primitives + var() fallbacks', function () {
    var src = stripWzRoot(readCss('css/wizard-editorial.css'));
    var raw = findRawHex(src);
    expect(raw, 'wizard-editorial.css raw hex: ' + raw.slice(0, 8).join(',')).toEqual([]);
  });

  test('tokens.css K049 additions present', function () {
    var tokens = readCss('css/tokens.css');
    [
      // Vermillion expansion
      '--color-vermillion-deepest',
      '--color-vermillion-tint',
      // Success palette (distinct from --color-green emerald)
      '--color-success-strong',
      '--color-success-text-deep',
      '--color-success-tile',
      // Warning amber (distinct from --warning chestnut)
      '--color-warning-strong',
      // Red step (lighter than --color-red-on-dark)
      '--color-red-step',
      // Navy card-dark (carousel/preview dark bg)
      '--color-navy-card-dark',
      // Semantic tint tokens (rgba alpha for status backgrounds)
      '--rating-strong',
      '--rating-strong-tint',
      '--rating-growing',
      '--rating-growing-tint',
      '--success-tile-tint',
      '--danger-strong-tint',
      // Hero gradient end (vermillion deepest)
      '--hero-grad-verm-end',
    ].forEach(function (tok) {
      expect(tokens, 'missing token: ' + tok).toContain(tok);
    });
  });

  test('wizard-editorial.css --wz-* tokens reference globals (no raw brand hex outside :root)', function () {
    var src = readCss('css/wizard-editorial.css');
    // K049: --wz-vermillion etc. should reference var(--color-*) instead of literal hex
    expect(src).toMatch(/--wz-vermillion:\s*var\(/);
    expect(src).toMatch(/--wz-navy:\s*var\(/);
  });

  test('studio.css uses gradient + status tokens (sample assertions)', function () {
    var src = readCss('css/studio.css');
    // ig-role-card / ig-intro-hero / ig-landing-hero — navy gradient via tokens
    expect(src).toMatch(/var\(--sidebar-grad-top\)|var\(--color-navy-sidebar-top\)/);
    // st-hero — vermillion gradient via tokens
    expect(src).toMatch(/var\(--hero-grad-verm-end\)|var\(--color-vermillion-deepest\)/);
    // Status colors via semantic tokens
    expect(src).toMatch(/var\(--rating-strong\)|var\(--color-success-strong\)/);
    expect(src).toMatch(/var\(--rating-growing\)|var\(--color-warning-strong\)/);
  });

  test('duyurular.css dark carousel + preview-wrap use --color-navy-card-dark', function () {
    var src = readCss('css/duyurular.css');
    expect(src).toMatch(/var\(--color-navy-card-dark\)/);
  });
});
