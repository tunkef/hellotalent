/* K049 Faz 3 — Admin CSS hex purge structural guard.
 * css/admin/image-editor.css + css/admin/markalar.css raw hex'ten arındırılmış olmalı.
 * Faz 1 (K048) layout/panels, Faz 2 (K049) components/studio/wizard-editorial/duyurular,
 * Faz 3 admin sub-folder.
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

function findRawHex(src) {
  var stripped = stripFallbacks(src);
  var matches = stripped.match(/#[0-9A-Fa-f]{3,8}\b/g) || [];
  return matches.filter(function (h) {
    var low = h.toLowerCase();
    return low !== '#fff' && low !== '#ffffff' && low !== '#000' && low !== '#000000';
  });
}

var SCOPED = [
  'css/admin/image-editor.css',
  'css/admin/markalar.css',
];

test.describe('K049 Faz 3 — Hex purge (admin sub-folder)', function () {
  SCOPED.forEach(function (rel) {
    test(rel + ' has zero raw hex outside var() fallbacks', function () {
      var src = readCss(rel);
      var raw = findRawHex(src);
      expect(raw, rel + ' raw hex: ' + raw.slice(0, 8).join(',')).toEqual([]);
    });
  });

  test('tokens.css K049 Faz 3 additions present', function () {
    var tokens = readCss('css/tokens.css');
    [
      '--color-emerald-bright',
      '--color-red-warm',
      '--color-cream-warm',
      '--color-cream-soft',
      '--color-pattern-grid',
    ].forEach(function (tok) {
      expect(tokens, 'missing token: ' + tok).toContain(tok);
    });
  });

  test('admin/markalar.css uses semantic tokens (sample)', function () {
    var src = readCss('css/admin/markalar.css');
    expect(src).toMatch(/var\(--color-emerald-bright\)/);
    expect(src).toMatch(/var\(--color-red-warm\)/);
    expect(src).toMatch(/var\(--color-cream-warm\)/);
  });

  test('admin/image-editor.css uses brand tokens (sample, TF5 revize)', function () {
    var src = readCss('css/admin/image-editor.css');
    // TF5 revize — semantic tokens (not raw palette refs)
    expect(src).toMatch(/var\(--accent\)/);
    expect(src).toMatch(/var\(--bg-surface\)/);
    expect(src).toMatch(/var\(--color-pattern-grid/);
    expect(src).toMatch(/var\(--editorial-card\)/);
  });
});
