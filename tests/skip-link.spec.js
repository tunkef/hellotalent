/* Faz 1B — Skip link structural guard (WCAG 2.4.1) */
var test = require('@playwright/test').test;
var expect = require('@playwright/test').expect;
var fs = require('fs');
var path = require('path');
function readFromRepo(rel) { return fs.readFileSync(path.join(__dirname,'..',rel),'utf8'); }

test.describe('Faz 1B — Skip link', function () {
  test('profil.html: .ht-skip-link first focusable element after <body>', function () {
    var html = readFromRepo('profil.html');
    // Skip link anchor inside body, points to first panel
    expect(html).toMatch(/<body>[\s\S]{0,400}<a[^>]*class="ht-skip-link"[^>]*href="#panel-genel"[^>]*>İçeriğe atla<\/a>/);
  });

  test('components.css: .ht-skip-link hidden default + visible on focus', function () {
    var css = readFromRepo('css/components.css');
    expect(css).toContain('.ht-skip-link');
    // Off-screen by default
    expect(css).toMatch(/\.ht-skip-link\s*\{[\s\S]*?top:-40px/);
    // Visible on focus
    expect(css).toMatch(/\.ht-skip-link:focus\s*\{[\s\S]*?top:8px/);
  });

  test('shared.css: public-site skip link present for aday/isveren pages', function () {
    var css = readFromRepo('shared.css');
    expect(css).toContain('.ht-skip-link');
  });
});
