/* TF5 — Admin image editor UI revizyonu structural guard.
 * CSS token-driven rewrite + SVG icon replacement (unicode ⟲⟳↔↕× → SVG)
 * JS class compat korunur: Cropper.js base, functional unchanged.
 */
var test = require('@playwright/test').test;
var expect = require('@playwright/test').expect;
var fs = require('fs');
var path = require('path');

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

test.describe('TF5 — Admin image editor UI revizyonu', function () {
  test('image-editor.css uses semantic tokens + dark mode + responsive', function () {
    var css = read('css/admin/image-editor.css');
    // Token coverage
    expect(css).toContain('var(--bg-surface)');
    expect(css).toContain('var(--border-subtle)');
    expect(css).toContain('var(--text-primary)');
    expect(css).toContain('var(--accent)');
    expect(css).toContain('var(--accent-hover)');
    expect(css).toContain('var(--text-muted)');
    // Dark mode
    expect(css).toMatch(/html\[data-theme='dark'\]\s+\.hied-panel/);
    expect(css).toMatch(/html\[data-theme='dark'\]\s+\.hied-canvas-wrap/);
    // Responsive
    expect(css).toMatch(/@media \(max-width: 768px\)/);
    // Reduced motion
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });

  test('admin-image-editor.js uses SVG icons (no unicode brand-unsafe chars)', function () {
    var src = read('js/admin/admin-image-editor.js');
    expect(src).toContain('svgIcon');
    expect(src).toContain('ICON_PATHS');
    expect(src).toContain('createElementNS');
    expect(src).toContain('http://www.w3.org/2000/svg');
    // Unicode sembol cikarildi (⟲⟳↔↕×) — SVG ile replace
    expect(src).not.toMatch(/'⟲'/);
    expect(src).not.toMatch(/'⟳'/);
    expect(src).not.toMatch(/'↔'/);
    expect(src).not.toMatch(/'↕'/);
  });

  test('admin-image-editor.js buildModal still returns compat DOM refs', function () {
    var src = read('js/admin/admin-image-editor.js');
    // buildModal dom API hala ayni class isimlerini kullanmali (Cropper.js bag — bozma)
    var buildBlock = src.match(/function buildModal\(options\)[\s\S]*?return \{/);
    expect(buildBlock).not.toBeNull();
    var body = buildBlock[0];
    expect(body).toContain('hied-overlay');
    expect(body).toContain('hied-panel');
    expect(body).toContain('hied-panel__header');
    expect(body).toContain('hied-panel__close');
    expect(body).toContain('hied-tool-btn');
    expect(body).toContain('hied-slider');
    expect(body).toContain('hied-cancel');
    expect(body).toContain('hied-save');
    // ARIA dialog zaten var
    expect(body).toContain("setAttribute('role', 'dialog')");
    expect(body).toContain("setAttribute('aria-modal', 'true')");
  });

  test('admin-image-editor.js aria-labels Turkish (erişilebilirlik)', function () {
    var src = read('js/admin/admin-image-editor.js');
    expect(src).toContain("setAttribute('aria-label', '90 sola döndür')");
    expect(src).toContain("setAttribute('aria-label', '90 sağa döndür')");
    expect(src).toContain("setAttribute('aria-label', 'Yatay aynala')");
    expect(src).toContain("setAttribute('aria-label', 'Dikey aynala')");
    expect(src).toContain("setAttribute('aria-label', 'Kapat')");
  });
});
