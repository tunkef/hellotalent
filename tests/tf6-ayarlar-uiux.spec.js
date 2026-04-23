/* TF6 — Ayarlar UI/UX revizyonu structural guard.
 * 1) Hero kart yuzeyinde (diger panel pattern)
 * 2) Card footer butonlari sag hizali
 * 3) Section tab switcher (TOC click → sadece aktif section gorunur)
 */
var test = require('@playwright/test').test;
var expect = require('@playwright/test').expect;
var fs = require('fs');
var path = require('path');

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

test.describe('TF6 — Ayarlar UI/UX revizyonu', function () {
  test('hero kart yuzeyinde (bg cream + border + radius) — TF6 r5 diger panel pattern', function () {
    var css = read('css/panels/ayarlar.css');
    var heroBlock = css.match(/#panel-ayarlar \.ayr-hero \{[\s\S]*?\}/);
    expect(heroBlock).not.toBeNull();
    var body = heroBlock[0];
    // Cream bg (sk-card + hesap info-card ile tutarli)
    expect(body).toContain('background: var(--editorial-bg)');
    expect(body).toMatch(/border:\s*1px solid var\(--editorial-hairline\)/);
    expect(body).toContain('border-radius');
  });

  test('card footer butonlari sag hizali (flex-end)', function () {
    var css = read('css/panels/ayarlar.css');
    var footBlock = css.match(/#panel-ayarlar \.ayr-card__foot \{[\s\S]*?\}/);
    expect(footBlock).not.toBeNull();
    var body = footBlock[0];
    expect(body).toMatch(/flex-direction:\s*row/);
    expect(body).toMatch(/justify-content:\s*flex-end/);
    // Mesaj sol, buton sag
    expect(css).toContain('#panel-ayarlar .ayr-card__foot .ayr-msg');
    expect(css).toContain('#panel-ayarlar .ayr-card__foot .ayr-btn');
  });

  test('section aria-hidden display:none rule', function () {
    var css = read('css/panels/ayarlar.css');
    expect(css).toMatch(/\.ayr-section\[aria-hidden="true"\]\s*\{\s*display:\s*none/);
  });

  test('profil-ayarlar.js has initSectionTabs (scroll-spy replaced)', function () {
    var src = read('profil-ayarlar.js');
    expect(src).toContain('initSectionTabs');
    // Scroll-spy removed
    expect(src).not.toContain('initScrollSpy();');
    // Tab semantic
    expect(src).toContain("setAttribute('aria-current', 'page')");
    expect(src).toContain("setAttribute('aria-hidden', 'true')");
    expect(src).toContain("setAttribute('aria-hidden', 'false')");
    // TOC role=tablist + tab role
    expect(src).toContain("setAttribute('role', 'tablist')");
    expect(src).toContain("setAttribute('role', 'tab')");
  });

  test('profil-ayarlar.js tab switcher deep-link + keyboard nav', function () {
    var src = read('profil-ayarlar.js');
    // URL hash sync
    expect(src).toContain("history.replaceState(null, '', '#'");
    expect(src).toContain('window.location.hash');
    // Keyboard: ArrowLeft / ArrowRight
    expect(src).toContain("'ArrowRight'");
    expect(src).toContain("'ArrowLeft'");
    expect(src).toContain('tabs[next].click()');
  });

  test('profil-ayarlar.js calls initSectionTabs on ready', function () {
    var src = read('profil-ayarlar.js');
    var onReadyBlock = src.match(/onReady\(function\s*\(\)\s*\{[\s\S]*?\}\);/);
    expect(onReadyBlock).not.toBeNull();
    expect(onReadyBlock[0]).toContain('initSectionTabs()');
    expect(onReadyBlock[0]).toContain('initThemeSegment()');
  });
});
