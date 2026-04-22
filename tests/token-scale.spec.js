/* Faz 2A — K045 token scale expansion + brand violation purge */
var test = require('@playwright/test').test;
var expect = require('@playwright/test').expect;
var fs = require('fs');
var path = require('path');
function readFromRepo(rel) { return fs.readFileSync(path.join(__dirname,'..',rel),'utf8'); }

test.describe('Faz 2A — Token scale + brand purge', function () {
  var tokensCss, layoutCss;
  test.beforeAll(function () {
    tokensCss = readFromRepo('css/tokens.css');
    layoutCss = readFromRepo('css/layout.css');
  });

  test('tokens.css: display-* scale added', function () {
    expect(tokensCss).toContain('--text-display-xs');
    expect(tokensCss).toContain('--text-display-sm');
    expect(tokensCss).toContain('--text-display-md');
    expect(tokensCss).toContain('--text-display-lg');
  });

  test('tokens.css: radius scale expanded (xs/xl/pill)', function () {
    expect(tokensCss).toContain('--radius-xs');
    expect(tokensCss).toContain('--radius-xl');
    expect(tokensCss).toContain('--radius-pill');
  });

  test('layout.css: brand violation colors purged (sky-blue/indigo/mustard)', function () {
    // Theme toggle sky-blue gradient + indigo moon + mustard sun
    expect(layoutCss).not.toContain('#87CEEB');
    expect(layoutCss).not.toContain('#60B5E8');
    expect(layoutCss).not.toContain('#6366F1');
    expect(layoutCss).not.toContain('#E0E7FF');
    expect(layoutCss).not.toContain('#FCD34D');
    expect(layoutCss).not.toContain('#92400E');
    expect(layoutCss).not.toContain('#1a1a3e');
    expect(layoutCss).not.toContain('#2d2d6e');
    // Purple icon background
    expect(layoutCss).not.toContain('#7c3aed');
  });

  test('layout.css: theme-slider uses brand tokens', function () {
    var sliderBlock = layoutCss.match(/\.avd-theme-slider\s*\{[^}]*\}/);
    expect(sliderBlock).not.toBeNull();
    expect(sliderBlock[0]).toMatch(/var\(--bg-warm-k|--navy|--border-subtle/);
  });

  test('layout.css: .avd-sun uses vermillion accent', function () {
    var sunBlock = layoutCss.match(/\.avd-sun\s*\{[^}]*\}/);
    expect(sunBlock).not.toBeNull();
    expect(sunBlock[0]).toMatch(/var\(--accent|--verm/);
  });
});
