/* Faz 1D — Button polish: opacity hover ban + token-based hex (K041) */
var test = require('@playwright/test').test;
var expect = require('@playwright/test').expect;
var fs = require('fs');
var path = require('path');
function readFromRepo(rel) { return fs.readFileSync(path.join(__dirname,'..',rel),'utf8'); }

test.describe('Faz 1D — Button polish + hex purge', function () {
  test('components.css: .ht-btn--navy:hover uses var(--navy-deep), not opacity', function () {
    var css = readFromRepo('css/components.css');
    expect(css).toMatch(/\.ht-btn--navy:hover\s*\{[^}]*background:\s*var\(--navy-deep\)/);
    expect(css).not.toMatch(/\.ht-btn--navy:hover\s*\{[^}]*opacity\s*:/);
  });

  test('components.css: .ht-btn--danger:hover uses token, not #b91c1c', function () {
    var css = readFromRepo('css/components.css');
    expect(css).toMatch(/\.ht-btn--danger:hover\s*\{[^}]*background:\s*var\(--danger-hover\)/);
    expect(css).not.toMatch(/\.ht-btn--danger:hover\s*\{[^}]*#b91c1c/i);
  });

  test('tokens.css: --danger-hover + --color-red-dark declared', function () {
    var css = readFromRepo('css/tokens.css');
    expect(css).toContain('--danger-hover');
    expect(css).toContain('--color-red-dark');
  });

  test('profil.html: success modal svg uses currentColor, not #16a34a raw', function () {
    var html = readFromRepo('profil.html');
    var successBlock = html.match(/modal-icon-success[\s\S]{0,600}<\/svg>/);
    expect(successBlock).not.toBeNull();
    expect(successBlock[0]).not.toMatch(/stroke="#16a34a"/i);
    expect(successBlock[0]).toMatch(/stroke="currentColor"/);
  });

  test('profil-inbox.js: no raw #DC2626 in error messaging', function () {
    var js = readFromRepo('profil-inbox.js');
    expect(js).not.toMatch(/color\s*:\s*['"]?#DC2626/i);
  });

  test('profil.html: wiz-cv-uploaded svg uses var(--success), not #059669', function () {
    var html = readFromRepo('profil.html');
    expect(html).not.toMatch(/stroke="var\(--green,#059669\)"/);
  });
});
