/* Faz 1C — WCAG AA contrast token lock (K041) */
var test = require('@playwright/test').test;
var expect = require('@playwright/test').expect;
var fs = require('fs');
var path = require('path');
function readFromRepo(rel) { return fs.readFileSync(path.join(__dirname,'..',rel),'utf8'); }

// Relative luminance per WCAG 2.1
function relLum(hex) {
  var r = parseInt(hex.substr(1,2),16)/255;
  var g = parseInt(hex.substr(3,2),16)/255;
  var b = parseInt(hex.substr(5,2),16)/255;
  function ch(c){ return c<=0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4); }
  return 0.2126*ch(r) + 0.7152*ch(g) + 0.0722*ch(b);
}
function contrast(a,b) {
  var la = relLum(a), lb = relLum(b);
  var L1 = Math.max(la,lb), L2 = Math.min(la,lb);
  return (L1+0.05)/(L2+0.05);
}

test.describe('Faz 1C — WCAG AA contrast tokens', function () {
  var tokensCss;
  test.beforeAll(function () { tokensCss = readFromRepo('css/tokens.css'); });

  test('--color-muted hits AA 4.5:1 on cream bg', function () {
    var match = tokensCss.match(/--color-muted:\s*(#[0-9A-Fa-f]{6})/);
    expect(match).not.toBeNull();
    var mutedHex = match[1];
    // Cream bg anchor
    var ratio = contrast(mutedHex, '#F7F6F4');
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  test('legacy #6B7280 value not reintroduced without override', function () {
    // Guard against accidental rollback
    expect(tokensCss).not.toMatch(/--color-muted:\s*#6B7280\s*;/);
  });
});
