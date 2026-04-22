/* Faz 2B — Toast refactor (K045) */
var test = require('@playwright/test').test;
var expect = require('@playwright/test').expect;
var fs = require('fs');
var path = require('path');
function readFromRepo(rel) { return fs.readFileSync(path.join(__dirname,'..',rel),'utf8'); }

test.describe('Faz 2B — Toast system refactor', function () {
  var uiJs, componentsCss;
  test.beforeAll(function () {
    uiJs = readFromRepo('profil-ui.js');
    componentsCss = readFromRepo('css/components.css');
  });

  test('showToast: 4 variants supported (success/error/warning/info)', function () {
    var fn = uiJs.match(/function showToast[\s\S]{0,2500}/);
    expect(fn).not.toBeNull();
    var body = fn[0];
    expect(body).toContain("'success'");
    expect(body).toContain("'error'");
    expect(body).toContain("'warning'");
    expect(body).toContain("'info'");
  });

  test('showToast: role=status + aria-live wired', function () {
    var fn = uiJs.match(/function showToast[\s\S]{0,2500}/);
    expect(fn[0]).toContain("'role'");
    expect(fn[0]).toContain('aria-live');
    // Errors use assertive, info polite
    expect(fn[0]).toMatch(/assertive/);
    expect(fn[0]).toMatch(/polite/);
  });

  test('showToast: manual close button + optional action', function () {
    var fn = uiJs.match(/function showToast[\s\S]{0,2500}/);
    expect(fn[0]).toContain('ht-toast__close');
    expect(fn[0]).toContain('ht-toast__action');
    expect(fn[0]).toContain('onAction');
  });

  test('showToast: container helper with aria-label', function () {
    expect(uiJs).toContain('_htEnsureToastContainer');
    expect(uiJs).toContain('ht-toast-container');
    expect(uiJs).toMatch(/setAttribute\(\s*['"]aria-label['"]/);
  });

  test('components.css: .ht-toast-container stack layout', function () {
    expect(componentsCss).toContain('.ht-toast-container');
    expect(componentsCss).toMatch(/\.ht-toast-container\s*\{[\s\S]*?position:fixed/);
    expect(componentsCss).toMatch(/\.ht-toast-container\s*\{[\s\S]*?bottom:24px/);
  });

  test('components.css: 4 variant styles wired', function () {
    expect(componentsCss).toMatch(/\.ht-toast--success\s*\{/);
    expect(componentsCss).toMatch(/\.ht-toast--error\s*\{/);
    expect(componentsCss).toMatch(/\.ht-toast--warning\s*\{/);
    expect(componentsCss).toMatch(/\.ht-toast--info\s*\{/);
  });

  test('components.css: slide-in + slide-out animations + focus ring', function () {
    expect(componentsCss).toContain('htToastSlideIn');
    expect(componentsCss).toContain('htToastSlideOut');
    expect(componentsCss).toMatch(/\.ht-toast__close:focus-visible/);
    expect(componentsCss).toMatch(/\.ht-toast__action:focus-visible/);
  });

  test('showToast exposed to window (backward compat)', function () {
    expect(uiJs).toContain('window.showToast = showToast');
  });
});
