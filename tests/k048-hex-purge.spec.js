/* K048 — Hex purge structural guard.
 * layout.css + profil-extras.css + panel CSS'ler raw hex'ten arındırılmış olmalı.
 * İstisnalar: #fff / #FFFFFF / #000 (theme-invariant) + var(--X, #hex) fallback (K067 pattern).
 * tokens.css raw hex barındırır — kapsam dışı.
 */
var test = require('@playwright/test').test;
var expect = require('@playwright/test').expect;
var fs = require('fs');
var path = require('path');

function readCss(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

function stripFallbacks(src) {
  // var(--X, #hex) → var(--X) — fallback içindeki hex'i kaldırır
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
  'css/layout.css',
  'css/profil-extras.css',
  'css/panels/inbox.css',
  'css/panels/firsatlar.css',
  'css/panels/premium.css',
  'css/panels/sirketler.css',
  'css/panels/merkezi.css',
  'css/panels/genel-bakis.css',
  'css/panels/ayarlar.css',
  'css/panels/bildirimler.css',
  'css/panels/destek.css',
  'css/panels/kimbakti.css',
];

test.describe('K048 — Hex purge (layout + panels + profil-extras)', function () {
  SCOPED.forEach(function (rel) {
    test(rel + ' has zero raw hex outside var() fallbacks', function () {
      var src = readCss(rel);
      var raw = findRawHex(src);
      expect(raw, rel + ' raw hex: ' + raw.slice(0, 5).join(',')).toEqual([]);
    });
  });

  test('tokens.css K048 additions present', function () {
    var tokens = readCss('css/tokens.css');
    [
      '--color-red-deep',
      '--color-red-on-dark',
      '--color-red-bright',
      '--color-green-bright',
      '--color-green-tile-dark',
      '--color-sun',
      '--color-sun-bright',
      '--color-navy-sidebar-top',
      '--color-navy-sidebar-top-dark',
      '--color-navy-deeper',
      '--color-navy-deepest',
      '--color-muted-warm',
      '--color-vermillion-bright',
      '--color-vermillion-press',
      '--on-navy-text',
      '--on-navy-muted',
      '--on-navy-subtle',
      '--danger-deep',
      '--danger-border-soft',
      '--sidebar-grad-top',
      '--sidebar-grad-mid',
      '--sidebar-grad-bottom',
      '--toggle-on-strong',
      '--icon-sun',
      '--icon-sun-hover',
      '--green-tile',
    ].forEach(function (tok) {
      expect(tokens).toContain(tok);
    });
  });

  test('layout.css sidebar gradient uses tokens (not raw navy hex)', function () {
    var layout = readCss('css/layout.css');
    var sidebarBlock = layout.match(/\.sidebar\s*\{[^}]+\}/);
    expect(sidebarBlock).not.toBeNull();
    expect(sidebarBlock[0]).toMatch(/var\(--sidebar-grad-top\)/);
    expect(sidebarBlock[0]).toMatch(/var\(--sidebar-grad-bottom\)/);
  });

  test('profil.html: deletion banner + cmdk + modal-icon variants use classes (K048)', function () {
    var profilHtml = readCss('profil.html');
    // Deletion banner inline style purged to .ht-deletion-banner
    expect(profilHtml).toMatch(/id="deletion-warning-banner" class="ht-deletion-banner"/);
    // Cancel button uses class-based cursor/color
    expect(profilHtml).toContain('class="ht-deletion-banner__cancel-btn"');
    // Command palette uses class instead of inline
    expect(profilHtml).toContain('class="cmdk-modal"');
    expect(profilHtml).toContain('class="cmdk-modal-head"');
    expect(profilHtml).toContain('class="cmdk-input"');
    expect(profilHtml).toContain('class="cmdk-results"');
    // Modal-icon variants
    expect(profilHtml).toContain('modal-icon--danger');
    expect(profilHtml).toContain('modal-icon--verm');
    expect(profilHtml).toContain('modal-icon--navy');
    // Wizard leave button uses class modifier
    expect(profilHtml).toContain('ht-btn--danger-bg');
    // No raw inline background color remaining on these elements
    expect(profilHtml).not.toMatch(/deletion-warning-banner"[^>]*style="[^"]*background:var\(--danger-soft/);
    expect(profilHtml).not.toMatch(/id="cmdk-input"[^>]*style="[^"]*width:100%/);
  });

  test('profil-studio-coach.js uses strict mode (K048 new-module discipline)', function () {
    var fs = require('fs');
    var path = require('path');
    var src = fs.readFileSync(path.join(__dirname, '..', 'profil-studio-coach.js'), 'utf8');
    // Directive must be at top-level script scope (not inside a function).
    // Accept after header comment block.
    var head = src.substring(0, 3000);
    expect(head).toMatch(/^(?:\/\*[\s\S]*?\*\/\s*)?['"]use strict['"];/m);
  });

  test('components.css has K048 migration classes', function () {
    var comps = readCss('css/components.css');
    ['.ht-deletion-banner{',
     '.ht-deletion-banner__cancel-btn',
     '.cmdk-modal{',
     '.cmdk-modal-head',
     '.cmdk-input',
     '.cmdk-results',
     '.modal-icon--danger',
     '.modal-icon--verm',
     '.modal-icon--navy',
     '.ht-btn--danger-bg',
     '.ht-btn--full-w',
    ].forEach(function (sel) {
      expect(comps).toContain(sel);
    });
  });
});
