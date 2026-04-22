/* Faz 1E — Error state UX (K041) */
var test = require('@playwright/test').test;
var expect = require('@playwright/test').expect;
var fs = require('fs');
var path = require('path');
function readFromRepo(rel) { return fs.readFileSync(path.join(__dirname,'..',rel),'utf8'); }

test.describe('Faz 1E — Error state UX', function () {
  test('profil-ui.js: _htBuildErrorBanner helper exposed', function () {
    var js = readFromRepo('profil-ui.js');
    expect(js).toContain('_htBuildErrorBanner');
    expect(js).toContain('window._htBuildErrorBanner');
    // role="alert" for screen readers — search within helper fn body
    var fnBody = js.match(/function _htBuildErrorBanner[\s\S]{0,1200}/);
    expect(fnBody).not.toBeNull();
    expect(fnBody[0]).toContain("'role'");
    expect(fnBody[0]).toContain("'alert'");
  });

  test('profil-ui.js: showToast tagged with role=status + aria-live', function () {
    var js = readFromRepo('profil-ui.js');
    var toastFn = js.match(/function showToast[\s\S]{0,700}/);
    expect(toastFn).not.toBeNull();
    expect(toastFn[0]).toContain("'role'");
    expect(toastFn[0]).toContain("'status'");
    expect(toastFn[0]).toContain('aria-live');
  });

  test('profil-firsatlar.js: dual fetch fail renders error banner (not silent empty)', function () {
    var js = readFromRepo('profil-firsatlar.js');
    // Both fetches failed → banner path exists
    expect(js).toMatch(/campaignRes\.error\s*&&\s*annRes\.error|bothFailed/);
    expect(js).toContain('_htBuildErrorBanner');
  });

  test('profil-inbox.js: delete/restore surface toast on error', function () {
    var js = readFromRepo('profil-inbox.js');
    // Previously silent console.error only — now user-facing toast (showToast
    // or local _toast wrapper, both call into window.showToast).
    var deleteFn = js.match(/async function softDeleteMessage[\s\S]{0,700}/);
    expect(deleteFn).not.toBeNull();
    expect(deleteFn[0]).toMatch(/_toast\s*\(|showToast\s*\(/);
    var restoreFn = js.match(/async function restoreMessage[\s\S]{0,700}/);
    expect(restoreFn).not.toBeNull();
    expect(restoreFn[0]).toMatch(/_toast\s*\(|showToast\s*\(/);
  });

  test('profil-wizard.js: showStepErrors sets role=alert + scrollIntoView', function () {
    var js = readFromRepo('profil-wizard.js');
    var fn = js.match(/function showStepErrors[\s\S]{0,900}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/setAttribute\(\s*['"]role['"]\s*,\s*['"]alert['"]\s*\)/);
    expect(fn[0]).toMatch(/scrollIntoView/);
  });

  test('components.css: .ht-error-banner style wired', function () {
    var css = readFromRepo('css/components.css');
    expect(css).toContain('.ht-error-banner');
    // Retry button variant
    expect(css).toMatch(/\.ht-error-banner__retry/);
  });
});
