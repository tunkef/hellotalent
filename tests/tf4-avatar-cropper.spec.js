/* TF4 — Avatar cropper modal structural guard.
 * Custom canvas-based cropper + brand-native CSS + handleAvatarUpload integration.
 */
var test = require('@playwright/test').test;
var expect = require('@playwright/test').expect;
var fs = require('fs');
var path = require('path');

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

test.describe('TF4 — Avatar cropper modal', function () {
  test('profil-avatar-cropper.js exposes window._htOpenAvatarCropper', function () {
    var src = read('profil-avatar-cropper.js');
    expect(src).toContain("window._htOpenAvatarCropper = open");
    // State machine: drag + pinch + zoom
    expect(src).toContain('dragStartX');
    expect(src).toContain('pinchStartDist');
    expect(src).toContain('OUTPUT_SIZE');
    expect(src).toContain('cropToBlob');
    // ARIA dialog semantic
    expect(src).toContain("modal.setAttribute('role', 'dialog')");
    expect(src).toContain("modal.setAttribute('aria-modal', 'true')");
    expect(src).toContain("modal.setAttribute('aria-labelledby'");
  });

  test('profil-avatar-cropper.js has strict mode', function () {
    var src = read('profil-avatar-cropper.js');
    var head = src.substring(0, 800);
    expect(head).toMatch(/(?:\/\*[\s\S]*?\*\/\s*)+['"]use strict['"];/);
  });

  test('css/avatar-cropper.css has brand-native styles + dark mode', function () {
    var css = read('css/avatar-cropper.css');
    expect(css).toContain('.avc-overlay');
    expect(css).toContain('.avc-modal');
    expect(css).toContain('.avc-stage');
    expect(css).toContain('.avc-mask');
    expect(css).toContain('.avc-zoom-slider');
    expect(css).toContain('.avc-actions');
    // Token-driven (no raw brand hex)
    expect(css).toContain('var(--bg-surface)');
    expect(css).toContain('var(--accent)');
    // Dark mode override
    expect(css).toContain("html[data-theme='dark'] .avc-modal");
    // Responsive
    expect(css).toMatch(/@media \(max-width: 480px\)/);
    // Reduced motion
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });

  test('profil.html includes avatar-cropper CSS and JS', function () {
    var html = read('profil.html');
    expect(html).toMatch(/link[^>]+href="css\/avatar-cropper\.css/);
    expect(html).toMatch(/script src="profil-avatar-cropper\.js/);
  });

  test('profil-ui.js handleAvatarUpload routes through cropper', function () {
    var src = read('profil-ui.js');
    expect(src).toContain('_htOpenAvatarCropper');
    expect(src).toContain('_uploadAvatarBlob');
    // Avatar size limit raised 2MB → 5MB (crop sonrasi cikti 512x512, buyuk input OK)
    expect(src).toMatch(/file\.size > 5 \* 1024 \* 1024/);
    // Cropper absent ise direct upload fallback
    expect(src).toMatch(/_uploadAvatarBlob\(file\)/);
    // Cropper var ise blob upload
    expect(src).toMatch(/_uploadAvatarBlob\(result\.blob\)/);
  });

  test('profil-ui.js _uploadAvatarBlob uses content-type aware upload', function () {
    var src = read('profil-ui.js');
    var fnBlock = src.match(/async function _uploadAvatarBlob[\s\S]*?^\}/m);
    expect(fnBlock).not.toBeNull();
    var body = fnBlock[0];
    expect(body).toContain('isJpeg');
    // upsert + contentType
    expect(body).toMatch(/upsert:\s*true,\s*contentType:/);
    // Signed URL for display
    expect(body).toContain('createSignedUrl');
    expect(body).toContain('setAvatarImage');
  });
});
