/* K049 Faz 2 — Inline style migration structural guard.
 * profil.html cosmetic inlines (non-display:none) migrated to utility classes.
 * display:none inlines intentionally preserved (JS toggle dependency).
 */
var test = require('@playwright/test').test;
var expect = require('@playwright/test').expect;
var fs = require('fs');
var path = require('path');

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

test.describe('K049 — Inline style migration Faz 2 (profil.html)', function () {
  test('components.css has K049 Faz 2 utility classes', function () {
    var comps = read('css/components.css');
    [
      '.ht-helper-text-xs{',
      '.ht-helper-text-xs-mt-neg{',
      '.ht-helper-text-sm{',
      '.ht-helper-text-md{',
      '.ht-helper-text-md-wrap{',
      '.ht-helper-text-base{',
      '.ht-helper-text-base-mb{',
      '.ht-w-fit{',
      '.ht-link-inline{',
      '.ht-fw-600{',
      '.ht-caption-accent{',
      '.ht-upload-zone{',
      '.ht-file-input-overlay{',
    ].forEach(function (sel) {
      expect(comps, 'missing: ' + sel).toContain(sel);
    });
  });

  test('profil.html migrated cosmetic inlines to utility classes', function () {
    var html = read('profil.html');
    // Migrated elements now use classes
    expect(html).toContain('class="status-badge aktif ht-w-fit"');
    expect(html).toContain('class="modal-desc ht-helper-text-xs-mt-neg"');
    expect(html).toContain('class="ht-helper-text-sm">JPG veya PNG');
    expect(html).toContain('id="avatar-file-input" class="ht-file-input-overlay"');
    expect(html).toContain('class="ht-helper-text-base">Perakende kariyerindeki');
    expect(html).toContain('id="bio-char-count" class="ht-helper-text-xs"');
    expect(html).toContain('class="ht-caption-accent">(En az 1');
    expect(html).toContain('class="helper-text ht-helper-text-md">Kariyerinde');
    expect(html).toContain('class="helper-text ht-helper-text-md-wrap">Hedef rollerin');
    expect(html).toContain('id="wiz-cv-zone" class="ht-upload-zone"');
    expect(html).toContain('class="ht-helper-text-base-mb">PDF, DOC');
    expect(html).toContain('id="wiz-cv-filename" class="ht-fw-600"');
    expect(html).toContain('class="wiz-premium-soon ht-link-inline"');

    // Old inline forms purged
    expect(html).not.toContain('id="card-status-badge" style="width:fit-content;"');
    expect(html).not.toContain('id="bio-char-count" style="font-size:11px');
    expect(html).not.toContain('id="avatar-file-input" style="position:absolute');
    expect(html).not.toContain('id="wiz-cv-zone" style="border:2px dashed');
    expect(html).not.toContain('id="wiz-cv-filename" style="font-weight:600');
  });

  test('display:none inlines intentionally preserved (JS toggle dependency)', function () {
    var html = read('profil.html');
    var displayNoneCount = (html.match(/style="display:none(;)?"/g) || []).length;
    // Baseline: 32 at K048 handoff end. Drop only if safe (no JS toggle). Guard >= 20 to detect unwanted purge.
    expect(displayNoneCount, 'display:none inline count drifted: ' + displayNoneCount).toBeGreaterThanOrEqual(20);
  });

  test('profil.html total inline style count dropped vs K048 baseline (57 → <=45)', function () {
    var html = read('profil.html');
    var total = (html.match(/style="/g) || []).length;
    expect(total, 'profil.html style=" count: ' + total).toBeLessThanOrEqual(45);
  });
});
